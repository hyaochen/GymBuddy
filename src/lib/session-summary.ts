import prisma from '@/lib/prisma'

/** Plan defaults for the exercises of a session, keyed by exerciseId. */
export async function loadPlanDefaults(dayId: string | null, exerciseIds: string[]) {
    const result: Record<string, {
        defaultSets: number
        defaultRepsMin: number
        defaultRepsMax: number
        defaultWeightKg: number | null
    }> = {}
    if (!dayId || exerciseIds.length === 0) return result
    const planExercises = await prisma.workoutPlanExercise.findMany({
        where: { dayId, exerciseId: { in: exerciseIds } },
    })
    for (const pe of planExercises) {
        result[pe.exerciseId] = {
            defaultSets: pe.defaultSets,
            defaultRepsMin: pe.defaultRepsMin,
            defaultRepsMax: pe.defaultRepsMax,
            defaultWeightKg: pe.defaultWeightKg ? Number(pe.defaultWeightKg) : null,
        }
    }
    return result
}

/**
 * Badges earned around the moment a session was completed. Badges are not tied
 * to a session in the schema, so a rebuilt summary uses a short time window.
 */
export async function badgesEarnedAround(userId: string, completedAt: Date): Promise<string[]> {
    const rows = await prisma.userBadge.findMany({
        where: {
            userId,
            earnedAt: {
                gte: new Date(completedAt.getTime() - 5_000),
                lte: new Date(completedAt.getTime() + 2 * 60_000),
            },
        },
        select: { badgeKey: true },
    })
    return rows.map(r => r.badgeKey)
}
