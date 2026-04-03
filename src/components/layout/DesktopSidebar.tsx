"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Home, History, Play, ClipboardList, BarChart3,
    Dumbbell, Users, Sparkles,
    User, Settings, PanelLeftClose, PanelLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

const coreItems = [
    { href: "/", label: "首頁", icon: Home },
    { href: "/history", label: "紀錄", icon: History },
    { href: "/session", label: "開始訓練", icon: Play, primary: true },
    { href: "/plans", label: "計畫", icon: ClipboardList },
    { href: "/analytics", label: "分析", icon: BarChart3 },
]

const moreItems = [
    { href: "/exercises", label: "動作庫", icon: Dumbbell },
    { href: "/social", label: "社交", icon: Users },
    { href: "/ai", label: "AI 助手", icon: Sparkles },
]

const bottomItems = [
    { href: "/profile", label: "個人檔案", icon: User },
    { href: "/settings", label: "設定", icon: Settings },
]

export default function DesktopSidebar() {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem("gymbuddy-sidebar-collapsed")
        if (saved === "true") setCollapsed(true)
    }, [])

    function toggleCollapse() {
        const next = !collapsed
        setCollapsed(next)
        localStorage.setItem("gymbuddy-sidebar-collapsed", String(next))
    }

    function isActive(href: string) {
        return pathname === href || (href !== "/" && pathname.startsWith(href))
    }

    function NavItem({ href, label, icon: Icon, primary }: {
        href: string; label: string; icon: React.ComponentType<{ className?: string }>; primary?: boolean
    }) {
        const active = isActive(href)
        return (
            <Link
                href={href}
                className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    primary && !active && "bg-primary/10 text-primary hover:bg-primary/20",
                    primary && active && "bg-primary text-primary-foreground",
                    !primary && active && "bg-secondary text-foreground",
                    !primary && !active && "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
                title={collapsed ? label : undefined}
            >
                <Icon className={cn("h-5 w-5 flex-shrink-0", primary && active && "text-primary-foreground")} />
                {!collapsed && <span>{label}</span>}
            </Link>
        )
    }

    return (
        <aside className={cn(
            "hidden md:flex flex-col flex-shrink-0 h-full border-r border-border bg-card/50 transition-all duration-200",
            collapsed ? "w-16" : "w-60"
        )}>
            {/* Logo */}
            <div className={cn(
                "flex items-center h-14 px-4 border-b border-border",
                collapsed ? "justify-center px-2" : "gap-2"
            )}>
                <span className="text-lg">💪</span>
                {!collapsed && <span className="font-bold text-foreground">GymBuddy</span>}
            </div>

            {/* Core nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                {coreItems.map(item => (
                    <NavItem key={item.href} {...item} />
                ))}

                {/* Divider */}
                <div className="my-3 border-t border-border" />

                {moreItems.map(item => (
                    <NavItem key={item.href} {...item} />
                ))}
            </nav>

            {/* Bottom section */}
            <div className="px-2 py-3 space-y-1 border-t border-border">
                {bottomItems.map(item => (
                    <NavItem key={item.href} {...item} />
                ))}

                {/* Collapse toggle */}
                <button
                    onClick={toggleCollapse}
                    className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors w-full",
                        "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                        collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? "展開側欄" : "收合側欄"}
                >
                    {collapsed
                        ? <PanelLeft className="h-5 w-5 flex-shrink-0" />
                        : <PanelLeftClose className="h-5 w-5 flex-shrink-0" />
                    }
                    {!collapsed && <span>收合側欄</span>}
                </button>
            </div>
        </aside>
    )
}
