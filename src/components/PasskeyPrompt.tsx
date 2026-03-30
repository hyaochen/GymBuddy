"use client"

import { useEffect, useState, useCallback } from "react"
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser"
import { KeyRound, X } from "lucide-react"

export default function PasskeyPrompt() {
    const [show, setShow] = useState(false)
    const [registering, setRegistering] = useState(false)
    const [done, setDone] = useState(false)

    useEffect(() => {
        if (!browserSupportsWebAuthn()) return
        // Don't show if user dismissed before
        if (sessionStorage.getItem("passkey-prompt-dismissed")) return

        // Check if user already has passkeys
        fetch("/api/auth/webauthn")
            .then(r => r.json())
            .then(passkeys => {
                if (passkeys.length === 0) setShow(true)
            })
            .catch(() => {})
    }, [])

    const handleSetup = useCallback(async () => {
        setRegistering(true)
        try {
            const optRes = await fetch("/api/auth/webauthn/register-options")
            if (!optRes.ok) throw new Error()
            const options = await optRes.json()

            const attestation = await startRegistration({ optionsJSON: options })

            const ua = navigator.userAgent
            let deviceName = "裝置"
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

            if (!verifyRes.ok) throw new Error()
            setDone(true)
            setTimeout(() => setShow(false), 2000)
        } catch {
            // User cancelled or error — just dismiss
        } finally {
            setRegistering(false)
        }
    }, [])

    function handleDismiss() {
        sessionStorage.setItem("passkey-prompt-dismissed", "1")
        setShow(false)
    }

    if (!show) return null

    return (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
            <KeyRound className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                {done ? (
                    <p className="text-sm font-medium text-green-400">Face ID 綁定成功！下次可以直接刷臉登入 🎉</p>
                ) : (
                    <>
                        <p className="text-sm font-medium">啟用 Face ID 快速登入？</p>
                        <p className="text-xs text-muted-foreground mt-0.5">綁定後不用再輸入帳號密碼</p>
                        <button
                            onClick={handleSetup}
                            disabled={registering}
                            className="mt-2 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                        >
                            {registering ? "驗證中..." : "立即綁定"}
                        </button>
                    </>
                )}
            </div>
            {!done && (
                <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-0.5">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}
