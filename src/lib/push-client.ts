'use client'

/**
 * Browser-side Web Push helpers shared by PushSubscriber and the workout page.
 */

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

const OLD_ENDPOINT_KEY = 'oldPushEndpoint'

/** Makes sure a push subscription exists for this device and the server knows it. */
export async function ensurePushSubscription(
    reg: ServiceWorkerRegistration,
    vapidKey: string,
) {
    let sub = await reg.pushManager.getSubscription()
    let oldEndpoint: string | null = null

    if (!sub) {
        // PushManager was cleared by the OS (iOS may drop the subscription after
        // long PWA inactivity, or sw.js's `pushsubscriptionchange` handler skipped
        // because `event.oldSubscription.options.applicationServerKey` was null).
        // Re-subscribe here using the VAPID key we have client-side, and pass the
        // previous endpoint along so the server can purge the dead row (T-GB-004).
        try {
            oldEndpoint = localStorage.getItem(OLD_ENDPOINT_KEY)
        } catch {
            oldEndpoint = null
        }
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
    }

    const body: { subscription: PushSubscriptionJSON; oldEndpoint?: string } = {
        subscription: sub.toJSON(),
    }
    if (oldEndpoint && oldEndpoint !== sub.endpoint) {
        body.oldEndpoint = oldEndpoint
    }

    await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

    try {
        localStorage.setItem(OLD_ENDPOINT_KEY, sub.endpoint)
    } catch {
        // localStorage unavailable (private mode, etc.) — fine, next rotation
        // just won't have an oldEndpoint hint and the server cap will catch it.
    }
}

/**
 * Asks for notification permission and, once granted, subscribes to Web Push
 * and registers the subscription with the server straight away.
 *
 * MUST be called from inside a user gesture handler (tap): iOS ignores
 * permission requests made from effects. `Notification.requestPermission()` is
 * invoked synchronously, before any `await`, so the gesture is still active.
 */
export async function requestPushPermissionAndSubscribe(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof Notification === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return 'unsupported'
    }
    const permissionPromise: Promise<NotificationPermission> =
        Notification.permission === 'default'
            ? Notification.requestPermission()
            : Promise.resolve(Notification.permission)
    const permission = await permissionPromise.catch(() => Notification.permission)
    if (permission !== 'granted') return permission

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return permission
    try {
        const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
        await ensurePushSubscription(reg, vapidKey)
    } catch (e) {
        console.error('[Push] subscription after permission grant failed:', e)
    }
    return permission
}
