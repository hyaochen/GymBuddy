import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const challenge = await prisma.challenge.findUnique({
        where: { id },
        include: {
            creator: { select: { id: true, name: true } },
            exercise: { select: { id: true, name: true } },
            participants: {
                include: {
                    user: { select: { id: true, name: true } },
                },
                orderBy: { currentValue: 'desc' },
            },
        },
    })

    if (!challenge) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const now = new Date()
    const totalMs = challenge.endDate.getTime() - challenge.startDate.getTime()
    const elapsedMs = now.getTime() - challenge.startDate.getTime()
    const timeProgress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100))

    return NextResponse.json({
        ...challenge,
        isJoined: challenge.participants.some(p => p.user.id === user.id),
        myProgress: challenge.participants.find(p => p.user.id === user.id) || null,
        timeProgress,
        isActive: now >= challenge.startDate && now <= challenge.endDate,
        isEnded: now > challenge.endDate,
    })
}
