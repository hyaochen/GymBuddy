"use client"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="zh-TW" className="dark">
            <body style={{ background: "#09090b", color: "#fafafa", fontFamily: "system-ui" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", textAlign: "center" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>應用程式錯誤</h1>
                    <p style={{ fontSize: "0.875rem", color: "#a1a1aa", marginBottom: "0.25rem" }}>{error.message}</p>
                    {error.digest && <p style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: "1rem" }}>Digest: {error.digest}</p>}
                    <button
                        onClick={reset}
                        style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "#6366f1", color: "white", border: "none", cursor: "pointer", fontSize: "0.875rem" }}
                    >
                        重試
                    </button>
                </div>
            </body>
        </html>
    )
}
