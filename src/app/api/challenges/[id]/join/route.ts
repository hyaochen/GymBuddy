import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkSocialBadge, syncParticipantProgress } from '@/lib/badges'
import { visibleChallengeWhere } from '@/lib/challenges'
import { parseRouteId } from '@/lib/validation'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const challengeId = parseRouteId(id)
    if (!challengeId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const challenge = await prisma.challenge.findFirst({
        where: {
            id: challengeId,
            ...(await visibleChallengeWhere(user.id)),
        },
    })
    if (!challenge) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const now = new Date()
    if (now > challenge.endDate) {
        return NextResponse.json({ error: '挑戰已結束' }, { status: 400 })
    }

    // Check if already joined
    const existing = await prisma.challengeParticipant.findUnique({
        where: { challengeId_userId: { challengeId, userId: user.id } },
    })
    if (existing) {
        return NextResponse.json({ error: '你已經加入了這個挑戰' }, { status: 400 })
    }

    const participant = await prisma.challengeParticipant.create({
        data: { challengeId, userId: user.id },
    })

    // Count what the user already trained inside the challenge window.
    await syncParticipantProgress(participant, challenge).catch(console.error)

    // Badge: first challenge joined
    const badge = await checkSocialBadge(user.id, 'challenge_joined')

    return NextResponse.json({ participant, newBadge: badge })
}
