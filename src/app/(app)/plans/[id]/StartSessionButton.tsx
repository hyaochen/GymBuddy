"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Play, Loader2, RotateCcw } from "lucide-react"

export default function StartSessionButton({
    planId,
    dayId,
    dayName,
}: {
    planId: string
    dayId: string
    dayName: string
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    // null = not checked yet; string = found an active session id; false = none found
    const [activeSessionId, setActiveSessionId] = useState<string | null | false>(null)
    const [checked, setChecked] = useState(false)

    const checkAndStart = async () => {
        setLoading(true)
        try {
            if (!checked) {
                // First click: check for existing incomplete session
                const checkRes = await fetch(`/api/sessions/active?dayId=${dayId}`)
                const checkData = await checkRes.json()
                setChecked(true)
                if (checkData.sessionId) {
                    // Found an active session — show resume/restart options
                    setActiveSessionId(checkData.sessionId)
                    setLoading(false)
                    return
                }
                setActiveSessionId(false)
            }
            // No active session (or user chose to start fresh) — create new
            await createNewSession()
        } catch (e) {
            console.error(e)
            setLoading(false)
        }
    }

    const resume = () => {
        if (activeSessionId) router.push(`/session/${activeSessionId}`)
    }

    const createNewSession = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, dayId }),
            })
            const data = await res.json()
            if (data.session?.id) {
                router.push(`/session/${data.session.id}`)
            }
        } catch (e) {
            console.error(e)
            setLoading(false)
        }
    }

    // Show resume/restart choice if an active session exists
    if (activeSessionId) {
        return (
            <div className="flex items-center gap-3">
                <button
                    onClick={resume}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
                >
                    <Play className="h-4 w-4" />
                    繼續上次
                </button>
                <span className="text-border">|</span>
                <button
                    onClick={() => { setActiveSessionId(false); createNewSession() }}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    重新開始
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={checkAndStart}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            開始訓練
        </button>
    )
}
