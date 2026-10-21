import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkSocialBadge } from '@/lib/badges'
import { sendPushNow } from '@/lib/push-scheduler'
import { canNotify } from '@/lib/social-privacy'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { friendshipId?: unknown; action?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: '請求內容格式錯誤' }, { status: 400 })
    }
    const { friendshipId, action } = body
    if (typeof friendshipId !== 'string' || typeof action !== 'string' || !friendshipId || !['accept', 'reject'].includes(action)) {
        return NextResponse.json({ error: '無效的參數' }, { status: 400 })
    }

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
    if (!friendship || friendship.receiverId !== user.id) {
        return NextResponse.json({ error: '找不到該好友邀請' }, { status: 404 })
    }

    if (friendship.status !== 'PENDING') {
        return NextResponse.json({ error: '該邀請已被處理' }, { status: 400 })
    }

    if (action === 'accept') {
        await prisma.friendship.update({
            where: { id: friendshipId },
            data: { status: 'ACCEPTED' },
        })
        // Award badge to both users
        checkSocialBadge(user.id, 'friend_added').catch(console.error)
        checkSocialBadge(friendship.requesterId, 'friend_added').catch(console.error)

        // Notify the requester that their request was accepted
        if (await canNotify(friendship.requesterId)) {
            sendPushNow(friendship.requesterId, `${user.name} 接受了你的好友邀請`, '你們現在是好友了！', 'friend-accepted')
                .catch(console.error)
        }

        return NextResponse.json({ success: true, status: 'ACCEPTED' })
    } else {
        // Keep the row (as REJECTED) so the requester cannot immediately re-invite.
        await prisma.friendship.update({
            where: { id: friendshipId },
            data: { status: 'REJECTED', rejectedAt: new Date() },
        })
        return NextResponse.json({ success: true, status: 'REJECTED' })
    }
}
