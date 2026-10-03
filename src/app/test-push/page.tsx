'use client'

import { useEffect, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

/** Returns true when running as an installed PWA on iOS (standalone mode) */
function isIosPwa(): boolean {
    if (typeof window === 'undefined') return false
    return ('standalone' in window.navigator) && (window.navigator as { standalone?: boolean }).standalone === true
}

/** Returns true when on iOS Safari (but not necessarily PWA) */
function isIos(): boolean {
    if (typeof window === 'undefined') return false
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export default function TestPushPage() {
    const [log, setLog] = useState<string[]>([])
    const [busy, setBusy] = useState(false)
    const [iosBrowserWarning, setIosBrowserWarning] = useState(false)
    const swRef = useRef<ServiceWorkerRegistration | null>(null)

    const addLog = (msg: string) => setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev])

    useEffect(() => {
        // Warn if iOS Safari but NOT in standalone PWA mode
        if (isIos() && !isIosPwa()) {
            setIosBrowserWarning(true)
        }

        if (!('serviceWorker' in navigator)) {
            addLog('[失敗] Service Worker not supported')
            return
        }
        navigator.serviceWorker.register('/sw.js').then(reg => {
            swRef.current = reg
            addLog('[完成] Service Worker registered')
        }).catch(err => addLog(`[失敗] SW register failed: ${err}`))
    }, [])

    async function subscribe() {
        // iOS requires PWA mode for Notification API
        if (typeof Notification === 'undefined') {
            addLog('[失敗] Notification API 不存在')
            addLog('[注意] iOS 需要從主畫面開啟 PWA 才支援推播通知')
            addLog('提示：請先點 Safari 分享按鈕 → 「加入主畫面」，再從主畫面開啟此頁面')
            return
        }

        setBusy(true)
        try {
            const perm = await Notification.requestPermission()
            addLog(`通知權限: ${perm}`)
            if (perm !== 'granted') {
                addLog('[失敗] 未授予通知權限，請到設定 → 通知 → GymBuddy 開啟')
                return
            }

            const reg = swRef.current ?? await navigator.serviceWorker.ready
            swRef.current = reg

            if (!reg.pushManager) {
                addLog('[失敗] pushManager 不存在（需要 HTTPS + PWA 主畫面模式）')
                return
            }

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) { addLog('[失敗] NEXT_PUBLIC_VAPID_PUBLIC_KEY 未設定'); return }

            // Always unsubscribe and re-subscribe to ensure fresh subscription with current VAPID key
            const existing = await reg.pushManager.getSubscription()
            if (existing) {
                await existing.unsubscribe()
                addLog('舊訂閱已清除，重新訂閱...')
            }
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            })
            addLog('[完成] 推播訂閱建立成功')

            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub.toJSON() }),
            })
            const data = await res.json()
            addLog(data.ok ? '[完成] 訂閱已儲存至伺服器，可以測試推播了' : `[失敗] 伺服器錯誤: ${JSON.stringify(data)}`)
        } catch (err) {
            addLog(`[失敗] 訂閱失敗: ${err}`)
        } finally {
            setBusy(false)
        }
    }

    async function sendTestPush() {
        setBusy(true)
        try {
            addLog('立即傳送測試推播...')
            const res = await fetch('/api/push/test')
            const data = await res.json()
            if (data.ok) {
                addLog(`[完成] 伺服器送出成功 (HTTP ${data.status}) — 通知應在幾秒內送達`)
                addLog('提示：若沒收到通知，請確認 iOS 設定 → 通知 → GymBuddy 已開啟')
            } else if (!data.hasSubscription) {
                addLog('[失敗] 伺服器沒有你的訂閱資料 — 請先點「訂閱推播通知」')
            } else {
                addLog(`[失敗] 伺服器送出失敗 (HTTP ${data.status ?? '?'}): ${data.error}`)
            }
        } catch (err) {
            addLog(`[失敗] 請求失敗: ${err}`)
        } finally {
            setBusy(false)
        }
    }

    async function checkSubscription() {
        try {
            if (!('serviceWorker' in navigator)) { addLog('[失敗] SW not supported'); return }
            const reg = swRef.current ?? await navigator.serviceWorker.ready
            if (!reg.pushManager) {
                addLog('[失敗] pushManager 不存在（需要 HTTPS + PWA 主畫面模式）')
                return
            }
            const sub = await reg.pushManager.getSubscription()
            if (sub) {
                addLog(`[完成] 有效訂閱 — endpoint: ...${sub.endpoint.slice(-30)}`)
            } else {
                addLog('[注意] 沒有推播訂閱（請先點「訂閱推播通知」）')
            }
        } catch (err) {
            addLog(`[失敗] ${err}`)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-2">Web Push 測試頁面</h1>
            <p className="text-gray-400 text-sm mb-4">
                測試流程：訂閱 → 傳送測試推播 → 切換到其他 App → 等 10 秒 → 確認通知是否送達
            </p>

            {/* iOS Safari warning banner */}
            {iosBrowserWarning && (
                <div className="bg-amber-900/60 border border-amber-500 rounded-xl p-4 mb-4 text-sm">
                    <p className="font-bold text-amber-300 mb-1 flex items-center gap-1.5"><TriangleAlert className="h-4 w-4" aria-hidden="true" />需要從主畫面開啟</p>
                    <p className="text-amber-200">
                        iOS 只有在「加入主畫面」的 PWA 模式下才支援推播通知。<br />
                        目前您在 Safari 瀏覽器中，推播功能無法使用。
                    </p>
                    <p className="text-amber-300 font-semibold mt-2">
                        請點底部分享按鈕（□↑）→「加入主畫面」→ 從主畫面開啟 GymBuddy
                    </p>
                </div>
            )}

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
                    2. 立即傳送測試推播
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
