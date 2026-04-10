'use client'

import { useEffect } from 'react'

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

        function urlBase64ToUint8Array(base64String: string) {
            const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
            const rawData = atob(base64)
            return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
        }

        navigator.serviceWorker.register('/sw.js').then(async reg => {
            try {
                const existing = await reg.pushManager.getSubscription()
                const sub = existing ?? await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey),
                })
                await fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscription: sub.toJSON() }),
                })
            } catch (e) {
                console.error('[PushSubscriber] subscription failed:', e)
            }
        }).catch(() => {})
    }, [])

    return null
}
