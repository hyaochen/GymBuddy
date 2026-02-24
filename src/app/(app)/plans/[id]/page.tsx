import { notFound } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { ChevronLeft, Play, Pencil } from "lucide-react"
import StartSessionButton from "./StartSessionButton"

export default async function PlanDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const user = await requireAuth()
    const { id } = await params

    const plan = await prisma.workoutPlan.findUnique({
        where: { id },
        include: {
            days: {
                include: {
                    exercises: {
                        include: {
                            exercise: {
                                include: {
                                    muscles: { include: { muscleGroup: true }, where: { isPrimary: true } },
                                },
                            },
                        },
                        orderBy: { orderIndex: 'asc' },
                    },
                },
                orderBy: { orderIndex: 'asc' },
            },
        },
    })

    if (!plan || plan.userId !== user.id) notFound()

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <Link href="/plans" className="text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-lg font-bold flex-1">{plan.name}</h1>
                <Link href={`/plans/${plan.id}/edit`} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                </Link>
            </div>

            {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{plan.daysPerWeek} 天/週</span>
                <span>{plan.days.length} 個訓練日</span>
            </div>

            {/* Days */}
            <div className="space-y-4">
                {plan.days.map(day => (
                    <div key={day.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">{day.dayName}</h2>
                            <StartSessionButton planId={plan.id} dayId={day.id} dayName={day.dayName} />
                        </div>

                        {day.exercises.length === 0 ? (
                            <p className="text-sm text-muted-foreground">尚未新增動作</p>
                        ) : (
                            <div className="space-y-2">
                                {day.exercises.map((pe, idx) => {
                                    const primaryMuscle = pe.exercise.muscles[0]
                                    return (
                                        <div key={pe.id} className="flex items-center gap-3 py-1">
                                            <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}.</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium leading-snug truncate">
                                                    {pe.exercise.name.split(' / ')[1] || pe.exercise.name.split(' ')[0]}
                                                </p>
                                                {primaryMuscle && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {primaryMuscle.muscleGroup.name.split(' ')[0]}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">
                                                    {pe.defaultSets} 組 × {pe.defaultRepsMin}-{pe.defaultRepsMax} 下
                                                </p>
                                                {pe.defaultWeightKg && (
                                                    <p className="text-xs text-primary">{Number(pe.defaultWeightKg)}kg</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
