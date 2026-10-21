import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { parseRouteId } from '@/lib/validation'
import { summarizeSession } from '@/lib/session-logic'
import { badgesEarnedAround, loadPlanDefaults } from '@/lib/session-summary'

// GET /api/sessions/[id]/summary
// Rebuilds the post-workout summary of a COMPLETED session from stored sets, so
// the summary page still works after a refresh / PWA restart (no sessionStorage).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const sessionId = parseRouteId(id)
    if (!sessionId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const session = await prisma.workoutSession.findUnique({
        where: { id: sessionId },
        include: {
            exercises: {
                include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
                orderBy: { orderIndex: 'asc' },
            },
        },
    })
    if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!session.completedAt) {
        return NextResponse.json({ error: 'Session not completed' }, { status: 409 })
    }

    const planDefaults = await loadPlanDefaults(
        session.dayId,
        [...new Set(session.exercises.map(se => se.exerciseId))],
    )
    const summary = summarizeSession(session.exercises, planDefaults, session.durationMin ?? 0)
    const newBadges = await badgesEarnedAround(user.id, session.completedAt)
    return NextResponse.json({ ...summary, newBadges })
}
