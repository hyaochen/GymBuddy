"use client"

import { useEffect, useState, useCallback } from "react"
import { startRegistration } from "@simplewebauthn/browser"
import { KeyRound, Plus, Trash2, Smartphone } from "lucide-react"

interface PasskeyInfo {
    id: string
    deviceName: string | null
    createdAt: string
}

export default function SettingsPage() {
    const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [registering, setRegistering] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const fetchPasskeys = useCallback(async () => {
        const res = await fetch("/api/auth/webauthn")
        if (res.ok) setPasskeys(await res.json())
        setLoading(false)
    }, [])

    useEffect(() => { fetchPasskeys() }, [fetchPasskeys])

    async function handleRegister() {
        setRegistering(true)
        setMessage(null)
        try {
            const optRes = await fetch("/api/auth/webauthn/register-options")
            if (!optRes.ok) throw new Error("Failed to get options")
            const options = await optRes.json()

            const attestation = await startRegistration({ optionsJSON: options })

            // Auto-detect device name
            const ua = navigator.userAgent
            let deviceName = "Unknown Device"
            if (/iPhone/.test(ua)) deviceName = "iPhone"
            else if (/iPad/.test(ua)) deviceName = "iPad"
            else if (/Android/.test(ua)) deviceName = "Android"
            else if (/Mac/.test(ua)) deviceName = "Mac"
            else if (/Windows/.test(ua)) deviceName = "Windows"

            const verifyRes = await fetch("/api/auth/webauthn/register-verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attestation, deviceName }),
            })

            if (!verifyRes.ok) throw new Error("Verification failed")

            setMessage({ type: "success", text: "Passkey 已新增！" })
            fetchPasskeys()
        } catch (err) {
            const msg = err instanceof Error ? err.message : "註冊失敗"
            if (msg.includes("cancelled") || msg.includes("AbortError")) {
                setMessage(null)
            } else {
                setMessage({ type: "error", text: msg })
            }
        } finally {
            setRegistering(false)
        }
    }

    async function handleDelete(id: string) {
        const res = await fetch(`/api/auth/webauthn/${id}`, { method: "DELETE" })
        if (res.ok) {
            setPasskeys(prev => prev.filter(p => p.id !== id))
            setMessage({ type: "success", text: "Passkey 已刪除" })
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold">設定</h1>

            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold">Passkey / 生物辨識登入</h2>
                    </div>
                    <button
                        onClick={handleRegister}
                        disabled={registering}
                        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        {registering ? "註冊中..." : "新增"}
                    </button>
                </div>

                <p className="text-sm text-muted-foreground">
                    綁定後可使用 Face ID、指紋或裝置 PIN 碼快速登入，無需輸入密碼。
                </p>

                {message && (
                    <div className={`rounded-lg px-3 py-2 text-sm ${message.type === "success" ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-destructive/15 text-destructive border border-destructive/30"}`}>
                        {message.text}
                    </div>
                )}

                {loading ? (
                    <p className="text-sm text-muted-foreground">載入中...</p>
                ) : passkeys.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">尚未綁定任何 Passkey</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {passkeys.map(pk => (
                            <div key={pk.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2.5">
                                <div className="flex items-center gap-2.5">
                                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">{pk.deviceName || "Passkey"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(pk.createdAt).toLocaleDateString("zh-TW")}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(pk.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
