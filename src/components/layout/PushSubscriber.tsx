'use client'

import { useEffect } from 'react'
import { ensurePushSubscription } from '@/lib/push-client'

/**
 * Registers the service worker and syncs the push subscription to the server
 * on every app load. This ensures the DB always has a fresh subscription,
 * even after container restarts or subscription rotation by the browser.
 */

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
