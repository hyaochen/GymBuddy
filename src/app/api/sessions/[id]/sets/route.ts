import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'
import { parseJsonBody, parseRouteId } from '@/lib/validation'

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
        include: { session: { select: { id: true, userId: true, completedAt: true } } },
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

    // Check for personal record (skip for time-based exercises — no weight-based PR)
    return NextResponse.json({ set, isNewPR: false }, { status: 201 })
}
