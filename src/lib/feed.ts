import prisma from '@/lib/prisma'
import { getStreakInfo, STREAK_MILESTONES } from '@/lib/streak'
import { sendPushToMany } from '@/lib/push-scheduler'
import { getFriendIds } from '@/lib/friends'
import { exName } from '@/lib/utils'

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

    // Skip feed item if session has no real training data (0 sets or no duration)
    if (totalSets === 0 || !durationMin || durationMin <= 0) return

    const exerciseNames = session.exercises.map(e => exName(e.exercise.name))

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
        const exerciseName = exName(pr.exercise.name)

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

    // 4. Notify friends via push
    await notifyFriendsOfActivity(userId, session, durationMin, totalSets, currentStreak)
}

/** Send push notifications to all accepted friends when a workout is completed */
async function notifyFriendsOfActivity(
    userId: string,
    session: { plan?: { name: string } | null; day?: { dayName: string } | null; exercises: Array<{ exercise: { name: string } }> },
    durationMin: number,
    totalSets: number,
    currentStreak: number,
) {
    const friendIds = await getFriendIds(userId)
    if (friendIds.length === 0) return

    // Get user display name
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, profile: { select: { displayName: true } } },
    })
    const displayName = user?.profile?.displayName || user?.name || '好友'

    const planInfo = session.plan?.name ? ` — ${session.plan.name}` : ''
    const title = `💪 ${displayName} 完成了訓練！`
    const body = `${totalSets} 組・${durationMin} 分鐘${planInfo}`

    sendPushToMany(friendIds, title, body, 'social-feed').catch(console.error)
}
