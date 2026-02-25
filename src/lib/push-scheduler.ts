/**
 * push-scheduler.ts  —  Server-side Web Push scheduler
 *
 * Keeps push subscriptions and scheduled timers in memory.
 * When a rest period starts, the session page POSTs to /api/push/schedule.
 * This module fires the push at exactly the right time via Apple APNs,
 * completely bypassing iOS Safari's background JS limitations.
 *
 * FIX: web-push 3.x defaults to 12-hour JWT expiry, but Apple APNs requires
 * ≤ 1 hour ("BadJwtToken" 403 otherwise). We monkey-patch getVapidHeaders
 * to always use a 1-hour expiry.
 */

import webpush from 'web-push'

// Patch web-push's internal vapid-helper to use 1-hour JWT expiry.
// Apple APNs rejects tokens with exp > 3600 s from now with 403 BadJwtToken.
// web-push 3.x hardcodes DEFAULT_EXPIRATION_SECONDS = 12 * 60 * 60 and
// sendNotification() never passes a custom expiration to getVapidHeaders().
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vapidHelper = require('web-push/src/vapid-helper')
const _origGetVapidHeaders = vapidHelper.getVapidHeaders as (...args: unknown[]) => unknown
vapidHelper.getVapidHeaders = function(...args: unknown[]) {
    // Force the expiration (6th arg) to 1 hour from now, overriding the default 12h
    args[5] = Math.floor(Date.now() / 1000) + 3600
    return _origGetVapidHeaders(...args)
}

// In-memory stores (survive as long as the Docker container is running)
const subscriptions = new Map<string, webpush.PushSubscription>() // userId → subscription
const timers       = new Map<string, ReturnType<typeof setTimeout>>() // userId → timer

let vapidConfigured = false

/** Configure VAPID lazily — env vars are only available at runtime, not build time */
function ensureVapid() {
    if (vapidConfigured) return
    const pub = process.env.VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    if (!pub || !priv) throw new Error('VAPID keys not set in environment')
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL ?? 'mailto:admin@gymbuddy.local',
        pub,
        priv,
    )
    vapidConfigured = true
}

/** Save (or update) a push subscription for a user */
export function savePushSubscription(userId: string, sub: webpush.PushSubscription) {
    subscriptions.set(userId, sub)
}

/** Schedule a push notification to fire at an absolute timestamp (ms) */
export function schedulePush(
    userId: string,
    endTime: number,
    title: string,
    body: string,
) {
    cancelPush(userId) // cancel any existing timer for this user

    const delay = Math.max(0, endTime - Date.now())

    const timer = setTimeout(async () => {
        timers.delete(userId)
        const sub = subscriptions.get(userId)
        if (!sub) {
            console.warn(`[push] No subscription for user ${userId} — skipping`)
            return
        }
        try {
            ensureVapid()
            console.log(`[push] Sending notification to user ${userId}`)
            const result = await webpush.sendNotification(
                sub,
                JSON.stringify({ title, body, tag: 'rest-end' }),
            )
            console.log(`[push] Sent OK — status ${result.statusCode}`)
            if (result.statusCode === 410) subscriptions.delete(userId)
        } catch (err: unknown) {
            console.error(`[push] send failed for user ${userId}:`, err)
            if (typeof err === 'object' && err !== null && 'statusCode' in err &&
                (err as { statusCode: number }).statusCode === 410) {
                subscriptions.delete(userId)
            }
        }
    }, delay)

    timers.set(userId, timer)
}

/** Cancel a pending push (user skipped rest or dismissed alarm) */
export function cancelPush(userId: string) {
    const t = timers.get(userId)
    if (t) { clearTimeout(t); timers.delete(userId) }
}

/** Send a push notification immediately and return result for debugging */
export async function sendPushNow(
    userId: string,
    title: string,
    body: string,
): Promise<{ ok: boolean; status?: number; error?: string; hasSubscription: boolean }> {
    const sub = subscriptions.get(userId)
    if (!sub) {
        return { ok: false, error: 'No subscription stored for this user. Click "訂閱推播通知" first.', hasSubscription: false }
    }
    try {
        ensureVapid()
        const result = await webpush.sendNotification(
            sub,
            JSON.stringify({ title, body, tag: 'rest-end' }),
        )
        console.log(`[push] sendPushNow OK — status ${result.statusCode}`)
        return { ok: true, status: result.statusCode, hasSubscription: true }
    } catch (err: unknown) {
        const statusCode = (typeof err === 'object' && err !== null && 'statusCode' in err)
            ? (err as { statusCode: number }).statusCode
            : undefined
        const message = (typeof err === 'object' && err !== null && 'message' in err)
            ? String((err as { message: unknown }).message)
            : String(err)
        console.error(`[push] sendPushNow failed for user ${userId}:`, err)
        if (statusCode === 410) subscriptions.delete(userId)
        return { ok: false, status: statusCode, error: message, hasSubscription: true }
    }
}
