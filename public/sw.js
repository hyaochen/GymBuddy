// Service Worker for GymBuddy — handles background rest-end notifications
// This runs independently of the main page's JavaScript throttling.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

// Scheduled notification timers (cleared when a new set is logged)
const pendingTimers = []

self.addEventListener('message', event => {
    if (!event.data) return

    if (event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { delayMs, title, body } = event.data

        // Cancel any previously scheduled notification
        while (pendingTimers.length > 0) {
            clearTimeout(pendingTimers.pop())
        }

        const timerId = setTimeout(async () => {
            // Only show if no client window is currently visible
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            const hasVisibleClient = clients.some(c => c.visibilityState === 'visible')

            if (!hasVisibleClient) {
                self.registration.showNotification(title, {
                    body,
                    tag: 'rest-end',
                    requireInteraction: true,
                    icon: '/icon.png',
                })
            }
        }, delayMs)

        pendingTimers.push(timerId)
    }

    if (event.data.type === 'CANCEL_NOTIFICATION') {
        while (pendingTimers.length > 0) {
            clearTimeout(pendingTimers.pop())
        }
    }
})

// When user taps the notification, focus or open the app
self.addEventListener('notificationclick', event => {
    event.notification.close()
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            if (clients.length > 0) {
                return clients[0].focus()
            }
            return self.clients.openWindow('/')
        })
    )
})
