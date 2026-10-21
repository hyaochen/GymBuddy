import prisma from '@/lib/prisma'

export type TemplateDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

const DIFFICULTIES = new Set<TemplateDifficulty>(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])

export function toDifficulty(value: unknown): TemplateDifficulty {
    return DIFFICULTIES.has(value as TemplateDifficulty) ? value as TemplateDifficulty : 'INTERMEDIATE'
}

/**
 * 把使用者的計畫分享為社群模板。
 * schema 沒有「來源計畫」欄位，所以以「同作者 + 同名稱」判定為同一份：
 * 已存在就更新內容（保留讚數/下載數，並重新公開），不再新增重複模板。
 */
export async function sharePlanAsTemplate(opts: {
    userId: string
    planId: string
    name?: string
    description?: string | null
    difficulty?: unknown
    targetMuscles?: string[]
}): Promise<
    | { ok: true; created: boolean; template: { id: string } }
    | { ok: false; status: number; error: string }
> {
    const plan = await prisma.workoutPlan.findUnique({
        where: { id: opts.planId },
        include: {
            days: {
                include: {
                    exercises: {
                        include: {
                            exercise: {
                                include: {
                                    muscles: {
                                        include: { muscleGroup: true },
                                        where: { isPrimary: true },
                                    },
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

    if (!plan || plan.userId !== opts.userId) {
        return { ok: false, status: 404, error: '計畫不存在' }
    }

    // days JSON：限時動作帶 durationMin/durationMax，匯入時還原
    const days = plan.days.map(day => ({
        dayName: day.dayName,
        exercises: day.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exercise.name,
            sets: ex.defaultSets,
            repsMin: ex.defaultRepsMin,
            repsMax: ex.defaultRepsMax,
            weightKg: ex.defaultWeightKg ? Number(ex.defaultWeightKg) : null,
            durationMin: ex.defaultDurationMin,
            durationMax: ex.defaultDurationMax,
            restSeconds: ex.restSeconds,
        })),
    }))

    const muscleSet = new Set<string>()
    plan.days.forEach(day =>
        day.exercises.forEach(ex =>
            ex.exercise.muscles.forEach(m => muscleSet.add(m.muscleGroup.name))
        )
    )

    const name = (opts.name ?? '').trim() || plan.name
    const data = {
        description: (opts.description ?? '').trim() || plan.description,
        daysPerWeek: plan.daysPerWeek,
        difficulty: toDifficulty(opts.difficulty),
        targetMuscles: JSON.stringify(opts.targetMuscles ?? Array.from(muscleSet)),
        days: JSON.stringify(days),
        isPublic: true,
    }

    const existing = await prisma.sharedTemplate.findFirst({
        where: { creatorId: opts.userId, name },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
    })
    if (existing) {
        const template = await prisma.sharedTemplate.update({
            where: { id: existing.id },
            data: { name, ...data },
            select: { id: true },
        })
        return { ok: true, created: false, template }
    }

    const template = await prisma.sharedTemplate.create({
        data: { creatorId: opts.userId, name, ...data },
        select: { id: true },
    })
    return { ok: true, created: true, template }
}
