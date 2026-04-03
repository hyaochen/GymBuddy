import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkSocialBadge } from '@/lib/badges'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { friendshipId, action } = await req.json()
    if (!friendshipId || !['accept', 'reject'].includes(action)) {
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
        return NextResponse.json({ success: true, status: 'ACCEPTED' })
    } else {
        await prisma.friendship.delete({ where: { id: friendshipId } })
        return NextResponse.json({ success: true, status: 'REJECTED' })
    }
}
