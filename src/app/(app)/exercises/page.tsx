import Link from "next/link"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

const DIFFICULTY_LABELS: Record<string, string> = {
    BEGINNER: '初級',
    INTERMEDIATE: '中級',
    ADVANCED: '進階',
}

const DIFFICULTY_COLORS: Record<string, 'success' | 'default' | 'destructive'> = {
    BEGINNER: 'success',
    INTERMEDIATE: 'default',
    ADVANCED: 'destructive',
}

export default async function ExercisesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; muscle?: string; equipment?: string; difficulty?: string }>
}) {
    await requireAuth()
    const { q = '', muscle = '', equipment = '', difficulty = '' } = await searchParams

    const where: Record<string, unknown> = {}
    if (q) where.name = { contains: q, mode: 'insensitive' }
    if (muscle) where.muscles = { some: { muscleGroupId: muscle, isPrimary: true } }
    if (equipment) where.equipment = { some: { equipmentId: equipment } }
    if (difficulty) where.difficulty = difficulty

    const [exercises, muscleGroups, equipmentList] = await Promise.all([
        prisma.exercise.findMany({
            where,
            include: {
                muscles: { include: { muscleGroup: true }, orderBy: { isPrimary: 'desc' }, take: 3 },
                equipment: { include: { equipment: true }, take: 2 },
            },
            orderBy: { name: 'asc' },
        }),
        prisma.muscleGroup.findMany({ orderBy: [{ bodyRegion: 'asc' }, { name: 'asc' }] }),
        prisma.equipment.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    ])

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold">動作庫</h1>

            {/* Search & Filters */}
            <form method="GET" className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="搜尋動作..."
                        className="w-full h-11 pl-9 pr-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <select
                        name="difficulty"
                        defaultValue={difficulty}
                        className="h-10 px-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">難度</option>
                        <option value="BEGINNER">初級</option>
                        <option value="INTERMEDIATE">中級</option>
                        <option value="ADVANCED">進階</option>
                    </select>

                    <select
                        name="muscle"
                        defaultValue={muscle}
                        className="h-10 px-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">肌群</option>
                        {muscleGroups.map(mg => (
                            <option key={mg.id} value={mg.id}>{mg.name.split(' ')[0]}</option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                    >
                        搜尋
                    </button>
                </div>
            </form>

            {/* Exercise List */}
            <div className="text-sm text-muted-foreground">{exercises.length} 個動作</div>

            <div className="space-y-2">
                {exercises.map(exercise => {
                    const primaryMuscle = exercise.muscles.find(m => m.isPrimary)
                    return (
                        <Link
                            key={exercise.id}
                            href={`/exercises/${exercise.id}`}
                            className="block bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors active:scale-[0.99]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-foreground leading-snug">
                                        {exercise.name}
                                    </h3>
                                    {primaryMuscle && (
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {primaryMuscle.muscleGroup.name.split(' ')[0]}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant={DIFFICULTY_COLORS[exercise.difficulty] || 'default'}>
                                        {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                                    </Badge>
                                    {exercise.gifUrl && (
                                        <span className="text-xs text-muted-foreground">GIF</span>
                                    )}
                                </div>
                            </div>
                            {exercise.equipment.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {exercise.equipment.slice(0, 2).map(e => (
                                        <span key={e.equipmentId} className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                            {e.equipment.name.split(' / ')[0]}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Link>
                    )
                })}
            </div>

            {exercises.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-2">🔍</div>
                    <p>找不到符合條件的動作</p>
                </div>
            )}
        </div>
    )
}
