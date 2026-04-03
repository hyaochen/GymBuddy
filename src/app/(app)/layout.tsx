import { requireAuth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import BottomNav from "@/components/layout/BottomNav"
import TopBar from "@/components/layout/TopBar"
import AIFloatingButton from "@/components/layout/AIFloatingButton"
import DesktopSidebar from "@/components/layout/DesktopSidebar"

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await requireAuth()
    const profile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
        select: { avatarUrl: true },
    })

    return (
        <div className="flex h-[100dvh] bg-background text-foreground">
            {/* Desktop sidebar */}
            <DesktopSidebar userName={user.name} avatarUrl={profile?.avatarUrl || null} />

            {/* Main content area */}
            <div className="flex flex-col flex-1 min-w-0">
                {/* Top bar */}
                <TopBar userName={user.name} avatarUrl={profile?.avatarUrl || null} />

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 max-w-2xl mx-auto w-full">
                    {children}
                </main>

                {/* Mobile bottom nav */}
                <BottomNav />

                {/* Mobile AI floating button */}
                <AIFloatingButton />
            </div>
        </div>
    )
}
