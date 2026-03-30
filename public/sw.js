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
                addLog('LOCAL_NOTIFY_SENT', { drift, totalWait, visibleClients: 0 })
            } else {
                addLog('LOCAL_NOTIFY_SKIPPED', { reason: 'visible_client', drift, totalWait, visibleClients: clients.length })
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

    addLog('PUSH_RECEIVED', { title: payload.title, tag: payload.tag })

    // APNs push is authoritative — cancel any pending local SW timer to prevent double notification
    clearScheduled()

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            const hasVisibleClient = clients.some(c => c.visibilityState === 'visible')
            if (hasVisibleClient) {
                addLog('PUSH_NOTIFY_SKIPPED', { reason: 'visible_client', visibleClients: clients.length })
                return
            }
            addLog('PUSH_NOTIFY_SENT', { title: payload.title })
            return self.registration.showNotification(payload.title ?? '⏱️ 休息結束！', {
                body: payload.body ?? '準備好下一組了嗎？點擊繼續訓練',
                tag: payload.tag ?? 'rest-end',
                requireInteraction: true,
                icon: '/icon.png',
            })
        })
    )
})

// When user taps the notification, focus or open the app
self.addEventListener('notificationclick', event => {
    event.notification.close()
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            // Find a session page if one is already open
            const sessionClient = clients.find(c => c.url.includes('/session/'))
            if (sessionClient) return sessionClient.focus()
            if (clients.length > 0) return clients[0].focus()
            // App was killed — open the session list so user can resume
            return self.clients.openWindow('/session')
        })
    )
})
