'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker and syncs the push subscription to the server
 * on every app load. This ensures the DB always has a fresh subscription,
 * even after container restarts or subscription rotation by the browser.
 */

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

const OLD_ENDPOINT_KEY = 'oldPushEndpoint'

async function ensurePushSubscription(
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

export default function PushSubscriber() {
    useEffect(() => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) return

        navigator.serviceWorker.register('/sw.js').then(async reg => {
            try {
                await ensurePushSubscription(reg, vapidKey)
            } catch (e) {
                console.error('[PushSubscriber] subscription failed:', e)
            }
        }).catch(err => {
            console.warn('[PushSubscriber] serviceWorker.register failed:', err)
        })
    }, [])

    // Resync the push subscription whenever the app comes back into the foreground.
    // The browser may have rotated the endpoint silently while the tab was hidden;
    // pairing this with the sw.js `pushsubscriptionchange` handler ensures the server
    // ends up with a working subscription even if the SW-side resubscribe was skipped
    // (iOS Safari does not surface `applicationServerKey` in `event.oldSubscription`).
    useEffect(() => {
        if (typeof document === 'undefined') return
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

        const onVisible = async () => {
            if (document.visibilityState !== 'visible') return
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) return
            try {
                const reg = await navigator.serviceWorker.getRegistration()
                if (!reg) return
                await ensurePushSubscription(reg, vapidKey)
            } catch (err) {
                console.warn('[PushSubscriber] visibility resync failed:', err)
            }
        }

        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [])

    return null
}
