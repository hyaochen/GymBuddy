import Link from "next/link"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { Play, ClipboardList, RotateCcw } from "lucide-react"

function timeAgo(date: Date): string {
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} 分鐘前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小時前`
    const days = Math.floor(hours / 24)
    return `${days} 天前`
}

export default async function SessionStartPage() {
    const user = await requireAuth()

    // Incomplete sessions (has at least 1 logged set, not yet marked complete)
    const incompleteSessions = await prisma.workoutSession.findMany({
        where: {
            userId: user.id,
            completedAt: null,
            exercises: { some: { sets: { some: {} } } },
        },
        include: {
            plan: { select: { name: true } },
            day: { select: { dayName: true } },
            exercises: {
                include: { sets: { select: { id: true } } },
                orderBy: { orderIndex: 'asc' },
            },
        },
        orderBy: { startedAt: 'desc' },
        take: 5,
    })

    const plans = await prisma.workoutPlan.findMany({
        where: { userId: user.id, isActive: true },
        include: {
            days: {
                include: { exercises: { select: { id: true } } },
                orderBy: { orderIndex: 'asc' },
            },
        },
        orderBy: { updatedAt: 'desc' },
    })

    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold">開始訓練</h1>

            {/* ── Incomplete sessions — resume first ── */}
            {incompleteSessions.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-amber-400 uppercase tracking-wide px-1">
                        未完成的訓練
                    </p>
                    {incompleteSessions.map(session => {
                        const totalEx = session.exercises.length
                        const doneEx = session.exercises.filter(e => e.sets.length > 0).length
                        const label = session.day?.dayName ?? session.plan?.name ?? '自由訓練'

                        return (
                            <div
                                key={session.id}
                                className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{label}</p>
                                    {session.plan && (
                                        <p className="text-xs text-muted-foreground">{session.plan.name}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {doneEx} / {totalEx} 個動作 · {timeAgo(session.startedAt)}
                                    </p>
                                </div>
                                <Link
                                    href={`/session/${session.id}`}
                                    className="flex items-center gap-1.5 flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                                >
                                    <Play className="h-3.5 w-3.5" />
                                    繼續
                                </Link>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Plan selection ── */}
            {plans.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-5xl mb-3">📋</div>
                    <h2 className="font-semibold text-lg mb-2">先建立訓練計畫</h2>
                    <p className="text-muted-foreground text-sm mb-6">建立計畫後就可以按表操課</p>
                    <Link
                        href="/plans/create"
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium"
                    >
                        <ClipboardList className="h-4 w-4" />
                        建立計畫
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {incompleteSessions.length > 0 && (
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                            選擇計劃開始新訓練
                        </p>
                    )}
                    {plans.map(plan => (
                        <div key={plan.id} className="bg-card rounded-xl border border-border p-4">
                            <h2 className="font-semibold mb-3">{plan.name}</h2>
                            <div className="space-y-2">
                                {plan.days.map(day => (
                                    <Link
                                        key={day.id}
                                        href={`/plans/${plan.id}`}
                                        className="flex items-center justify-between w-full bg-secondary hover:bg-accent rounded-xl p-3 transition-colors"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{day.dayName}</p>
                                            <p className="text-xs text-muted-foreground">{day.exercises.length} 個動作</p>
                                        </div>
                                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
