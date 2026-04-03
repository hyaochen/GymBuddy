import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkSocialBadge } from '@/lib/badges'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: feedItemId } = await params
    const body = await req.json().catch(() => ({}))
    const emoji = body.emoji || '💪'

    const VALID_EMOJIS = ['💪', '🔥', '👏', '🏆', '⚡']
    if (!VALID_EMOJIS.includes(emoji)) {
        return NextResponse.json({ error: '無效的表情' }, { status: 400 })
    }

    // Verify feed item exists
    const feedItem = await prisma.activityFeedItem.findUnique({ where: { id: feedItemId } })
    if (!feedItem) {
        return NextResponse.json({ error: '找不到該動態' }, { status: 404 })
    }

    // Upsert kudo (update emoji if already exists)
    const kudo = await prisma.kudo.upsert({
        where: { userId_feedItemId: { userId: user.id, feedItemId } },
        create: { userId: user.id, feedItemId, emoji },
        update: { emoji },
    })

    // Award badges
    checkSocialBadge(user.id, 'kudos_given').catch(console.error)
    checkSocialBadge(feedItem.userId, 'kudos_received').catch(console.error)

    return NextResponse.json({ success: true, kudo })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: feedItemId } = await params

    await prisma.kudo.deleteMany({
        where: { userId: user.id, feedItemId },
    })

    return NextResponse.json({ success: true })
}
