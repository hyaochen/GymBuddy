"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

export default function DeletePlanButton({ planId }: { planId: string }) {
    const [confirming, setConfirming] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const router = useRouter()

    async function handleDelete() {
        setDeleting(true)
        const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" })
        if (res.ok) router.push("/plans")
        else setDeleting(false)
    }

    if (confirming) {
        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs text-white bg-destructive px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                >
                    {deleting ? "刪除中..." : "確認刪除"}
                </button>
                <button
                    onClick={() => setConfirming(false)}
                    className="text-xs text-muted-foreground px-2 py-1.5"
                >
                    取消
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={() => setConfirming(true)}
            className="text-muted-foreground hover:text-destructive transition-colors"
        >
            <Trash2 className="h-4 w-4" />
        </button>
    )
}
