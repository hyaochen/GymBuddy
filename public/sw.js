// Service Worker for GymBuddy — handles background rest-end notifications
// Uses setInterval polling against an absolute endTime so the OS killing/restarting
// the SW mid-wait doesn't silently swallow the notification.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

let checkInterval = null
let scheduled = null   // { endTime: number, title: string, body: string }

function clearScheduled() {
    if (checkInterval) { clearInterval(checkInterval); checkInterval = null }
    scheduled = null
}

self.addEventListener('message', event => {
    if (!event.data) return

    if (event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { endTime, title, body } = event.data
        clearScheduled()
        scheduled = { endTime, title, body }

        // Poll every 1 s instead of a single setTimeout.
        // If the SW is suspended and restarted it re-receives this message
        // from the page on the next postMessage call, so no state is lost.
        checkInterval = setInterval(async () => {
            if (!scheduled) { clearInterval(checkInterval); checkInterval = null; return }
            if (Date.now() < scheduled.endTime) return

            // Time is up
            const { title: t, body: b } = scheduled
            clearScheduled()

            // Only show if no client window is currently visible
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            const hasVisibleClient = clients.some(c => c.visibilityState === 'visible')
            if (!hasVisibleClient) {
                self.registration.showNotification(t, {
                    body: b,
                    tag: 'rest-end',
                    requireInteraction: true,
                    icon: '/icon.png',
                })
            }
        }, 1000)
    }

    if (event.data.type === 'CANCEL_NOTIFICATION') {
        clearScheduled()
    }
})

// When user taps the notification, focus or open the app
self.addEventListener('notificationclick', event => {
    event.notification.close()
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            if (clients.length > 0) return clients[0].focus()
            return self.clients.openWindow('/')
        })
    )
})
