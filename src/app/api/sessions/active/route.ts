import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/sessions/active?dayId=xxx
// Returns the most recent incomplete session for this plan day (if any)
export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ sessionId: null }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const dayId = searchParams.get('dayId')
    if (!dayId) return NextResponse.json({ sessionId: null })

    const session = await prisma.workoutSession.findFirst({
        where: {
            userId: user.id,
            dayId,
            completedAt: null,
            exercises: { some: { sets: { some: {} } } }, // has at least 1 logged set
        },
        orderBy: { startedAt: 'desc' },
        select: { id: true, startedAt: true },
    })

    return NextResponse.json({ sessionId: session?.id ?? null, startedAt: session?.startedAt ?? null })
}
