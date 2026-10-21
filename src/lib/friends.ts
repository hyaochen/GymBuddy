import prisma from '@/lib/prisma'

/**
 * Returns the IDs of users that are currently accepted friends of `userId`.
 * Friendship rows store the relationship in either direction (requester
 * or receiver), so we normalize to "the other side" in one pass.
 */
export async function getFriendIds(userId: string): Promise<string[]> {
    const friendships = await prisma.friendship.findMany({
        where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: userId }, { receiverId: userId }],
        },
        select: { requesterId: true, receiverId: true },
    })
    return friendships.map((f) =>
        f.requesterId === userId ? f.receiverId : f.requesterId
    )
}

/** After a rejection the requester has to wait this long before inviting the same person again. */
export const REJECT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/** Whole days (rounded up) left in the re-invite cool-down; 0 when it has passed or never started. */
export function rejectCooldownDaysLeft(rejectedAt: Date | null | undefined, now: Date = new Date()): number {
    if (!rejectedAt) return 0
    const remaining = rejectedAt.getTime() + REJECT_COOLDOWN_MS - now.getTime()
    return remaining > 0 ? Math.ceil(remaining / (24 * 60 * 60 * 1000)) : 0
}
