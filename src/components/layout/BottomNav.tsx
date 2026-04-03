"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Dumbbell, Play, ClipboardList, History, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { href: "/", label: "首頁", icon: Home },
    { href: "/exercises", label: "動作庫", icon: Dumbbell },
    { href: "/session", label: "開始", icon: Play, primary: true },
    { href: "/plans", label: "計畫", icon: ClipboardList },
    { href: "/history", label: "記錄", icon: History },
    { href: "/analytics", label: "分析", icon: BarChart3 },
]

export default function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom,0px)]" aria-label="主要導航">
            <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
                {navItems.map(({ href, label, icon: Icon, primary }) => {
                    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-label={label}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[56px] rounded-xl transition-colors active:scale-95",
                                primary && "relative",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {primary ? (
                                <div className={cn(
                                    "flex flex-col items-center justify-center w-12 h-12 rounded-full",
                                    isActive ? "bg-primary text-primary-foreground" : "bg-primary/90 text-primary-foreground"
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            ) : (
                                <>
                                    <Icon className={cn("h-5 w-5", isActive ? "fill-primary" : "")} />
                                    <span className="text-[11px] font-medium leading-tight">{label}</span>
                                </>
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
