// Service Worker for GymBuddy — handles background rest-end notifications
// Uses setInterval polling against an absolute endTime so the OS killing/restarting
// the SW mid-wait doesn't silently swallow the notification.

// ─── Notification Log (in-memory, queryable from client) ─────────────────────
const notificationLog = []
const MAX_LOG = 100

function addLog(event, detail) {
    const entry = { ts: new Date().toISOString(), event, ...detail }
    notificationLog.push(entry)
    if (notificationLog.length > MAX_LOG) notificationLog.shift()
    console.log(`[sw] ${entry.event}`, JSON.stringify(detail))
}

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

let checkInterval = null
let scheduled = null   // { endTime: number, title: string, body: string, scheduledAt: number }

function clearScheduled() {
    if (checkInterval) { clearInterval(checkInterval); checkInterval = null }
    scheduled = null
}

self.addEventListener('message', event => {
    if (!event.data) return

    // Allow client to query notification log
    if (event.data.type === 'GET_NOTIFICATION_LOG') {
        event.source.postMessage({ type: 'NOTIFICATION_LOG', log: notificationLog })
        return
    }

    if (event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { endTime, title, body } = event.data
        const delaySec = Math.round((endTime - Date.now()) / 1000)
        clearScheduled()
        scheduled = { endTime, title, body, scheduledAt: Date.now() }
        addLog('SCHEDULED', { delaySec, endTime: new Date(endTime).toISOString() })

        // Poll every 1 s instead of a single setTimeout.
        // If the SW is suspended and restarted it re-receives this message
        // from the page on the next postMessage call, so no state is lost.
        checkInterval = setInterval(async () => {
            if (!scheduled) { clearInterval(checkInterval); checkInterval = null; return }
            if (Date.now() < scheduled.endTime) return

            // Time is up
            const { title: t, body: b, scheduledAt } = scheduled
            const drift = Date.now() - scheduled.endTime
            const totalWait = Date.now() - scheduledAt
            clearScheduled()

            // Skip if server push already showed a notification with the same tag
            const existing = await self.registration.getNotifications({ tag: 'rest-end' })
            if (existing.length > 0) {
                addLog('LOCAL_NOTIFY_SKIPPED', { reason: 'push_already_shown', drift, totalWait })
                return
            }

            // Only skip if user is actively on the session page (in-app alarm handles it)
            // If user navigated to other pages in the app, still show the push notification
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            const hasVisibleSessionPage = clients.some(c => c.visibilityState === 'visible' && c.url.includes('/session/'))
            if (!hasVisibleSessionPage) {
                self.registration.showNotification(t, {
                    body: b,
                    tag: 'rest-end',
                    requireInteraction: true,
                    icon: '/icon-192.png',
                })
                addLog('LOCAL_NOTIFY_SENT', { drift, totalWait, visibleClients: clients.length, sessionVisible: false })
            } else {
                addLog('LOCAL_NOTIFY_SKIPPED', { reason: 'session_page_visible', drift, totalWait })
            }
        }, 1000)
    }

    if (event.data.type === 'CANCEL_NOTIFICATION') {
        addLog('CANCELLED', {})
        clearScheduled()
    }
})

// Server-sent Web Push (via APNs on iOS) — the reliable path
self.addEventListener('push', event => {
    if (!event.data) { addLog('PUSH_RECEIVED', { hasData: false }); return }
    let payload
    try { payload = event.data.json() } catch { addLog('PUSH_PARSE_ERROR', {}); return }

    const tag = payload.tag ?? 'rest-end'
    const isRestNotification = tag === 'rest-end'
    addLog('PUSH_RECEIVED', { title: payload.title, tag })

    // Only cancel local timer for rest notifications
    if (isRestNotification) clearScheduled()

    event.waitUntil((async () => {
        // For rest notifications: skip if local timer already showed one
        if (isRestNotification) {
            const existing = await self.registration.getNotifications({ tag: 'rest-end' })
            if (existing.length > 0) {
                addLog('PUSH_NOTIFY_SKIPPED', { reason: 'local_already_shown' })
                return
            }
            // Only skip if user is on the session page (in-app alarm handles it there)
            // If user is on other pages, still show the notification
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            if (clients.some(c => c.visibilityState === 'visible' && c.url.includes('/session/'))) {
                addLog('PUSH_NOTIFY_SKIPPED', { reason: 'session_page_visible', visibleClients: clients.length })
                return
            }
        }

        // Social notifications always show, even if app is open
        addLog('PUSH_NOTIFY_SENT', { title: payload.title, tag })
        return self.registration.showNotification(payload.title ?? '通知', {
            body: payload.body ?? '',
            tag,
            requireInteraction: isRestNotification,
            icon: '/icon-192.png',
        })
    })())
})

// When user taps the notification, focus or open the app
self.addEventListener('notificationclick', event => {
    event.notification.close()
    const tag = event.notification.tag
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            // Social / friend notifications → open the social page
            if (tag === 'social-feed' || tag === 'friend-request' || tag === 'friend-accepted') {
                const socialClient = clients.find(c => c.url.includes('/social'))
                if (socialClient) return socialClient.focus()
                if (clients.length > 0) { clients[0].navigate('/social'); return clients[0].focus() }
                return self.clients.openWindow('/social')
            }
            // Rest-end notifications → open the active session
            const sessionClient = clients.find(c => c.url.includes('/session/'))
            if (sessionClient) return sessionClient.focus()
            if (clients.length > 0) return clients[0].focus()
            return self.clients.openWindow('/session')
        })
    )
})
