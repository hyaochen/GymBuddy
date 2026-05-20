/**
 * push-scheduler.ts  —  Server-side Web Push scheduler
 *
 * Push subscriptions are persisted in the database (PushSubscription table).
 * Scheduled timers are persisted in PushJob and mirrored in-memory for short
 * rest timers. PushJob's (userId, tag) unique key provides idempotency.
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

// In-memory timer store for active rest timers. The DB is the source of truth.
const timers = new Map<string, ReturnType<typeof setTimeout>>()

const PUSH_JOB_STATUS = {
    PENDING: 'PENDING',
    SENDING: 'SENDING',
    SENT: 'SENT',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
} as const

function pushTimerKey(userId: string, tag: string) {
    return `${userId}:${tag}`
}

function clearLocalTimers(userId: string, tag?: string) {
    if (tag) {
        const key = pushTimerKey(userId, tag)
        const timer = timers.get(key)
        if (timer) clearTimeout(timer)
        timers.delete(key)
        return
    }

    for (const [key, timer] of timers.entries()) {
        if (key.startsWith(`${userId}:`)) {
            clearTimeout(timer)
            timers.delete(key)
        }
    }
}

// ─── Push event log (queryable via /api/push/log) ────────────────────────────
interface PushLogEntry { ts: string; event: string; userId: string; detail?: string }
const pushLog: PushLogEntry[] = []
const MAX_PUSH_LOG = 200

function addPushLog(event: string, userId: string, detail?: string) {
    const entry = { ts: new Date().toISOString(), event, userId, detail }
    pushLog.push(entry)
    if (pushLog.length > MAX_PUSH_LOG) pushLog.shift()
}

export function getPushLog(userId?: string): PushLogEntry[] {
    if (!userId) return [...pushLog]
    return pushLog.filter((entry) => entry.userId === userId)
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

// Keyed by endpoint (unique). Multiple devices per user each get their own row.
// Cap each user at PUSH_SUBSCRIPTION_CAP rows — enough for iPhone + iPad + spares.
// Backstop against iOS endpoint rotation when the client misses `oldEndpoint` hint
// (T-GB-004). Without this cap, owner accumulated 39 zombie rows in a month.
const PUSH_SUBSCRIPTION_CAP = 5

export async function savePushSubscription(userId: string, sub: webpush.PushSubscription) {
    await prisma.pushSubscription.upsert({
        where: { endpoint: sub.endpoint },
        update: {
            userId,
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

    const rows = await prisma.pushSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
    })
    if (rows.length > PUSH_SUBSCRIPTION_CAP) {
        const dropIds = rows.slice(PUSH_SUBSCRIPTION_CAP).map(r => r.id)
        await prisma.pushSubscription.deleteMany({ where: { id: { in: dropIds } } })
    }
}

// Returns ALL subscriptions for this user (one per device).
export async function getAllSubscriptionsForUser(userId: string): Promise<webpush.PushSubscription[]> {
    const rows = await prisma.pushSubscription.findMany({ where: { userId } })
    return rows.map(toWebPushSub)
}

// Legacy single-subscription accessor — returns first. Prefer getAllSubscriptionsForUser.
export async function getSubscriptionForUser(userId: string): Promise<webpush.PushSubscription | null> {
    const subs = await getAllSubscriptionsForUser(userId)
    return subs[0] ?? null
}

export async function removePushSubscription(userId: string, endpoint?: string) {
    if (endpoint) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint } })
    } else {
        await prisma.pushSubscription.deleteMany({ where: { userId } })
    }
}

/** Get all subscriptions for multiple users (for social notifications). One user may have multiple devices. */
export async function getSubscriptionsForUsers(userIds: string[]): Promise<Map<string, webpush.PushSubscription[]>> {
    if (userIds.length === 0) return new Map()
    const rows = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } },
    })
    const map = new Map<string, webpush.PushSubscription[]>()
    for (const row of rows) {
        const list = map.get(row.userId) ?? []
        list.push(toWebPushSub(row))
        map.set(row.userId, list)
    }
    return map
}

