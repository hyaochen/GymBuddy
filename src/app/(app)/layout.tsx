import { requireAuth } from "@/lib/auth"
import BottomNav from "@/components/layout/BottomNav"
import { logout } from "@/app/actions/auth"

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await requireAuth()

    return (
        <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
                <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💪</span>
                        <span className="font-bold text-foreground">GymBuddy</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
                        <form action={logout}>
                            <button
                                type="submit"
                                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border transition-colors"
                            >
                                登出
                            </button>
                        </form>
                    </div>
                </div>
            </header>
            <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
                {children}
            </main>
            <BottomNav />
        </div>
    )
}
