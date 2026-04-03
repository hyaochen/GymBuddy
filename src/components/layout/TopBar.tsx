import Link from "next/link"
import Image from "next/image"
import { Settings } from "lucide-react"

interface TopBarProps {
    userName: string
    avatarUrl?: string | null
    pageTitle?: string
}

export default function TopBar({ userName, avatarUrl, pageTitle }: TopBarProps) {
    const initial = userName.charAt(0).toUpperCase()

    return (
        <header className="flex-shrink-0 z-40 border-b border-border bg-card/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full md:hidden">
                {/* Left: Avatar */}
                <Link
                    href="/profile"
                    className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary hover:bg-primary/30 transition-colors overflow-hidden relative"
                    aria-label="個人檔案"
                >
                    {avatarUrl ? (
                        <Image src={avatarUrl} alt="頭像" fill className="object-cover" unoptimized />
                    ) : (
                        initial
                    )}
                </Link>

                {/* Center: Page title */}
                <span className="font-bold text-foreground text-sm">
                    {pageTitle || "GymBuddy"}
                </span>

                {/* Right: Settings */}
                <Link
                    href="/settings"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5"
                    aria-label="設定"
                >
                    <Settings className="h-5 w-5" />
                </Link>
            </div>

            {/* Desktop top bar - simpler, since sidebar handles nav */}
            <div className="hidden md:flex items-center justify-between px-4 h-14 max-w-none mx-auto w-full">
                <div /> {/* spacer for sidebar offset */}
                <span className="font-bold text-foreground text-sm">
                    {pageTitle || "GymBuddy"}
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{userName}</span>
                    <Link
                        href="/settings"
                        className="text-muted-foreground hover:text-foreground transition-colors p-1.5"
                        aria-label="設定"
                    >
                        <Settings className="h-5 w-5" />
                    </Link>
                </div>
            </div>
        </header>
    )
}
