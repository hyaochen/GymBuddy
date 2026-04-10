/**
 * push-scheduler.ts  —  Server-side Web Push scheduler
 *
 * Push subscriptions are persisted in the database (PushSubscription table).
 * Scheduled timers remain in-memory (rest timers are typically < 5 minutes,
 * losing them on restart is acceptable).
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
import prisma from '@/lib/prisma'

// In-memory timer store (rest timers only — acceptable to lose on restart)
const timers = new Map<string, ReturnType<typeof setTimeout>>()

// ─── Push event log (queryable via /api/push/log) ────────────────────────────
interface PushLogEntry { ts: string; event: string; userId: string; detail?: string }
const pushLog: PushLogEntry[] = []
const MAX_PUSH_LOG = 200

function addPushLog(event: string, userId: string, detail?: string) {
    const entry = { ts: new Date().toISOString(), event, userId, detail }
    pushLog.push(entry)
    if (pushLog.length > MAX_PUSH_LOG) pushLog.shift()
}

export function getPushLog(): PushLogEntry[] {
    return [...pushLog]
}

let vapidConfigured = false

function ensureVapid() {
    if (vapidConfigured) return
    const pub  = process.env.VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    if (!pub || !priv) throw new Error('VAPID keys not set in environment')
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

let _vapidHelper: VapidHelperModule | null = null
function getVapidHelper(): VapidHelperModule {
    if (_vapidHelper) return _vapidHelper
    const nativeRequire = createRequire(process.cwd() + '/dummy.js')
    _vapidHelper = nativeRequire('web-push/src/vapid-helper') as VapidHelperModule
    return _vapidHelper
}

function buildOneHourAuthHeader(
    audience: string, subject: string, publicKey: string, privateKey: string,
): string {
    const expiration = Math.floor(Date.now() / 1000) + 3600
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

    const details = webpush.generateRequestDetails(sub, payload, {
        vapidDetails: { subject, publicKey: pub, privateKey: priv },
    }) as { endpoint: string; headers: Record<string, string>; body: Buffer | null }

    const endpointUrl = new URL(details.endpoint)
    const audience    = `${endpointUrl.protocol}//${endpointUrl.host}`
    const authorization = buildOneHourAuthHeader(audience, subject, pub, priv)

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

// ─── DB helpers ──────────────────────────────────────────────────────────────

function toWebPushSub(row: { endpoint: string; p256dh: string; auth: string }): webpush.PushSubscription {
    return { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function savePushSubscription(userId: string, sub: webpush.PushSubscription) {
    await prisma.pushSubscription.upsert({
        where: { userId },
        update: {
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
            updatedAt: new Date(),
        },
        create: {
            userId,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
        },
    })
}

export async function getSubscriptionForUser(userId: string): Promise<webpush.PushSubscription | null> {
    const row = await prisma.pushSubscription.findUnique({ where: { userId } })
    return row ? toWebPushSub(row) : null
}

export async function removePushSubscription(userId: string) {
    await prisma.pushSubscription.deleteMany({ where: { userId } })
}

/** Get subscriptions for multiple users (for social notifications) */
export async function getSubscriptionsForUsers(userIds: string[]): Promise<Map<string, webpush.PushSubscription>> {
    if (userIds.length === 0) return new Map()
    const rows = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } },
    })
    const map = new Map<string, webpush.PushSubscription>()
    for (const row of rows) {
        map.set(row.userId, toWebPushSub(row))
    }
    return map
}

export function schedulePush(userId: string, endTime: number, title: string, body: string) {
    cancelPush(userId)
    const delay = Math.max(0, endTime - Date.now())
    const scheduledAt = new Date().toISOString()
    const expectedFireAt = new Date(endTime).toISOString()
    addPushLog('SCHEDULED', userId, `delay=${Math.round(delay/1000)}s fire=${expectedFireAt}`)
    console.log(`[push] 📋 Scheduled — user=${userId} delay=${Math.round(delay/1000)}s scheduledAt=${scheduledAt} expectedFireAt=${expectedFireAt}`)
    const timer = setTimeout(async () => {
        const actualFireAt = new Date().toISOString()
        const drift = Date.now() - endTime
        addPushLog('TIMER_FIRED', userId, `drift=${drift}ms actual=${actualFireAt}`)
        console.log(`[push] ⏰ Timer fired — user=${userId} actualFireAt=${actualFireAt} drift=${drift}ms (scheduled ${scheduledAt})`)
        timers.delete(userId)
        const sub = await getSubscriptionForUser(userId)
        if (!sub) { addPushLog('NO_SUBSCRIPTION', userId); console.warn(`[push] ❌ No subscription for user ${userId}`); return }
        await sendWithRetry(sub, userId, title, body)
    }, delay)
    timers.set(userId, timer)
}

