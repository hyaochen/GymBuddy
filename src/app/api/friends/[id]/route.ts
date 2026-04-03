import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const friendship = await prisma.friendship.findUnique({ where: { id } })
    if (!friendship) {
        return NextResponse.json({ error: '找不到該好友關係' }, { status: 404 })
    }

    if (friendship.requesterId !== user.id && friendship.receiverId !== user.id) {
        return NextResponse.json({ error: '無權限' }, { status: 403 })
    }

    await prisma.friendship.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
