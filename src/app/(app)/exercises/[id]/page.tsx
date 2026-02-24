import { notFound } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Video } from "lucide-react"
import EquipmentImageDialog from "@/components/exercises/EquipmentImageDialog"

const DIFFICULTY_LABELS: Record<string, string> = {
    BEGINNER: '初級',
    INTERMEDIATE: '中級',
    ADVANCED: '進階',
}

const TYPE_LABELS: Record<string, string> = {
    COMPOUND: '複合動作',
    ISOLATION: '孤立動作',
    CARDIO: '有氧',
    STRETCH: '伸展',
}

export default async function ExerciseDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    await requireAuth()
    const { id } = await params

    const exercise = await prisma.exercise.findUnique({
        where: { id },
        include: {
            muscles: { include: { muscleGroup: true }, orderBy: { isPrimary: 'desc' } },
            equipment: { include: { equipment: true } },
            alternatives: {
                include: {
                    alternative: {
                        include: {
                            muscles: { include: { muscleGroup: true }, where: { isPrimary: true } },
                            equipment: { include: { equipment: true }, take: 1 },
                        },
                    },
                },
            },
        },
    })

    if (!exercise) notFound()

    const steps = Array.isArray(exercise.stepInstructions) ? exercise.stepInstructions as string[] : []
    const primaryMuscles = exercise.muscles.filter(m => m.isPrimary)
    const secondaryMuscles = exercise.muscles.filter(m => !m.isPrimary)

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/exercises" className="text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-lg font-bold flex-1 leading-tight">{exercise.name}</h1>
            </div>

            {/* GIF */}
            {exercise.gifUrl ? (
                <div className="rounded-xl overflow-hidden bg-card border border-border">
                    <img
                        src={exercise.gifUrl}
                        alt={exercise.name}
                        className="w-full max-h-52 object-contain"
                    />
                </div>
            ) : (
                <div className="rounded-xl bg-card border border-border h-36 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <div className="text-3xl mb-1">🏋️</div>
                        <p className="text-sm">無示範圖片</p>
                    </div>
                </div>
            )}

            {/* YouTube Link */}
            {exercise.videoUrl && (
                <a
                    href={exercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                    <Video className="h-4 w-4" />
                    觀看教學影片
                </a>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}</Badge>
                <Badge variant="outline">{TYPE_LABELS[exercise.exerciseType] || exercise.exerciseType}</Badge>
            </div>

            {/* Description */}
            {exercise.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{exercise.description}</p>
            )}

            {/* Muscles */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">訓練肌群</h2>
                {primaryMuscles.length > 0 && (
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">主要</p>
                        <div className="flex flex-wrap gap-1.5">
                            {primaryMuscles.map(m => (
                                <Badge key={m.muscleGroupId}>{m.muscleGroup.name.split(' ')[0]}</Badge>
                            ))}
                        </div>
                    </div>
                )}
                {secondaryMuscles.length > 0 && (
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">輔助</p>
                        <div className="flex flex-wrap gap-1.5">
                            {secondaryMuscles.map(m => (
                                <Badge key={m.muscleGroupId} variant="outline">{m.muscleGroup.name.split(' ')[0]}</Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Equipment — clickable to show image */}
            {exercise.equipment.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-4">
                    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                        所需器材 <span className="normal-case font-normal text-xs">（點擊查看）</span>
                    </h2>
                    <EquipmentImageDialog
                        equipment={exercise.equipment.map(e => ({
                            id: e.equipmentId,
                            name: e.equipment.name,
                            description: e.equipment.description,
                            imageUrl: e.equipment.imageUrl,
                        }))}
                    />
                </div>
            )}

            {/* Steps */}
            {steps.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-4">
                    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">動作步驟</h2>
                    <ol className="space-y-3">
                        {steps.map((step, idx) => (
                            <li key={idx} className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                                    {idx + 1}
                                </span>
                                <p className="text-sm text-foreground leading-relaxed pt-0.5">{step}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {/* Alternatives */}
            {exercise.alternatives.length > 0 && (
                <div className="space-y-2">
                    <h2 className="font-semibold">替代動作</h2>
                    <p className="text-sm text-muted-foreground">器材被佔用時可改用以下動作：</p>
                    <div className="space-y-2">
                        {exercise.alternatives.map(alt => {
                            const primaryMuscle = alt.alternative.muscles[0]
                            return (
                                <Link
                                    key={alt.alternativeExerciseId}
                                    href={`/exercises/${alt.alternativeExerciseId}`}
                                    className="flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:border-primary/50 transition-colors"
                                >
                                    {alt.alternative.gifUrl ? (
                                        <img src={alt.alternative.gifUrl} alt="" className="w-12 h-12 object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center text-xl">🏋️</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{alt.alternative.name}</p>
                                        {primaryMuscle && (
                                            <p className="text-xs text-muted-foreground">{primaryMuscle.muscleGroup.name.split(' ')[0]}</p>
                                        )}
                                    </div>
                                    <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
