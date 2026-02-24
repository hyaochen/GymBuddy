import Link from "next/link"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { Play, ClipboardList } from "lucide-react"

export default async function SessionStartPage() {
    const user = await requireAuth()

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
                    {plans.map(plan => (
                        <div key={plan.id} className="bg-card rounded-xl border border-border p-4">
                            <h2 className="font-semibold mb-3">{plan.name}</h2>
                            <div className="space-y-2">
                                {plan.days.map(day => (
                                    <StartDayButton
                                        key={day.id}
                                        planId={plan.id}
                                        dayId={day.id}
                                        dayName={day.dayName}
                                        exerciseCount={day.exercises.length}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function StartDayButton({
    planId,
    dayId,
    dayName,
    exerciseCount,
}: {
    planId: string
    dayId: string
    dayName: string
    exerciseCount: number
}) {
    return (
        <form action={async () => {
            "use server"
            // Redirect handled by client-side StartSessionButton in plan detail
        }}>
            <Link
                href={`/plans/${planId}`}
                className="flex items-center justify-between w-full bg-secondary hover:bg-accent rounded-xl p-3 transition-colors"
            >
                <div>
                    <p className="font-medium text-sm">{dayName}</p>
                    <p className="text-xs text-muted-foreground">{exerciseCount} 個動作</p>
                </div>
                <Play className="h-5 w-5 text-primary" />
            </Link>
        </form>
    )
}
