import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getStreakInfo } from '@/lib/streak'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { username } = await params
    const target = await prisma.user.findUnique({
        where: { name: username },
        select: { id: true, name: true, createdAt: true },
    })

    if (!target) {
        return NextResponse.json({ error: '找不到該使用者' }, { status: 404 })
    }

    // Check if they're friends
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
        memberSince: target.createdAt,
    }

    // Only show stats if friend or self, respecting privacy settings
    if (isFriend || isSelf) {
        const [streakInfo, totalSessions] = await Promise.all([
            getStreakInfo(target.id),
            prisma.workoutSession.count({
                where: { userId: target.id, completedAt: { not: null } },
            }),
        ])

        if (profile?.showStreak !== false) {
            result.currentStreak = streakInfo.currentStreak
            result.longestStreak = streakInfo.longestStreak
        }
        if (profile?.showWorkouts !== false) {
            result.totalSessions = totalSessions
        }
    }

    return NextResponse.json(result)
}
