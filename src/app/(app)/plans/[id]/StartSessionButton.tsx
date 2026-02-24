"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Play, Loader2 } from "lucide-react"

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

    const handleStart = async () => {
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

    return (
        <button
            onClick={handleStart}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            開始訓練
        </button>
    )
}
