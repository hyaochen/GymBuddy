"use client"

import { useEffect, useState, useCallback, useActionState, useTransition } from "react"
import Link from "next/link"
import { startRegistration } from "@simplewebauthn/browser"
import { KeyRound, Plus, Trash2, Smartphone, Bell, ExternalLink, Lock, LogOut } from "lucide-react"
import { changePassword, getPasswordStatus, logoutAllDevices } from "@/app/actions/account"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

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

    const [hasPassword, setHasPassword] = useState(true)
    const [pwState, pwAction, pwPending] = useActionState(changePassword, {})
    const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)
    const [loggingOut, startLogout] = useTransition()

    useEffect(() => {
        getPasswordStatus().then(r => setHasPassword(r.hasPassword)).catch(() => {})
    }, [])

    useEffect(() => {
        if (pwState.success) {
            toast({ title: "密碼已變更", description: "其他裝置已登出", variant: "success" })
            setHasPassword(true)
        }
    }, [pwState])

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

            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">{hasPassword ? "變更密碼" : "設定密碼"}</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                    {hasPassword
                        ? "變更後其他裝置會自動登出，目前這台維持登入。"
                        : "你目前只用 Google 登入，設定密碼後也可用帳號密碼登入。其他裝置會自動登出。"}
                </p>
                {pwState.error && (
                    <div className="rounded-lg px-3 py-2 text-sm bg-destructive/15 text-destructive border border-destructive/30">
                        {pwState.error}
                    </div>
                )}
                <form action={pwAction} className="space-y-3">
                    {hasPassword && (
                        <input
                            name="currentPassword"
                            type="password"
                            autoComplete="current-password"
                            required
                            placeholder="目前密碼"
                            aria-label="目前密碼"
                            className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    )}
                    <input
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        placeholder="新密碼（至少 8 個字元）"
                        aria-label="新密碼"
                        className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        placeholder="再次輸入新密碼"
                        aria-label="確認新密碼"
                        className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                        type="submit"
                        disabled={pwPending}
                        className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                        {pwPending ? "處理中..." : hasPassword ? "變更密碼" : "設定密碼"}
                    </button>
                </form>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <LogOut className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">登出所有裝置</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                    手機遺失或在別人的裝置登入過時使用。所有裝置（包含這台）都會登出。
                </p>
                <button
                    onClick={() => setConfirmLogoutAll(true)}
                    className="text-sm font-medium text-destructive hover:text-destructive/80"
                >
                    登出所有裝置
                </button>
            </div>

            <Dialog open={confirmLogoutAll} onOpenChange={setConfirmLogoutAll}>
                <DialogContent className="max-w-sm mx-auto">
                    <DialogHeader>
                        <DialogTitle>登出所有裝置？</DialogTitle>
                        <DialogDescription>
                            所有裝置（包含這台）都會登出，需要重新登入。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setConfirmLogoutAll(false)}
                            className="h-10 px-4 rounded-lg border border-border text-sm"
                        >
                            取消
                        </button>
                        <button
                            onClick={() => startLogout(async () => { await logoutAllDevices() })}
                            disabled={loggingOut}
                            className="h-10 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-60"
                        >
                            {loggingOut ? "處理中..." : "確認登出"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Push notification debug */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">推播通知除錯</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                    測試推播訂閱、立即送出測試通知、檢查當前裝置是否已訂閱。多裝置（iPhone + 電腦）各自獨立訂閱，不會互相覆蓋。
                </p>
                <Link
                    href="/test-push"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
                >
                    開啟 Web Push 測試頁
                    <ExternalLink className="h-4 w-4" />
                </Link>
            </div>
        </div>
    )
}