export async function schedulePush(
    userId: string,
    endTime: number,
    title: string,
    body: string,
    opts: { durationMs?: number; tag?: string } = {},
) {
    // Prefer server-local duration to avoid client/server clock drift.
    // Fall back to (endTime - Date.now()) if caller didn't supply duration.
    const delay = Math.max(0, opts.durationMs ?? (endTime - Date.now()))
    const serverEndTime = Date.now() + delay
    const tag = opts.tag ?? 'rest-end'
    const fireAt = new Date(serverEndTime)
    const scheduledAt = new Date().toISOString()
    const expectedFireAt = fireAt.toISOString()

    await cancelPush(userId)
    await prisma.pushJob.upsert({
        where: { userId_tag: { userId, tag } },
        update: {
            title,
            body,
            fireAt,
            status: PUSH_JOB_STATUS.PENDING,
            attempts: 0,
            sentAt: null,
        },
        create: {
            userId,
            tag,
            title,
            body,
            fireAt,
            status: PUSH_JOB_STATUS.PENDING,
        },
    })

    addPushLog('SCHEDULED', userId, `delay=${Math.round(delay/1000)}s fire=${expectedFireAt} tag=${tag}`)
    console.log(`[push] 📋 Scheduled — user=${userId} delay=${Math.round(delay/1000)}s scheduledAt=${scheduledAt} expectedFireAt=${expectedFireAt} tag=${tag}`)
    const timer = setTimeout(async () => {
        const actualFireAt = new Date().toISOString()
        const drift = Date.now() - serverEndTime
        addPushLog('TIMER_FIRED', userId, `drift=${drift}ms actual=${actualFireAt} tag=${tag}`)
        console.log(`[push] ⏰ Timer fired — user=${userId} actualFireAt=${actualFireAt} drift=${drift}ms (scheduled ${scheduledAt}) tag=${tag}`)
        timers.delete(pushTimerKey(userId, tag))
        await firePushJob(userId, tag)
    }, delay)
    timers.set(pushTimerKey(userId, tag), timer)
}

export async function cancelPush(userId: string, tag?: string) {
    clearLocalTimers(userId, tag)
    const result = await prisma.pushJob.updateMany({
        where: {
            userId,
            ...(tag ? { tag } : {}),
            status: PUSH_JOB_STATUS.PENDING,
        },
        data: { status: PUSH_JOB_STATUS.CANCELLED },
    })
    if (result.count > 0) {
        addPushLog('CANCELLED', userId, tag ? `tag=${tag}` : `count=${result.count}`)
    }
}

async function firePushJob(userId: string, tag: string) {
    const claim = await prisma.pushJob.updateMany({
        where: {
            userId,
            tag,
            status: PUSH_JOB_STATUS.PENDING,
            fireAt: { lte: new Date(Date.now() + 1000) },
        },
        data: {
            status: PUSH_JOB_STATUS.SENDING,
            attempts: { increment: 1 },
        },
    })

    if (claim.count === 0) {
        addPushLog('JOB_SKIPPED', userId, `not pending tag=${tag}`)
        return
    }

    const job = await prisma.pushJob.findUnique({ where: { userId_tag: { userId, tag } } })
    if (!job) return

    const subs = await getAllSubscriptionsForUser(userId)
    if (subs.length === 0) {
        addPushLog('NO_SUBSCRIPTION', userId, `tag=${tag}`)
        console.warn(`[push] ❌ No subscriptions for user ${userId}`)
        await prisma.pushJob.update({
            where: { id: job.id },
            data: { status: PUSH_JOB_STATUS.FAILED },
        })
        return
    }

    addPushLog('FAN_OUT', userId, `count=${subs.length} tag=${tag}`)
    const results = await Promise.allSettled(
        subs.map(sub => sendWithRetry(sub, userId, job.title, job.body, tag)),
    )
    const delivered = results.filter(r => r.status === 'fulfilled' && r.value).length

    await prisma.pushJob.update({
        where: { id: job.id },
        data: {
            status: delivered > 0 ? PUSH_JOB_STATUS.SENT : PUSH_JOB_STATUS.FAILED,
            sentAt: delivered > 0 ? new Date() : null,
        },
    })
}

