import prisma from '@/lib/prisma'
import { getStreakInfo, STREAK_MILESTONES } from '@/lib/streak'
import { sendPushToMany } from '@/lib/push-scheduler'
import { getFriendIds } from '@/lib/friends'
import { exName } from '@/lib/utils'
import { filterNotifiable, getPrivacyMap } from '@/lib/social-privacy'

interface PRRow {
    id: string
    exerciseId: string
    estimated1rm: unknown
    achievedAt: Date
}

/**
 * Pick the PRs that belong to one session: achievedAt is the completion time of
 * the set that set the record, so it falls inside [startedAt, completedAt].
 * Several PRs on the same exercise in one session collapse to the best one.
 */
export function selectSessionPRs<T extends PRRow>(prs: T[], windowStart: Date, windowEnd: Date): T[] {
    const best = new Map<string, T>()
    for (const pr of prs) {
        const t = pr.achievedAt.getTime()
        if (t < windowStart.getTime() || t > windowEnd.getTime()) continue
        const cur = best.get(pr.exerciseId)
        if (!cur || Number(pr.estimated1rm) > Number(cur.estimated1rm)) best.set(pr.exerciseId, pr)
    }
    return [...best.values()]
}

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

    // 2. PR_ACHIEVED — PRs whose record-setting set belongs to this session.
    const windowStart = session.startedAt
    const windowEnd = session.completedAt ?? new Date()
    const sessionPRs = await prisma.personalRecord.findMany({
        where: { userId, achievedAt: { gte: windowStart, lte: windowEnd } },
        include: { exercise: { select: { name: true } } },
    })
    // Guard against double generation for the same session (e.g. a retried complete call).
    const alreadyGenerated = await prisma.activityFeedItem.findFirst({
        where: {
            userId,
            type: 'PR_ACHIEVED',
            data: { contains: `"sessionId":"${sessionId}"` },
        },
        select: { id: true },
    })

    if (!alreadyGenerated) {
        for (const pr of selectSessionPRs(sessionPRs, windowStart, windowEnd)) {
            await prisma.activityFeedItem.create({
                data: {
                    userId,
                    type: 'PR_ACHIEVED',
                    data: JSON.stringify({
                        sessionId,
                        exerciseName: exName(pr.exercise.name),
                        weightKg: Number(pr.weightKg),
                        reps: pr.reps,
                        estimated1rm: Number(pr.estimated1rm),
                    }),
                    isPublic: false, // PRs private by default
                },
            })
        }
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
    // The owner hid their workouts: friends get neither the feed item nor a push.
    const privacy = (await getPrivacyMap([userId])).get(userId)
    if (privacy && !privacy.showWorkouts) return

    const friendIds = await filterNotifiable(await getFriendIds(userId))
    if (friendIds.length === 0) return

    // Get user display name
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, profile: { select: { displayName: true } } },
    })
    const displayName = user?.profile?.displayName || user?.name || '好友'

    const planInfo = session.plan?.name ? ` — ${session.plan.name}` : ''
    const title = `${displayName} 完成了訓練！`
    const body = `${totalSets} 組・${durationMin} 分鐘${planInfo}`

    sendPushToMany(friendIds, title, body, 'social-feed').catch(console.error)
}
