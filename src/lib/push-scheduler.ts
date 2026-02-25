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
 * We use generateRequestDetails() for payload encryption, then replace the
 * Authorization header with our own 1-hour JWT before sending.
 */

import crypto from 'crypto'
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

// ─── Custom 1-hour VAPID JWT (Apple requires exp ≤ now + 3600) ──────────────

function urlB64ToBuffer(s: string): Buffer {
    return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function derSigToRawRS(derSig: Buffer): Buffer {
    // Parse DER ECDSA signature SEQUENCE { INTEGER r, INTEGER s }
    let pos = 1
    if (derSig[pos] & 0x80) pos += (derSig[pos] & 0x7f) + 1
    else pos += 1
    pos += 1  // skip 0x02 (INTEGER tag)
    const rLen = derSig[pos++]
    const r = derSig.slice(pos, pos + rLen); pos += rLen
    pos += 1  // skip 0x02
    const sLen = derSig[pos++]
    const s = derSig.slice(pos, pos + sLen)
    // Trim leading zeros, then left-pad to 32 bytes
    const rFinal = Buffer.concat([Buffer.alloc(Math.max(0, 32 - r.length)), r]).slice(-32)
    const sFinal = Buffer.concat([Buffer.alloc(Math.max(0, 32 - s.length)), s]).slice(-32)
    return Buffer.concat([rFinal, sFinal])
}

function createVapidJwt(audience: string, subject: string, publicKey: string, privateKey: string): string {
    const header  = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 3600,  // 1 hour
        sub: subject,
    })).toString('base64url')
    const message = `${header}.${payload}`

    const privBuf = urlB64ToBuffer(privateKey)
    const pubBuf  = urlB64ToBuffer(publicKey)

    // Build SEC1-DER private key (same byte structure as web-push uses internally)
    const derKey = Buffer.concat([
        Buffer.from('30770201010420', 'hex'),
        privBuf,
        Buffer.from('a00a06082a8648ce3d030107a144034200', 'hex'),
        pubBuf,
    ])
    const signer = crypto.createSign('SHA256')
    signer.update(message)
    const derSig = signer.sign({ key: derKey, format: 'der', type: 'sec1' })
    const sig = derSigToRawRS(derSig).toString('base64url')
    return `${message}.${sig}`
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

    // Replace web-push's 12-hour JWT with our own 1-hour JWT
    const endpointUrl = new URL(details.endpoint)
    const audience    = `${endpointUrl.protocol}//${endpointUrl.host}`
    const jwt         = createVapidJwt(audience, subject, pub, priv)
    details.headers['Authorization'] = `vapid t=${jwt},k=${pub}`

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
