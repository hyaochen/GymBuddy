import Link from 'next/link'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { Play, Trophy, TrendingUp, Calendar, Dumbbell, ClipboardList } from 'lucide-react'
import PasskeyPrompt from '@/components/PasskeyPrompt'

function formatRelativeDate(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

function formatWeight(w: unknown): string {
    const n = Number(w)
    return n % 1 === 0 ? String(n) : n.toFixed(1)
}

export default async function DashboardPage() {
    const user = await requireAuth()

    // Recent sessions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [recentSessions, prs, activePlans] = await Promise.all([
        prisma.workoutSession.findMany({
            where: { userId: user.id, completedAt: { not: null } },
            include: {
                plan: { select: { name: true } },
                day: { select: { dayName: true } },
                exercises: { include: { sets: true } },
            },
            orderBy: { startedAt: 'desc' },
            take: 5,
        }),
        prisma.personalRecord.findMany({
            where: { userId: user.id },
            include: { exercise: { select: { name: true } } },
            orderBy: { achievedAt: 'desc' },
            take: 5,
        }),
        prisma.workoutPlan.findMany({
            where: { userId: user.id, isActive: true },
            include: {
                days: {
                    include: { exercises: { select: { id: true } } },
                    orderBy: { orderIndex: 'asc' },
                },
            },
            orderBy: { updatedAt: 'desc' },
        }),
    ])

    const totalSessions = await prisma.workoutSession.count({
        where: { userId: user.id, completedAt: { not: null } },
    })

    const lastSession = recentSessions[0]
    const weekSessions = recentSessions.filter(s => new Date(s.startedAt) >= sevenDaysAgo)

    return (
        <div className="space-y-5">
            <PasskeyPrompt />

            {/* Welcome */}
            <div>
                <h1 className="text-xl font-bold">
                    嗨，{user.name.split(' ')[0]} 👋
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                    {lastSession
                        ? `上次訓練：${formatRelativeDate(new Date(lastSession.startedAt))}`
                        : '開始你的第一次訓練吧！'}
                </p>
            </div>

            {/* Quick start */}
            <Link
                href="/session"
                className="flex items-center justify-between w-full bg-primary text-primary-foreground rounded-2xl p-5 shadow-lg shadow-primary/20"
            >
                <div>
                    <p className="font-bold text-lg">開始訓練</p>
                    <p className="text-primary-foreground/80 text-sm mt-0.5">選擇計畫，立刻開始</p>
                </div>
                <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Play className="h-6 w-6 fill-current" />
                </div>
            </Link>

            {/* This week stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums">{weekSessions.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">本週訓練</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums">{totalSessions}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">總次數</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums">{activePlans.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">訓練計畫</p>
                </div>
            </div>

            {/* Active plans quick access */}
            {activePlans.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm">我的計畫</h2>
                        <Link href="/plans" className="text-xs text-primary">查看全部</Link>
                    </div>
                    {activePlans.map(plan => (
                        <div key={plan.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{plan.name}</p>
                                <Link href={`/plans/${plan.id}`} className="text-xs text-muted-foreground">
                                    編輯
                                </Link>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {plan.days.slice(0, 4).map(day => (
                                    <span
                                        key={day.id}
                                        className="text-xs bg-secondary text-secondary-foreground rounded-lg px-2 py-1"
                                    >
                                        {day.dayName} · {day.exercises.length} 動作
                                    </span>
                                ))}
                                {plan.days.length > 4 && (
                                    <span className="text-xs text-muted-foreground px-1 py-1">
                                        +{plan.days.length - 4} 天
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activePlans.length === 0 && (
                <div className="bg-card rounded-xl border border-dashed border-border p-6 text-center space-y-3">
                    <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto" />
                    <div>
                        <p className="font-medium text-sm">尚無訓練計畫</p>
                        <p className="text-xs text-muted-foreground mt-0.5">建立計畫後就可以按表操課</p>
                    </div>
                    <Link
                        href="/plans/create"
                        className="inline-flex items-center gap-1.5 text-sm text-primary font-medium"
                    >
                        建立計畫 →
                    </Link>
                </div>
            )}

            {/* Recent PRs */}
            {prs.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm flex items-center gap-1.5">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            個人最佳記錄
                        </h2>
                    </div>
                    <div className="space-y-2">
                        {prs.map(pr => {
                            const name = pr.exercise.name.includes(' / ')
                                ? pr.exercise.name.split(' / ')[1]
                                : pr.exercise.name
                            return (
                                <div key={pr.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatRelativeDate(new Date(pr.achievedAt))}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-primary">
                                            {formatWeight(pr.weightKg)} kg × {pr.reps}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            1RM ≈ {Number(pr.estimated1rm).toFixed(1)} kg
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            近期訓練
                        </h2>
                        <Link href="/history" className="text-xs text-primary">查看全部</Link>
                    </div>
                    <div className="space-y-2">
                        {recentSessions.slice(0, 3).map(sess => {
                            const totalSets = sess.exercises.reduce((s, e) => s + e.sets.length, 0)
                            const volume = Math.round(
                                sess.exercises.reduce((s, e) =>
                                    s + e.sets.reduce((s2, set) => s2 + Number(set.weightKg) * set.repsPerformed, 0), 0
                                )
                            )
                            return (
                                <div key={sess.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {sess.day?.dayName || sess.plan?.name || '訓練'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatRelativeDate(new Date(sess.startedAt))}
                                            {sess.durationMin && ` · ${sess.durationMin} 分鐘`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">{totalSets} 組</p>
                                        {volume > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                {volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : volume} kg
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
