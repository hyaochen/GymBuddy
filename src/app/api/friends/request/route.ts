import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { username } = await req.json()
    if (!username || typeof username !== 'string') {
        return NextResponse.json({ error: '請提供使用者名稱' }, { status: 400 })
    }

    if (username === user.name) {
        return NextResponse.json({ error: '不能加自己為好友' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { name: username } })
    if (!target) {
        return NextResponse.json({ error: '找不到該使用者' }, { status: 404 })
    }

    // Check existing friendship in either direction
    const existing = await prisma.friendship.findFirst({
        where: {
            OR: [
                { requesterId: user.id, receiverId: target.id },
                { requesterId: target.id, receiverId: user.id },
            ],
        },
    })

    if (existing) {
        if (existing.status === 'ACCEPTED') {
            return NextResponse.json({ error: '你們已經是好友了' }, { status: 400 })
        }
        if (existing.status === 'PENDING') {
            return NextResponse.json({ error: '已有待處理的好友邀請' }, { status: 400 })
        }
        if (existing.status === 'BLOCKED') {
            return NextResponse.json({ error: '無法發送好友邀請' }, { status: 400 })
        }
    }

    const friendship = await prisma.friendship.create({
        data: { requesterId: user.id, receiverId: target.id },
    })

    return NextResponse.json({ success: true, id: friendship.id })
}
