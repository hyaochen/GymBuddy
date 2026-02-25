/**
 * push-scheduler.ts  —  Server-side Web Push scheduler
 *
 * Keeps push subscriptions and scheduled timers in memory.
 * When a rest period starts, the session page POSTs to /api/push/schedule.
 * This module fires the push at exactly the right time via Apple APNs,
 * completely bypassing iOS Safari's background JS limitations.
 */

import webpush from 'web-push'

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
        if (!sub) return
        try {
            ensureVapid()
            await webpush.sendNotification(
                sub,
                JSON.stringify({ title, body, tag: 'rest-end' }),
            )
        } catch (err: unknown) {
            // 410 Gone = subscription expired / user unsubscribed → remove it
            if (typeof err === 'object' && err !== null && 'statusCode' in err && (err as {statusCode: number}).statusCode === 410) {
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
