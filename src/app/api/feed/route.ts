import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getFriendIds } from '@/lib/friends'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const cursor = req.nextUrl.searchParams.get('cursor')
    const limit = 20

    const friendIds = await getFriendIds(user.id)

    // Get feed: own items (all) + friends' public items
    const items = await prisma.activityFeedItem.findMany({
        where: {
            OR: [
                { userId: user.id },
                { userId: { in: friendIds }, isPublic: true },
            ],
            ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        },
        include: {
            user: { select: { id: true, name: true } },
            kudos: {
                select: {
                    id: true,
                    userId: true,
                    emoji: true,
                    user: { select: { name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
    })

    const hasMore = items.length > limit
    const feedItems = items.slice(0, limit).map(item => ({
        id: item.id,
        userId: item.user.id,
        userName: item.user.name,
        type: item.type,
        data: item.data ? JSON.parse(item.data) : null,
        isPublic: item.isPublic,
        isOwn: item.userId === user.id,
        createdAt: item.createdAt.toISOString(),
        kudos: item.kudos.map(k => ({
            id: k.id,
            userId: k.userId,
            emoji: k.emoji,
            userName: k.user.name,
        })),
        hasKudoed: item.kudos.some(k => k.userId === user.id),
        myKudoEmoji: item.kudos.find(k => k.userId === user.id)?.emoji || null,
        kudoCount: item.kudos.length,
    }))

    return NextResponse.json({
        items: feedItems,
        nextCursor: hasMore ? feedItems[feedItems.length - 1].createdAt : null,
    })
}
