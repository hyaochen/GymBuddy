"use client"

import { useEffect } from "react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("App error:", error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
            <h2 className="text-lg font-bold text-destructive mb-2">發生錯誤</h2>
            <p className="text-sm text-muted-foreground mb-1">{error.message}</p>
            {error.digest && (
                <p className="text-xs text-muted-foreground mb-4">Digest: {error.digest}</p>
            )}
            <button
                onClick={reset}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
                重試
            </button>
        </div>
    )
}
