import prisma from '@/lib/prisma'
import { getStreakInfo, STREAK_MILESTONES } from '@/lib/streak'

/**
 * Auto-generate feed items after session completion.
 */
export async function generateSessionFeedItems(
    userId: string,
    sessionId: string,
    durationMin: number,
    totalSets: number,
    totalVolume: number,
) {
    // 1. WORKOUT_COMPLETED
    const session = await prisma.workoutSession.findUnique({
        where: { id: sessionId },
        include: {
            plan: { select: { name: true } },
            day: { select: { dayName: true } },
            exercises: {
                include: { exercise: { select: { name: true } }, sets: true },
            },
        },
    })

    if (!session) return

    const exerciseNames = session.exercises.map(e => {
        const name = e.exercise.name
        return name.includes(' / ') ? name.split(' / ')[1] : name
    })

    await prisma.activityFeedItem.create({
        data: {
            userId,
            type: 'WORKOUT_COMPLETED',
            data: JSON.stringify({
                planName: session.plan?.name || null,
                dayName: session.day?.dayName || null,
                durationMin,
                totalSets,
                totalVolume: Math.round(totalVolume),
                exerciseCount: session.exercises.length,
                exercises: exerciseNames.slice(0, 5),
            }),
            isPublic: true, // Workout completions default public
        },
    })

    // 2. PR_ACHIEVED — check for PRs created around this session
    const recentPRs = await prisma.personalRecord.findMany({
        where: {
            userId,
            achievedAt: {
                gte: new Date(Date.now() - 5 * 60 * 1000), // within last 5 min
            },
        },
        include: { exercise: { select: { name: true } } },
    })

    for (const pr of recentPRs) {
        const exerciseName = pr.exercise.name.includes(' / ')
            ? pr.exercise.name.split(' / ')[1]
            : pr.exercise.name

        await prisma.activityFeedItem.create({
            data: {
                userId,
                type: 'PR_ACHIEVED',
                data: JSON.stringify({
                    exerciseName,
                    weightKg: Number(pr.weightKg),
                    reps: pr.reps,
                    estimated1rm: Number(pr.estimated1rm),
                }),
                isPublic: false, // PRs private by default
            },
        })
    }

    // 3. STREAK_MILESTONE
    const { currentStreak } = await getStreakInfo(userId)
    if (STREAK_MILESTONES.includes(currentStreak)) {
        // Check if we already created this milestone recently
        const existing = await prisma.activityFeedItem.findFirst({
            where: {
                userId,
                type: 'STREAK_MILESTONE',
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
        })
        if (!existing) {
            await prisma.activityFeedItem.create({
                data: {
                    userId,
                    type: 'STREAK_MILESTONE',
                    data: JSON.stringify({ streakDays: currentStreak }),
                    isPublic: true,
                },
            })
        }
    }
}
