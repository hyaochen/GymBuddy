import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendPushToMany } from '@/lib/push-scheduler'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const item = await prisma.activityFeedItem.findUnique({ where: { id } })
    if (!item || item.userId !== user.id) {
        return NextResponse.json({ error: '找不到該動態或無權限' }, { status: 404 })
    }

    const updated = await prisma.activityFeedItem.update({
        where: { id },
        data: { isPublic: !item.isPublic },
    })

    // If just made public, notify friends
    if (updated.isPublic) {
        notifyFriendsOfShare(user.id, user.name, item.type, item.data).catch(console.error)
    }

    return NextResponse.json({ success: true, isPublic: updated.isPublic })
}

async function notifyFriendsOfShare(userId: string, userName: string, type: string, data: string | null) {
    const friendships = await prisma.friendship.findMany({
        where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: userId }, { receiverId: userId }],
        },
        select: { requesterId: true, receiverId: true },
    })

    const friendIds = friendships.map(f =>
        f.requesterId === userId ? f.receiverId : f.requesterId
    )
    if (friendIds.length === 0) return

    const profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { displayName: true },
    })
    const displayName = profile?.displayName || userName

    let title = ''
    let body = ''

    if (type === 'PR_ACHIEVED' && data) {
        const parsed = JSON.parse(data)
        title = `🏆 ${displayName} 破了個人紀錄！`
        body = `${parsed.exerciseName} — ${parsed.weightKg}kg × ${parsed.reps} 下`
    } else if (type === 'STREAK_MILESTONE' && data) {
        const parsed = JSON.parse(data)
        title = `🔥 ${displayName} 達成連續訓練里程碑！`
        body = `已連續訓練 ${parsed.streakDays} 天`
    } else {
        title = `📣 ${displayName} 分享了新動態`
        body = '點擊查看'
    }

    sendPushToMany(friendIds, title, body, 'social-feed').catch(console.error)
}
