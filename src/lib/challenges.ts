import type { Prisma } from '@prisma/client'
import { getFriendIds } from '@/lib/friends'

/** Past challenges stay listed this long after they end. */
export const PAST_CHALLENGE_DAYS = 30

/**
 * Challenges a user may see: public ones, their own, ones they joined, and any
 * (including friends-only) challenge created by one of their friends.
 */
export async function visibleChallengeWhere(userId: string): Promise<Prisma.ChallengeWhereInput> {
    const friendIds = await getFriendIds(userId)
    return {
        OR: [
            { isPublic: true },
            { creatorId: userId },
            { participants: { some: { userId } } },
            ...(friendIds.length > 0 ? [{ creatorId: { in: friendIds } }] : []),
        ],
    }
}

export type ChallengeStatusFilter = 'active' | 'upcoming' | 'past' | 'visible' | 'all'

/** Time-window part of the challenge list query. `visible` = everything the UI lists. */
export function challengeStatusWhere(status: ChallengeStatusFilter, now: Date): Prisma.ChallengeWhereInput {
    const pastCutoff = new Date(now.getTime() - PAST_CHALLENGE_DAYS * 24 * 60 * 60 * 1000)
    switch (status) {
        case 'active':
            return { startDate: { lte: now }, endDate: { gte: now } }
        case 'upcoming':
            return { startDate: { gt: now } }
        case 'past':
            return { endDate: { lt: now, gte: pastCutoff } }
        case 'visible':
            return { endDate: { gte: pastCutoff } }
        default:
            return {}
    }
}
