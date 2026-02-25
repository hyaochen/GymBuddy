'use client'

import { useEffect, useRef, useState } from 'react'

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function TestPushPage() {
    const [log, setLog] = useState<string[]>([])
    const [busy, setBusy] = useState(false)
    const swRef = useRef<ServiceWorkerRegistration | null>(null)

    const addLog = (msg: string) => setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev])

    // Register SW and subscribe on mount
    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            addLog('❌ Service Worker not supported')
            return
        }
        navigator.serviceWorker.register('/sw.js').then(reg => {
            swRef.current = reg
            addLog('✅ Service Worker registered')
        }).catch(err => addLog(`❌ SW register failed: ${err}`))
    }, [])

    async function subscribe() {
        setBusy(true)
        try {
            // Request notification permission
            const perm = await Notification.requestPermission()
            addLog(`🔔 Notification permission: ${perm}`)
            if (perm !== 'granted') return

            const reg = swRef.current ?? await navigator.serviceWorker.ready
            swRef.current = reg

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) { addLog('❌ NEXT_PUBLIC_VAPID_PUBLIC_KEY not set'); return }

            // Get or create push subscription
            let sub = await reg.pushManager.getSubscription()
            if (sub) {
                addLog('ℹ️ Already subscribed — reusing existing subscription')
            } else {
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey),
                })
                addLog('✅ Push subscription created')
            }

            // Send subscription to server
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub.toJSON() }),
            })
            const data = await res.json()
            addLog(data.ok ? '✅ Subscription saved on server' : `❌ Server error: ${JSON.stringify(data)}`)
        } catch (err) {
            addLog(`❌ Subscribe error: ${err}`)
        } finally {
            setBusy(false)
        }
    }

    async function sendTestPush() {
        setBusy(true)
        try {
            addLog('📤 Scheduling test push (10 s)...')
            const res = await fetch('/api/push/test')
            const data = await res.json()
            if (data.ok) {
                addLog(`⏱️ Push scheduled — will fire at ${new Date(data.fireAt).toLocaleTimeString()}`)
                addLog('👉 Now lock your screen or switch to another app. Notification should arrive in 10 s.')
            } else {
                addLog(`❌ Error: ${JSON.stringify(data)}`)
            }
        } catch (err) {
            addLog(`❌ Fetch error: ${err}`)
        } finally {
            setBusy(false)
        }
    }

    async function checkSubscription() {
        try {
            if (!('serviceWorker' in navigator)) { addLog('❌ SW not supported'); return }
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.getSubscription()
            if (sub) {
                addLog(`✅ Active subscription — endpoint: ...${sub.endpoint.slice(-30)}`)
            } else {
                addLog('⚠️ No active push subscription (click Subscribe first)')
            }
        } catch (err) {
            addLog(`❌ ${err}`)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-2">Web Push 測試頁面</h1>
            <p className="text-gray-400 text-sm mb-6">
                用此頁面測試伺服器端 Web Push（APNs）是否運作正常。<br />
                測試流程：訂閱 → 傳送測試推播 → 切換到其他 App → 等 10 秒 → 確認通知是否送達
            </p>

            <div className="flex flex-col gap-3 mb-6">
                <button
                    onClick={subscribe}
                    disabled={busy}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl py-3 px-4 font-semibold text-center"
                >
                    1. 訂閱推播通知
                </button>
                <button
                    onClick={checkSubscription}
                    disabled={busy}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-xl py-3 px-4 font-semibold text-center"
                >
                    檢查訂閱狀態
                </button>
                <button
                    onClick={sendTestPush}
                    disabled={busy}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl py-3 px-4 font-semibold text-center"
                >
                    2. 傳送測試推播（10 秒後）
                </button>
            </div>

            <div className="bg-gray-900 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-gray-400 mb-2">操作記錄</h2>
                {log.length === 0 ? (
                    <p className="text-gray-600 text-sm">尚無記錄</p>
                ) : (
                    <ul className="text-sm space-y-1">
                        {log.map((line, i) => (
                            <li key={i} className="font-mono text-xs text-gray-300">{line}</li>
                        ))}
                    </ul>
                )}
            </div>

            <p className="text-gray-600 text-xs mt-4 text-center">
                此頁面僅供開發測試使用<br />
                <a href="/" className="text-blue-500 underline">返回首頁</a>
            </p>
        </div>
    )
}
