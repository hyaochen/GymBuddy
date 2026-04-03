import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { BADGE_DEFINITIONS } from '@/lib/badges'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const earned = await prisma.userBadge.findMany({
        where: { userId: user.id },
        orderBy: { earnedAt: 'desc' },
    })

    const earnedMap = new Map(earned.map(b => [b.badgeKey, b.earnedAt]))

    const badges = BADGE_DEFINITIONS.map(def => ({
        ...def,
        earned: earnedMap.has(def.key),
        earnedAt: earnedMap.get(def.key) || null,
    }))

    return NextResponse.json({
        badges,
        earnedCount: earned.length,
        totalCount: BADGE_DEFINITIONS.length,
    })
}
