import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getStreakInfo } from '@/lib/streak'
import { BADGE_MAP } from '@/lib/badges'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { username: rawUsername } = await params
    const username = decodeURIComponent(rawUsername)
    const target = await prisma.user.findUnique({
        where: { name: username },
        select: { id: true, name: true, createdAt: true },
    })

    if (!target) {
        return NextResponse.json({ error: '找不到該使用者' }, { status: 404 })
    }

    const friendship = await prisma.friendship.findFirst({
        where: {
            status: 'ACCEPTED',
            OR: [
                { requesterId: user.id, receiverId: target.id },
                { requesterId: target.id, receiverId: user.id },
            ],
        },
    })

    const isFriend = !!friendship
    const isSelf = target.id === user.id

    const profile = await prisma.userProfile.findUnique({ where: { userId: target.id } })

    const result: Record<string, unknown> = {
        name: target.name,
        displayName: profile?.displayName || null,
        bio: profile?.bio || null,
        avatarUrl: profile?.avatarUrl || null,
        isFriend,
        isSelf,
        memberSince: target.createdAt,
        publicAnalytics: profile?.publicAnalytics ?? false,
    }

    // Show stats if: self, OR (friend AND publicAnalytics === true)
    const canViewAnalytics = isSelf || (isFriend && profile?.publicAnalytics === true)
    if (canViewAnalytics) {
        const [streakInfo, totalSessions, totalPRs] = await Promise.all([
            getStreakInfo(target.id),
            prisma.workoutSession.count({
                where: { userId: target.id, completedAt: { not: null } },
            }),
            prisma.personalRecord.count({
                where: { userId: target.id },
            }),
        ])

        if (profile?.showStreak !== false) {
            result.currentStreak = streakInfo.currentStreak
            result.longestStreak = streakInfo.longestStreak
        }
        if (profile?.showWorkouts !== false) {
            result.totalSessions = totalSessions
        }
        if (profile?.showPRs !== false) {
            result.totalPRs = totalPRs
        }
    }

    // Recent feed items (if friend or self)
    if (isFriend || isSelf) {
        const recentFeed = await prisma.activityFeedItem.findMany({
            where: {
                userId: target.id,
                ...(isSelf ? {} : { isPublic: true }),
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        })
        result.recentFeed = recentFeed.map(f => ({
            id: f.id,
            type: f.type,
            data: JSON.parse(f.data ?? '{}'),
            isPublic: f.isPublic,
            createdAt: f.createdAt,
        }))
    }

    // Badges
    const badges = await prisma.userBadge.findMany({
        where: { userId: target.id },
        orderBy: { earnedAt: 'desc' },
    })
    result.badges = badges.map(b => ({
        name: BADGE_MAP.get(b.badgeKey)?.name ?? b.badgeKey,
        description: BADGE_MAP.get(b.badgeKey)?.description ?? '',
        icon: BADGE_MAP.get(b.badgeKey)?.icon ?? '',
        category: BADGE_MAP.get(b.badgeKey)?.category ?? 'milestone',
        earnedAt: b.earnedAt,
    }))

    return NextResponse.json(result)
}
