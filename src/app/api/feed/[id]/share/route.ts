import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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

    return NextResponse.json({ success: true, isPublic: updated.isPublic })
}
