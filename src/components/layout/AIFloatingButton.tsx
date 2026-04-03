"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export default function AIFloatingButton() {
    const pathname = usePathname()
    const [showPulse, setShowPulse] = useState(false)

    useEffect(() => {
        const hasVisited = localStorage.getItem("gymbuddy-ai-visited")
        if (!hasVisited) {
            setShowPulse(true)
        }
    }, [])

    function handleClick() {
        localStorage.setItem("gymbuddy-ai-visited", "1")
        setShowPulse(false)
    }

    // Don't show on the AI page itself (moved AFTER hooks)
    if (pathname.startsWith("/ai")) return null

    return (
        <Link
            href="/ai"
            onClick={handleClick}
            className={cn(
                "fixed z-40 flex items-center justify-center",
                "h-12 w-12 rounded-full",
                "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                "hover:bg-primary/90 active:scale-95 transition-all",
                "bottom-[88px] right-4 md:hidden"
            )}
            aria-label="AI 助手"
        >
            <Sparkles className="h-5 w-5" />
            {showPulse && (
                <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
            )}
        </Link>
    )
}
