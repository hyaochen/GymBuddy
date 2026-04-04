import prisma from '@/lib/prisma'
import { getStreakInfo } from '@/lib/streak'

export interface BadgeDefinition {
    key: string
    name: string
    description: string
    icon: string
    category: 'milestone' | 'strength' | 'social'
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    // Milestone
    { key: 'first_workout', name: '初次訓練', description: '完成第一次訓練', icon: '🎯', category: 'milestone' },
    { key: 'sessions_10', name: '十場達成', description: '完成 10 次訓練', icon: '💪', category: 'milestone' },
    { key: 'sessions_50', name: '半百訓練', description: '完成 50 次訓練', icon: '💪', category: 'milestone' },
    { key: 'sessions_100', name: '百場俱樂部', description: '完成 100 次訓練', icon: '💪', category: 'milestone' },
    { key: 'sessions_500', name: '訓練狂人', description: '完成 500 次訓練', icon: '💪', category: 'milestone' },
    { key: 'streak_7', name: '一週不懈', description: '連續訓練 7 天', icon: '🔥', category: 'milestone' },
    { key: 'streak_14', name: '兩週不懈', description: '連續訓練 14 天', icon: '🔥', category: 'milestone' },
    { key: 'streak_30', name: '月度戰士', description: '連續訓練 30 天', icon: '🔥', category: 'milestone' },
    { key: 'streak_60', name: '鐵人意志', description: '連續訓練 60 天', icon: '🔥', category: 'milestone' },
    { key: 'streak_90', name: '傳說不休', description: '連續訓練 90 天', icon: '🔥', category: 'milestone' },
    // Strength
    { key: 'first_pr', name: '首次破紀錄', description: '第一次打破個人紀錄', icon: '🏅', category: 'strength' },
    { key: 'pr_count_10', name: 'PR 收藏家', description: '累計打破 10 次個人紀錄', icon: '🏆', category: 'strength' },
    { key: 'pr_count_50', name: 'PR 大師', description: '累計打破 50 次個人紀錄', icon: '🏆', category: 'strength' },
    { key: 'heavy_lifter', name: '重量級', description: '單次舉起超過 100kg', icon: '⚡', category: 'strength' },
    // Social
    { key: 'first_friend', name: '社交起步', description: '加第一個好友', icon: '🤝', category: 'social' },
    { key: 'first_kudos_given', name: '鼓勵家', description: '第一次給別人按讚', icon: '👏', category: 'social' },
    { key: 'first_kudos_received', name: '受人讚賞', description: '第一次被按讚', icon: '⭐', category: 'social' },
    { key: 'first_challenge', name: '挑戰新手', description: '參加第一個挑戰', icon: '🎪', category: 'social' },
    { key: 'challenge_winner', name: '挑戰達成', description: '完成一個挑戰', icon: '🥇', category: 'social' },
    { key: 'template_shared', name: '模板分享者', description: '分享第一個模板', icon: '📤', category: 'social' },
]

export const BADGE_MAP = new Map(BADGE_DEFINITIONS.map(b => [b.key, b]))

/**
 * Award a badge to a user if they don't already have it.
 * Returns the badge key if newly awarded, or null if already had it.
 */
async function awardBadge(userId: string, badgeKey: string): Promise<string | null> {
    try {
        await prisma.userBadge.create({
            data: { userId, badgeKey },
        })
        return badgeKey
    } catch {
        // @@unique constraint violation = already has badge
        return null
    }
}

/**
 * Check and award badges after a session is completed.
 */
