import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'
import { parseJsonBody, parseRouteId } from '@/lib/validation'
import { epley1rm } from '@/lib/utils'
import { isNewPersonalRecord } from '@/lib/session-logic'

const createSetSchema = z.object({
    sessionExerciseId: z.string().min(8).max(64),
    setNumber: z.coerce.number().int().positive().max(100),
    repsPerformed: z.coerce.number().int().positive().max(1000),
    weightKg: z.coerce.number().finite().min(0).max(9999.99),
    durationSeconds: z.coerce.number().int().positive().max(24 * 60 * 60).nullable().optional(),
    restAfterSeconds: z.coerce.number().int().min(0).max(24 * 60 * 60).nullable().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    const validSessionId = parseRouteId(sessionId)
    if (!validSessionId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const parsed = await parseJsonBody(req, createSetSchema)
    if ('response' in parsed) return parsed.response
    const { sessionExerciseId, setNumber, repsPerformed, weightKg, durationSeconds, restAfterSeconds } = parsed.data

    // Verify sessionExercise belongs to the session param, the session belongs
    // to the user, and the session is still active (not completed).
    const sessionExercise = await prisma.sessionExercise.findFirst({
        where: { id: sessionExerciseId, sessionId: validSessionId },
        include: {
            session: { select: { id: true, userId: true, completedAt: true } },
            exercise: { select: { isTimeBased: true } },
        },
    })

    if (
        !sessionExercise ||
        sessionExercise.session.id !== validSessionId ||
        sessionExercise.session.userId !== user.id
    ) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (sessionExercise.session.completedAt) {
        return NextResponse.json(
            { error: 'Session already completed' },
            { status: 409 }
        )
    }

    const set = await prisma.sessionSet.create({
        data: {
            sessionExerciseId,
            setNumber,
            repsPerformed,
            weightKg,
            durationSeconds: durationSeconds ?? null,
            restAfterSeconds,
            completedAt: new Date(),
        },
    })

    // Personal record: strictly above everything before this set — the best of
    // previously completed sessions plus earlier sets of this same session.
    // Time-based sets have no weight-based PR.
    const isTimeBased = sessionExercise.exercise.isTimeBased || durationSeconds != null
    let isNewPR = false
    if (!isTimeBased && weightKg > 0) {
        const [summary, earlierSets] = await Promise.all([
            prisma.userExerciseSummary.findUnique({
                where: { userId_exerciseId: { userId: user.id, exerciseId: sessionExercise.exerciseId } },
                select: { estimated1rm: true },
            }),
            prisma.sessionSet.findMany({
                where: {
                    sessionExercise: { sessionId: validSessionId, exerciseId: sessionExercise.exerciseId },
                    durationSeconds: null,
                    id: { not: set.id },
                },
                select: { weightKg: true, repsPerformed: true },
            }),
        ])
        const sessionBest1rm = earlierSets.reduce(
            (best, s) => Math.max(best, epley1rm(Number(s.weightKg), s.repsPerformed)),
            0,
        )
        isNewPR = isNewPersonalRecord({
            isTimeBased,
            weightKg,
            reps: repsPerformed,
            historicalBest1rm: summary ? Number(summary.estimated1rm) : null,
            sessionBest1rm,
        })
    }

    return NextResponse.json({ set, isNewPR }, { status: 201 })
}
