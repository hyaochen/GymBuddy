import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * Resolve the target userId for analytics APIs.
 * If `targetUserId` query param is provided, checks friendship + publicAnalytics.
 * Returns { userId, error? }
 */
export async function resolveAnalyticsUser(request: Request): Promise<{ userId: string; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { userId: '', error: 'Unauthorized' }

    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('userId')

    if (!targetUserId || targetUserId === user.id) {
        return { userId: user.id }
    }

    // Check friendship
    const friendship = await prisma.friendship.findFirst({
        where: {
            status: 'ACCEPTED',
            OR: [
                { requesterId: user.id, receiverId: targetUserId },
                { requesterId: targetUserId, receiverId: user.id },
            ],
        },
    })
    if (!friendship) return { userId: '', error: '不是好友，無法查看' }

    // Check publicAnalytics
    const profile = await prisma.userProfile.findUnique({ where: { userId: targetUserId } })
    if (!profile?.publicAnalytics) return { userId: '', error: '對方未開啟公開訓練分析' }

    return { userId: targetUserId }
}