async function sendWithRetry(sub: webpush.PushSubscription, userId: string, title: string, body: string, tag: string = 'rest-end'): Promise<boolean> {
    const payload = JSON.stringify({ title, body, tag })
    const endpointTail = sub.endpoint.slice(-24)
    try {
        console.log(`[push] 📤 Sending push to user ${userId} tag=${tag} endpoint=...${endpointTail}`)
        let result = await sendNotificationWithOneHourJwt(sub, payload)
        let ok = result.statusCode >= 200 && result.statusCode < 300

        if (!ok && result.statusCode !== 410 && result.statusCode >= 500) {
            addPushLog('PUSH_RETRY', userId, `status=${result.statusCode}, retrying in 5s endpoint=...${endpointTail}`)
            await new Promise(resolve => setTimeout(resolve, 5000))
            result = await sendNotificationWithOneHourJwt(sub, payload)
            ok = result.statusCode >= 200 && result.statusCode < 300
        }

        const status = ok ? '✅' : '❌'
        addPushLog(ok ? 'PUSH_SENT_OK' : 'PUSH_SENT_FAIL', userId, `status=${result.statusCode} body=${result.body} tag=${tag} endpoint=...${endpointTail}`)
        console.log(`[push] ${status} Sent — status=${result.statusCode} body=${result.body} user=${userId} tag=${tag} endpoint=...${endpointTail}`)
        if (result.statusCode === 410) {
            await removePushSubscription(userId, sub.endpoint)
            addPushLog('SUBSCRIPTION_REMOVED', userId, `Expired (410 Gone) endpoint=...${endpointTail}`)
        }
        if (ok) return true
    } catch (err) {
        addPushLog('PUSH_ERROR', userId, `${String(err)} endpoint=...${endpointTail}`)
        console.error(`[push] ❌ Error for user ${userId} endpoint=...${endpointTail}:`, err)
        try {
            await new Promise(resolve => setTimeout(resolve, 5000))
            addPushLog('PUSH_RETRY_NETWORK', userId, `Retrying after network error endpoint=...${endpointTail}`)
            const retryResult = await sendNotificationWithOneHourJwt(sub, payload)
            const retryOk = retryResult.statusCode >= 200 && retryResult.statusCode < 300
            addPushLog(retryOk ? 'PUSH_RETRY_OK' : 'PUSH_RETRY_FAIL', userId, `status=${retryResult.statusCode} endpoint=...${endpointTail}`)
            if (retryResult.statusCode === 410) {
                await removePushSubscription(userId, sub.endpoint)
                addPushLog('SUBSCRIPTION_REMOVED', userId, `Expired (410 Gone) endpoint=...${endpointTail}`)
            }
            return retryOk
        } catch (retryErr) {
            addPushLog('PUSH_RETRY_ERROR', userId, `${String(retryErr)} endpoint=...${endpointTail}`)
            console.error(`[push] ❌ Retry also failed for user ${userId} endpoint=...${endpointTail}:`, retryErr)
        }
    }

    return false
}

export async function sendPushNow(
    userId: string, title: string, body: string, tag = 'rest-end',
): Promise<{ ok: boolean; status?: number; error?: string; hasSubscription: boolean; deliveredTo?: number }> {
    const subs = await getAllSubscriptionsForUser(userId)
    if (subs.length === 0) {
        return { ok: false, error: 'No subscription stored for this user. Click "訂閱推播通知" first.', hasSubscription: false }
    }
    const payload = JSON.stringify({ title, body, tag })
    const results = await Promise.allSettled(
        subs.map(async sub => {
            const result = await sendNotificationWithOneHourJwt(sub, payload)
            console.log(`[push] sendPushNow — status ${result.statusCode} endpoint=...${sub.endpoint.slice(-24)}`)
            if (result.statusCode === 410) await removePushSubscription(userId, sub.endpoint)
            return result
        }),
    )
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.statusCode >= 200 && r.value.statusCode < 300).length
    const firstResult = results[0]
    if (firstResult.status === 'rejected') {
        const err = firstResult.reason
        const msg = err instanceof Error ? err.message : String(err)
        return { ok: false, error: msg, hasSubscription: true, deliveredTo: successful }
    }
    return {
        ok: successful > 0,
        status: firstResult.value.statusCode,
        hasSubscription: true,
        deliveredTo: successful,
        error: successful === 0 ? firstResult.value.body : undefined,
    }
}

/** Send push to multiple users (for social notifications). Fans out to ALL devices per user. Fire-and-forget, logs errors. */
export async function sendPushToMany(
    userIds: string[], title: string, body: string, tag = 'social',
) {
    const subsByUser = await getSubscriptionsForUsers(userIds)
    const payload = JSON.stringify({ title, body, tag })
    const promises: Promise<unknown>[] = []
    for (const [uid, subs] of subsByUser.entries()) {
        for (const sub of subs) {
            promises.push((async () => {
                try {
                    const result = await sendNotificationWithOneHourJwt(sub, payload)
                    if (result.statusCode === 410) await removePushSubscription(uid, sub.endpoint)
                    addPushLog(result.statusCode < 300 ? 'SOCIAL_PUSH_OK' : 'SOCIAL_PUSH_FAIL', uid, `status=${result.statusCode} endpoint=...${sub.endpoint.slice(-24)}`)
                } catch (err) {
                    addPushLog('SOCIAL_PUSH_ERROR', uid, `${String(err)} endpoint=...${sub.endpoint.slice(-24)}`)
                }
            })())
        }
    }
    await Promise.allSettled(promises)
}
