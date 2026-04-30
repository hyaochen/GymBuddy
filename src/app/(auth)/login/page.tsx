"use client"

import Link from "next/link"
import { login } from "@/app/actions/auth"
import { use, useState, useEffect } from "react"
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser"
import { useRouter } from "next/navigation"

export default function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const { error } = use(searchParams)
    const [submitting, setSubmitting] = useState(false)
    const [supportsPasskey, setSupportsPasskey] = useState(false)
    const [passkeyLoading, setPasskeyLoading] = useState(false)
    const [passkeyError, setPasskeyError] = useState("")
    const router = useRouter()

    useEffect(() => {
        const supported = browserSupportsWebAuthn()
        setSupportsPasskey(supported)

        // Auto-trigger Face ID / Passkey on page load if supported
        if (supported && !error) {
            handlePasskeyLogin(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function handlePasskeyLogin(silent = false) {
        setPasskeyLoading(true)
        if (!silent) setPasskeyError("")
        try {
            const optRes = await fetch("/api/auth/webauthn/auth-options")
            if (!optRes.ok) throw new Error("Failed to get options")
            const options = await optRes.json()

            const assertion = await startAuthentication({ optionsJSON: options })

            const verifyRes = await fetch("/api/auth/webauthn/auth-verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(assertion),
            })

            if (!verifyRes.ok) throw new Error("驗證失敗")
            router.push("/")
        } catch (err) {
            // In silent mode (auto-trigger), don't show errors — user can still login manually
            if (!silent) {
                const msg = err instanceof Error ? err.message : "Passkey 登入失敗"
                if (!msg.includes("cancelled") && !msg.includes("AbortError")) {
                    setPasskeyError(msg)
                }
            }
        } finally {
            setPasskeyLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-3">💪</div>
                    <h1 className="text-2xl font-bold text-foreground">GymBuddy</h1>
                    <p className="text-muted-foreground text-sm mt-1">健身訓練追蹤器</p>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-lg font-semibold mb-4">登入</h2>

                    {error && (
                        <div className="bg-destructive/15 border border-destructive/30 rounded-lg px-3 py-2 mb-4">
                            <p className="text-destructive text-sm">{error}</p>
                        </div>
                    )}

                    <form action={login} onSubmit={() => setSubmitting(true)} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                                帳號 / 電子郵件
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                autoComplete="username email"
                                required
                                className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="帳號或 your@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                                密碼
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                            {submitting ? "登入中..." : "登入"}
                        </button>
                    </form>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-card px-2 text-muted-foreground">或</span>
                        </div>
                    </div>

                    <a
                        href="/api/auth/google"
                        className="w-full h-12 rounded-lg border border-border bg-white text-gray-700 font-medium text-sm flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        使用 Google 帳號登入
                    </a>

                    {supportsPasskey && (
                        <button
                            onClick={() => handlePasskeyLogin(false)}
                            disabled={passkeyLoading}
                            className="w-full h-12 rounded-lg border border-border bg-card text-foreground font-medium text-sm flex items-center justify-center gap-3 hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 10V4a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v6" />
                                <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" />
                                <path d="M12 15v4" />
                                <path d="M10 19h4" />
                            </svg>
                            {passkeyLoading ? "驗證中..." : "使用 Face ID / Passkey 登入"}
                        </button>
                    )}

                    {passkeyError && (
                        <p className="text-destructive text-sm text-center">{passkeyError}</p>
                    )}
                </div>

                <p className="text-center text-sm text-muted-foreground mt-4">
                    還沒有帳號？{" "}
                    <Link href="/register" className="text-primary hover:underline font-medium">
                        立即註冊
                    </Link>
                </p>
            </div>
        </div>
    )
}
