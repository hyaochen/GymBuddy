import Link from "next/link"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { Plus, ChevronRight, Dumbbell } from "lucide-react"
import CommunityTemplates from "@/components/CommunityTemplates"

export default async function PlansPage() {
    const user = await requireAuth()

    const plans = await prisma.workoutPlan.findMany({
        where: { userId: user.id, isActive: true },
        include: {
            days: {
                include: { exercises: { include: { exercise: true } } },
                orderBy: { orderIndex: 'asc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    })

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold">訓練計畫</h1>
                    <Link
                        href="/plans/create"
                        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
                    >
                        <Plus className="h-4 w-4" />
                        新增
                    </Link>
                </div>

                {plans.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-3">📋</div>
                        <h2 className="font-semibold text-lg mb-2">還沒有訓練計畫</h2>
                        <p className="text-muted-foreground text-sm mb-6">建立你的第一個計畫，開始有系統地訓練</p>
                        <Link
                            href="/plans/create"
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            建立計畫
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {plans.map(plan => {
                            const totalExercises = plan.days.reduce((sum, d) => sum + d.exercises.length, 0)
                            return (
                                <Link
                                    key={plan.id}
                                    href={`/plans/${plan.id}`}
                                    className="block bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors active:scale-[0.99]"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h2 className="font-semibold text-foreground">{plan.name}</h2>
                                            {plan.description && (
                                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{plan.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <span>{plan.days.length} 天</span>
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Dumbbell className="h-3 w-3" />
                                                    <span>{totalExercises} 個動作</span>
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    </div>

                                    {plan.days.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {plan.days.map(day => (
                                                <span key={day.id} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                                                    {day.dayName}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Community Templates Section */}
            <CommunityTemplates />
        </div>
    )
}
