import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { updateExerciseSummary, recomputePersonalRecords } from '@/lib/exercise-summary'
import { generateSessionFeedItems } from '@/lib/feed'
import { checkSessionBadges, updateChallengeProgress } from '@/lib/badges'
import { computeSessionDurationMin, summarizeSession } from '@/lib/session-logic'
import { badgesEarnedAround, loadPlanDefaults } from '@/lib/session-summary'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    let notes: string | undefined
    try {
        const body = await req.json()
        if (typeof body?.notes === 'string') notes = body.notes.slice(0, 2000)
    } catch {
        // body is optional
    }

    const session = await prisma.workoutSession.findUnique({
        where: { id: sessionId },
        include: {
            exercises: {
                include: {
                    exercise: true,
                    sets: { orderBy: { setNumber: 'asc' } },
                },
                orderBy: { orderIndex: 'asc' },
            },
        },
    })

    if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const planDefaults = await loadPlanDefaults(
        session.dayId,
        [...new Set(session.exercises.map(se => se.exerciseId))],
    )

    // Safe to re-run: an already completed session just returns its summary
    // rebuilt from the stored sets (no duplicate feed items / badges).
    if (session.completedAt) {
        const summary = summarizeSession(session.exercises, planDefaults, session.durationMin ?? 0)
        const newBadges = await badgesEarnedAround(user.id, session.completedAt)
        return NextResponse.json({ success: true, alreadyCompleted: true, ...summary, newBadges })
    }

    const setTimes = session.exercises.flatMap(se => se.sets.map(s => s.completedAt))
    if (setTimes.length === 0) {
        return NextResponse.json(
            { error: 'EMPTY_SESSION', message: '這次訓練沒有記錄任何一組，無法完成' },
            { status: 400 },
        )
    }

    const durationMin = computeSessionDurationMin(session.startedAt, setTimes)
    const summary = summarizeSession(session.exercises, planDefaults, durationMin)

    // Single conditional write: when two tabs complete at once only one wins,
    // and only the winner generates feed items / badges.
    const claim = await prisma.workoutSession.updateMany({
        where: { id: sessionId, userId: user.id, completedAt: null },
        data: { completedAt: new Date(), durationMin, notes },
    })
    if (claim.count === 0) {
        return NextResponse.json({ success: true, alreadyCompleted: true, ...summary, newBadges: [] })
    }

    // Everything below is derived data. A failure must not turn a completed
    // session into a 500: PRs/summaries are rebuilt from all sets on the next
    // completion (or any set edit), so they self-heal.
    const exerciseIds = [...new Set(
        session.exercises.filter(se => se.sets.length > 0).map(se => se.exerciseId),
    )]
    try {
        await Promise.all(exerciseIds.flatMap(eid => [
            recomputePersonalRecords(user.id, eid),
            updateExerciseSummary(user.id, eid),
        ]))
    } catch (e) {
        console.error('[complete] PR/summary rebuild failed', sessionId, e)
    }

    generateSessionFeedItems(user.id, sessionId, durationMin, summary.totalSets, summary.totalVolume)
        .catch(console.error)

    const [newBadges, challengeBadges] = await Promise.all([
        checkSessionBadges(user.id).catch(() => [] as string[]),
        updateChallengeProgress(user.id).catch(() => [] as string[]),
    ])

    return NextResponse.json({
        success: true,
        ...summary,
        newBadges: [...newBadges, ...challengeBadges],
    })
}
