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
let scheduled = null   // { endTime: number, title: string, body: string, scheduledAt: number, tag: string }
// Cooldown: record when a rest-end notification last fired so we don't double-fire
// within the race window between server-push and local-timer paths.
let lastRestEndFiredAt = 0
const REST_END_COOLDOWN_MS = 30_000

function clearScheduled() {
    if (checkInterval) { clearInterval(checkInterval); checkInterval = null }
    scheduled = null
}

function markRestEndFired() {
    lastRestEndFiredAt = Date.now()
}

function restEndWithinCooldown() {
    return Date.now() - lastRestEndFiredAt < REST_END_COOLDOWN_MS
}

self.addEventListener('message', event => {
    if (!event.data) return

    // Allow client to query notification log
    if (event.data.type === 'GET_NOTIFICATION_LOG') {
        event.source.postMessage({ type: 'NOTIFICATION_LOG', log: notificationLog })
        return
    }

    if (event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { endTime, title, body, tag } = event.data
        const delaySec = Math.round((endTime - Date.now()) / 1000)
        clearScheduled()
        // Reset cooldown for new rest session — client is explicitly starting a fresh rest.
        lastRestEndFiredAt = 0
        const resolvedTag = tag || 'rest-end'
        scheduled = { endTime, title, body, scheduledAt: Date.now(), tag: resolvedTag }
        addLog('SCHEDULED', { delaySec, endTime: new Date(endTime).toISOString(), tag: resolvedTag })

        // Poll every 1 s instead of a single setTimeout.
        // If the SW is suspended and restarted it re-receives this message
        // from the page on the next postMessage call, so no state is lost.
        checkInterval = setInterval(async () => {
            if (!scheduled) { clearInterval(checkInterval); checkInterval = null; return }
            if (Date.now() < scheduled.endTime) return

            // Time is up
            const { title: t, body: b, scheduledAt, tag: scheduledTag } = scheduled
            const drift = Date.now() - scheduled.endTime
            const totalWait = Date.now() - scheduledAt
            clearScheduled()

            // Cooldown: server push already fired for this rest session
            if (restEndWithinCooldown()) {
                addLog('LOCAL_NOTIFY_SKIPPED', { reason: 'cooldown_active', drift, totalWait })
                return
            }

            // Skip if any rest-end notification (old or new tag) is still showing
            const existing = await self.registration.getNotifications({ tag: 'rest-end' })
            const existingNew = await self.registration.getNotifications({ tag: scheduledTag })
            if (existing.length > 0 || existingNew.length > 0) {
                addLog('LOCAL_NOTIFY_SKIPPED', { reason: 'push_already_shown', drift, totalWait })
                return
            }

            // Always show banner — do NOT skip based on visibility. iOS Safari drops
            // the banner during rapid foreground/background transitions; see 2026-04-10
            // owner report ("switching to app and back eats the banner on short rests").
            markRestEndFired()
            self.registration.showNotification(t, {
                body: b,
                tag: scheduledTag,
                renotify: true,
                requireInteraction: true,
                icon: '/icon-192.png',
            })
            addLog('LOCAL_NOTIFY_SENT', { drift, totalWait, tag: scheduledTag })
        }, 1000)
    }

    if (event.data.type === 'CANCEL_NOTIFICATION') {
        addLog('CANCELLED', {})
        clearScheduled()
    }
})

// Server-sent Web Push (via APNs on iOS) — the reliable path.
//
// Rest-end notifications ALWAYS show the banner, even if the session page is
// currently visible. iOS Safari drops banners during the race between a brief
// foreground visit and a rest-timer expiry, so we stopped trying to suppress
// the banner based on client visibility (owner report 2026-04-10: "accidentally
// switching to app and back eats the banner on short rests").
self.addEventListener('push', event => {
    if (!event.data) { addLog('PUSH_RECEIVED', { hasData: false }); return }
    let payload
    try { payload = event.data.json() } catch { addLog('PUSH_PARSE_ERROR', {}); return }

    const tag = payload.tag ?? 'rest-end'
    const isRestNotification = tag.startsWith('rest-end')
    addLog('PUSH_RECEIVED', { title: payload.title, tag })

    // Only cancel local timer for rest notifications
    if (isRestNotification) clearScheduled()

    event.waitUntil((async () => {
        // For rest notifications: dedupe so we never double-fire within the same rest session.
        if (isRestNotification) {
            if (restEndWithinCooldown()) {
                addLog('PUSH_NOTIFY_SKIPPED', { reason: 'cooldown_active', tag })
                return
            }
            const existingLegacy = await self.registration.getNotifications({ tag: 'rest-end' })
            const existingExact = await self.registration.getNotifications({ tag })
            if (existingLegacy.length > 0 || existingExact.length > 0) {
                addLog('PUSH_NOTIFY_SKIPPED', { reason: 'local_already_shown', tag })
                return
            }
            markRestEndFired()
        }

        addLog('PUSH_NOTIFY_SENT', { title: payload.title, tag })
        return self.registration.showNotification(payload.title ?? '通知', {
            body: payload.body ?? '',
            tag,
            renotify: isRestNotification,
            requireInteraction: isRestNotification,
            icon: '/icon-192.png',
        })
    })())
})

// When user taps the notification, focus or open the app
self.addEventListener('notificationclick', event => {
    event.notification.close()
    const tag = event.notification.tag || ''
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            // Social / friend notifications → open the social page
            if (tag === 'social-feed' || tag === 'friend-request' || tag === 'friend-accepted') {
                const socialClient = clients.find(c => c.url.includes('/social'))
                if (socialClient) return socialClient.focus()
                if (clients.length > 0) { clients[0].navigate('/social'); return clients[0].focus() }
                return self.clients.openWindow('/social')
            }
            // Rest-end notifications (any tag starting with rest-end) → open the active session
            const sessionClient = clients.find(c => c.url.includes('/session/'))
            if (sessionClient) return sessionClient.focus()
            if (clients.length > 0) return clients[0].focus()
            return self.clients.openWindow('/session')
        })
    )
})