export function cancelPush(userId: string) {
    const t = timers.get(userId)
    if (t) { clearTimeout(t); timers.delete(userId) }
}

async function sendWithRetry(sub: webpush.PushSubscription, userId: string, title: string, body: string) {
    try {
        console.log(`[push] 📤 Sending push to user ${userId}`)
        let result = await sendNotificationWithOneHourJwt(
            sub, JSON.stringify({ title, body, tag: 'rest-end' }),
        )
        let ok = result.statusCode >= 200 && result.statusCode < 300

        if (!ok && result.statusCode !== 410 && result.statusCode >= 500) {
            addPushLog('PUSH_RETRY', userId, `status=${result.statusCode}, retrying in 5s`)
            await new Promise(resolve => setTimeout(resolve, 5000))
            result = await sendNotificationWithOneHourJwt(
                sub, JSON.stringify({ title, body, tag: 'rest-end' }),
            )
            ok = result.statusCode >= 200 && result.statusCode < 300
        }

        const status = ok ? '✅' : '❌'
        addPushLog(ok ? 'PUSH_SENT_OK' : 'PUSH_SENT_FAIL', userId, `status=${result.statusCode} body=${result.body}`)
        console.log(`[push] ${status} Sent — status=${result.statusCode} body=${result.body} user=${userId}`)
        if (result.statusCode === 410) {
            await removePushSubscription(userId)
            addPushLog('SUBSCRIPTION_REMOVED', userId, 'Expired (410 Gone)')
        }
    } catch (err) {
        addPushLog('PUSH_ERROR', userId, String(err))
        console.error(`[push] ❌ Error for user ${userId}:`, err)
        try {
            await new Promise(resolve => setTimeout(resolve, 5000))
            addPushLog('PUSH_RETRY_NETWORK', userId, 'Retrying after network error')
            const retryResult = await sendNotificationWithOneHourJwt(
                sub, JSON.stringify({ title, body, tag: 'rest-end' }),
            )
            const retryOk = retryResult.statusCode >= 200 && retryResult.statusCode < 300
            addPushLog(retryOk ? 'PUSH_RETRY_OK' : 'PUSH_RETRY_FAIL', userId, `status=${retryResult.statusCode}`)
            if (retryResult.statusCode === 410) {
                await removePushSubscription(userId)
                addPushLog('SUBSCRIPTION_REMOVED', userId, 'Expired (410 Gone)')
            }
        } catch (retryErr) {
            addPushLog('PUSH_RETRY_ERROR', userId, String(retryErr))
            console.error(`[push] ❌ Retry also failed for user ${userId}:`, retryErr)
        }
    }
}

export async function sendPushNow(
    userId: string, title: string, body: string, tag = 'rest-end',
): Promise<{ ok: boolean; status?: number; error?: string; hasSubscription: boolean }> {
    const sub = await getSubscriptionForUser(userId)
    if (!sub) {
        return { ok: false, error: 'No subscription stored for this user. Click "訂閱推播通知" first.', hasSubscription: false }
    }
    try {
        const result = await sendNotificationWithOneHourJwt(
            sub, JSON.stringify({ title, body, tag }),
        )
        console.log(`[push] sendPushNow — status ${result.statusCode} body: ${result.body}`)
        const ok = result.statusCode >= 200 && result.statusCode < 300
        if (result.statusCode === 410) await removePushSubscription(userId)
        return { ok, status: result.statusCode, hasSubscription: true, error: ok ? undefined : result.body }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[push] sendPushNow failed for user ${userId}:`, err)
        return { ok: false, error: msg, hasSubscription: true }
    }
}

/** Send push to multiple users (for social notifications). Fire-and-forget, logs errors. */
export async function sendPushToMany(
    userIds: string[], title: string, body: string, tag = 'social',
) {
    const subs = await getSubscriptionsForUsers(userIds)
    const promises = Array.from(subs.entries()).map(async ([uid, sub]) => {
        try {
            const result = await sendNotificationWithOneHourJwt(
                sub, JSON.stringify({ title, body, tag }),
            )
            if (result.statusCode === 410) await removePushSubscription(uid)
            addPushLog(result.statusCode < 300 ? 'SOCIAL_PUSH_OK' : 'SOCIAL_PUSH_FAIL', uid, `status=${result.statusCode}`)
        } catch (err) {
            addPushLog('SOCIAL_PUSH_ERROR', uid, String(err))
        }
    })
    await Promise.allSettled(promises)
}
