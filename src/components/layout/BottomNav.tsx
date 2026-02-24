"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Dumbbell, Play, ClipboardList, History } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { href: "/", label: "首頁", icon: Home },
    { href: "/exercises", label: "動作庫", icon: Dumbbell },
    { href: "/session", label: "開始", icon: Play, primary: true },
    { href: "/plans", label: "計畫", icon: ClipboardList },
    { href: "/history", label: "記錄", icon: History },
]

export default function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur">
            <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
                {navItems.map(({ href, label, icon: Icon, primary }) => {
                    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[56px] rounded-xl transition-colors",
                                primary && "relative",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {primary ? (
                                <div className={cn(
                                    "flex items-center justify-center w-12 h-12 rounded-full",
                                    isActive ? "bg-primary text-primary-foreground" : "bg-primary/90 text-primary-foreground"
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            ) : (
                                <>
                                    <Icon className={cn("h-5 w-5", isActive ? "fill-primary" : "")} />
                                    <span className="text-[10px] font-medium">{label}</span>
                                </>
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