export async function checkSessionBadges(userId: string): Promise<string[]> {
    const awarded: string[] = []

    const [totalSessions, streakInfo, prCount, maxWeight] = await Promise.all([
        prisma.workoutSession.count({
            where: { userId, completedAt: { not: null } },
        }),
        getStreakInfo(userId),
        prisma.personalRecord.count({ where: { userId } }),
        prisma.personalRecord.findFirst({
            where: { userId },
            orderBy: { weightKg: 'desc' },
            select: { weightKg: true },
        }),
    ])

    // Session milestones
    const sessionThresholds: [number, string][] = [
        [1, 'first_workout'],
        [10, 'sessions_10'],
        [50, 'sessions_50'],
        [100, 'sessions_100'],
        [500, 'sessions_500'],
    ]
    for (const [threshold, key] of sessionThresholds) {
        if (totalSessions >= threshold) {
            const r = await awardBadge(userId, key)
            if (r) awarded.push(r)
        }
    }

    // Streak milestones
    const streakThresholds: [number, string][] = [
        [7, 'streak_7'],
        [14, 'streak_14'],
        [30, 'streak_30'],
        [60, 'streak_60'],
        [90, 'streak_90'],
    ]
    for (const [threshold, key] of streakThresholds) {
        if (streakInfo.currentStreak >= threshold) {
            const r = await awardBadge(userId, key)
            if (r) awarded.push(r)
        }
    }

    // PR milestones
    if (prCount >= 1) {
        const r = await awardBadge(userId, 'first_pr')
        if (r) awarded.push(r)
    }
    if (prCount >= 10) {
        const r = await awardBadge(userId, 'pr_count_10')
        if (r) awarded.push(r)
    }
    if (prCount >= 50) {
        const r = await awardBadge(userId, 'pr_count_50')
        if (r) awarded.push(r)
    }

    // Heavy lifter
    if (maxWeight && Number(maxWeight.weightKg) >= 100) {
        const r = await awardBadge(userId, 'heavy_lifter')
        if (r) awarded.push(r)
    }

    return awarded
}

/**
 * Check social badges (friend added, kudos, etc.)
 */
export async function checkSocialBadge(userId: string, event: 'friend_added' | 'kudos_given' | 'kudos_received' | 'challenge_joined' | 'challenge_completed' | 'template_shared'): Promise<string | null> {
    const map: Record<string, string> = {
        friend_added: 'first_friend',
        kudos_given: 'first_kudos_given',
        kudos_received: 'first_kudos_received',
        challenge_joined: 'first_challenge',
        challenge_completed: 'challenge_winner',
        template_shared: 'template_shared',
    }
    const key = map[event]
    if (!key) return null
    return awardBadge(userId, key)
}

/**
 * Update challenge progress after session completion.
 */
export async function updateChallengeProgress(userId: string): Promise<string[]> {
    const awarded: string[] = []

    // Find all active challenges the user is participating in and hasn't completed
    const participations = await prisma.challengeParticipant.findMany({
        where: {
            userId,
            completed: false,
            challenge: {
                endDate: { gte: new Date() },
                startDate: { lte: new Date() },
            },
        },
        include: {
            challenge: true,
        },
    })

    for (const p of participations) {
        const challenge = p.challenge
        let currentValue = 0

        switch (challenge.type) {
            case 'STREAK': {
                const info = await getStreakInfo(userId)
                currentValue = info.currentStreak
                break
            }
            case 'TOTAL_SESSIONS': {
                currentValue = await prisma.workoutSession.count({
                    where: {
                        userId,
                        completedAt: { not: null },
                        startedAt: {
                            gte: challenge.startDate,
                            lte: challenge.endDate,
                        },
                    },
                })
                break
            }
            case 'WEIGHT_PR': {
                if (challenge.exerciseId) {
                    const pr = await prisma.personalRecord.findFirst({
                        where: {
                            userId,
                            exerciseId: challenge.exerciseId,
                            achievedAt: { gte: challenge.startDate },
                        },
                        orderBy: { weightKg: 'desc' },
                    })
                    currentValue = pr ? Number(pr.weightKg) : 0
                }
                break
            }
            case 'VOLUME': {
                const sessions = await prisma.workoutSession.findMany({
                    where: {
                        userId,
                        completedAt: { not: null },
                        startedAt: {
                            gte: challenge.startDate,
                            lte: challenge.endDate,
                        },
                    },
                    include: {
                        exercises: {
                            include: { sets: true },
                        },
                    },
                })
                currentValue = Math.round(
                    sessions.reduce((total, s) =>
                        total + s.exercises.reduce((eTotal, e) =>
                            eTotal + e.sets.reduce((sTotal, set) =>
                                sTotal + (set.durationSeconds ? 0 : Number(set.weightKg) * set.repsPerformed), 0
                            ), 0
                        ), 0
                    )
                )
                break
            }
        }

        const completed = currentValue >= challenge.targetValue

        await prisma.challengeParticipant.update({
            where: { id: p.id },
            data: {
                currentValue,
                completed,
                completedAt: completed && !p.completed ? new Date() : p.completedAt,
            },
        })

        if (completed && !p.completed) {
            const badge = await checkSocialBadge(userId, 'challenge_completed')
            if (badge) awarded.push(badge)
        }
    }

    return awarded
}
