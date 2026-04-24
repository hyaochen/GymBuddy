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
