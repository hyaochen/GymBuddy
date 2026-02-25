/**
 * push-scheduler.ts  —  Server-side Web Push scheduler
 *
 * Keeps push subscriptions and scheduled timers in memory.
 * When a rest period starts, the session page POSTs to /api/push/schedule.
 * This module fires the push at exactly the right time via Apple APNs,
 * completely bypassing iOS Safari's background JS limitations.
 *
 * VAPID FIX: web-push 3.x defaults to 12-hour JWT expiry. Apple APNs requires
 * ≤ 1 hour and returns 403 {"reason":"BadJwtToken"} otherwise.
 * We use createRequire to load web-push's vapid-helper.js at runtime and call
 * getVapidHeaders() directly with a 1-hour expiration, bypassing the default.
 */

import { createRequire } from 'module'
import https from 'https'
import { URL } from 'url'
import webpush from 'web-push'

// In-memory stores (survive as long as the Docker container is running)
const subscriptions = new Map<string, webpush.PushSubscription>()
const timers        = new Map<string, ReturnType<typeof setTimeout>>()

let vapidConfigured = false

function ensureVapid() {
    if (vapidConfigured) return
    const pub  = process.env.VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    if (!pub || !priv) throw new Error('VAPID keys not set in environment')
    // setVapidDetails is needed so generateRequestDetails can encrypt the payload
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL ?? 'mailto:admin@gymbuddy.local',
        pub, priv,
    )
    vapidConfigured = true
}

// ─── 1-hour VAPID JWT via web-push's own vapid-helper ────────────────────────

interface VapidHelperModule {
    getVapidHeaders(
        audience: string, subject: string, publicKey: string, privateKey: string,
        contentEncoding: string, expiration?: number,
    ): { Authorization: string }
}

// Load web-push's vapid-helper.js at runtime (not bundled) so we can call
// getVapidHeaders() with our own 1-hour expiration parameter.
let _vapidHelper: VapidHelperModule | null = null
function getVapidHelper(): VapidHelperModule {
    if (_vapidHelper) return _vapidHelper
    // createRequire lets us use Node.js's native module resolution regardless
    // of how Next.js has bundled our code
    const nativeRequire = createRequire(process.cwd() + '/dummy.js')
    _vapidHelper = nativeRequire('web-push/src/vapid-helper') as VapidHelperModule
    return _vapidHelper
}

function buildOneHourAuthHeader(
    audience: string, subject: string, publicKey: string, privateKey: string,
): string {
    const expiration = Math.floor(Date.now() / 1000) + 3600  // 1 hour — Apple requires ≤ 3600
    const { Authorization } = getVapidHelper().getVapidHeaders(
        audience, subject, publicKey, privateKey, 'aes128gcm', expiration,
    )
    return Authorization
}

// ─── Core send function ───────────────────────────────────────────────────────

async function sendNotificationWithOneHourJwt(
    sub: webpush.PushSubscription,
    payload: string,
): Promise<{ statusCode: number; body: string }> {
    ensureVapid()

    const pub     = process.env.VAPID_PUBLIC_KEY!
    const priv    = process.env.VAPID_PRIVATE_KEY!
    const subject = process.env.VAPID_EMAIL ?? 'mailto:admin@gymbuddy.local'

    // Use web-push for payload encryption (handles AES-128-GCM, key agreement, etc.)
    const details = webpush.generateRequestDetails(sub, payload, {
        vapidDetails: { subject, publicKey: pub, privateKey: priv },
    }) as { endpoint: string; headers: Record<string, string>; body: Buffer | null }

    // Replace web-push's 12-hour JWT with a 1-hour JWT using vapid-helper directly
    const endpointUrl = new URL(details.endpoint)
    const audience    = `${endpointUrl.protocol}//${endpointUrl.host}`
    const authorization = buildOneHourAuthHeader(audience, subject, pub, priv)

    // Remove any existing Authorization header (both capitalizations)
    delete details.headers['authorization']
    details.headers['Authorization'] = authorization
    console.log(`[push] Sending to ${details.endpoint} — auth: ${authorization.substring(0, 60)}...`)

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: endpointUrl.hostname,
            path:     endpointUrl.pathname + endpointUrl.search,
            method:   'POST',
            headers:  details.headers,
        }, (res) => {
            let body = ''
            res.on('data', (chunk: string) => { body += chunk })
            res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }))
        })
        req.on('error', reject)
        if (details.body) req.write(details.body)
        req.end()
    })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function savePushSubscription(userId: string, sub: webpush.PushSubscription) {
    subscriptions.set(userId, sub)
}

export function getSubscriptionForUser(userId: string): webpush.PushSubscription | undefined {
    return subscriptions.get(userId)
}

export function schedulePush(userId: string, endTime: number, title: string, body: string) {
    cancelPush(userId)
    const delay = Math.max(0, endTime - Date.now())
    const timer = setTimeout(async () => {
        timers.delete(userId)
        const sub = subscriptions.get(userId)
        if (!sub) { console.warn(`[push] No subscription for user ${userId}`); return }
        try {
            console.log(`[push] Sending to user ${userId}`)
            const result = await sendNotificationWithOneHourJwt(
                sub, JSON.stringify({ title, body, tag: 'rest-end' }),
            )
            console.log(`[push] Sent — status ${result.statusCode} body: ${result.body}`)
            if (result.statusCode === 410) subscriptions.delete(userId)
        } catch (err) {
            console.error(`[push] Error for user ${userId}:`, err)
        }
    }, delay)
    timers.set(userId, timer)
}

export function cancelPush(userId: string) {
    const t = timers.get(userId)
    if (t) { clearTimeout(t); timers.delete(userId) }
}

export async function sendPushNow(
    userId: string, title: string, body: string,
): Promise<{ ok: boolean; status?: number; error?: string; hasSubscription: boolean }> {
    const sub = subscriptions.get(userId)
    if (!sub) {
        return { ok: false, error: 'No subscription stored for this user. Click "訂閱推播通知" first.', hasSubscription: false }
    }
    try {
        const result = await sendNotificationWithOneHourJwt(
            sub, JSON.stringify({ title, body, tag: 'rest-end' }),
        )
        console.log(`[push] sendPushNow — status ${result.statusCode} body: ${result.body}`)
        const ok = result.statusCode >= 200 && result.statusCode < 300
        if (result.statusCode === 410) subscriptions.delete(userId)
        return { ok, status: result.statusCode, hasSubscription: true, error: ok ? undefined : result.body }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[push] sendPushNow failed for user ${userId}:`, err)
        return { ok: false, error: msg, hasSubscription: true }
    }
}
