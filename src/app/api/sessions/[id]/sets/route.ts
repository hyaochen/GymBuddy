import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { epley1rm } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    const body = await req.json()
    const { sessionExerciseId, setNumber, repsPerformed, weightKg, durationSeconds, restAfterSeconds } = body

    if (!sessionExerciseId || !setNumber || repsPerformed === undefined || weightKg === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify sessionExercise belongs to the session param, the session belongs
    // to the user, and the session is still active (not completed).
    const sessionExercise = await prisma.sessionExercise.findUnique({
        where: { id: sessionExerciseId },
        include: { session: { select: { id: true, userId: true, completedAt: true } } },
    })

    if (
        !sessionExercise ||
        sessionExercise.session.id !== sessionId ||
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
    let isNewPR = false
    if (!durationSeconds) {
        const estimated1rm = epley1rm(Number(weightKg), repsPerformed)
        const existingPR = await prisma.personalRecord.findFirst({
            where: { userId: user.id, exerciseId: sessionExercise.exerciseId },
            orderBy: { estimated1rm: 'desc' },
        })

        if (!existingPR || estimated1rm > Number(existingPR.estimated1rm)) {
            await prisma.personalRecord.create({
                data: {
                    userId: user.id,
                    exerciseId: sessionExercise.exerciseId,
                    weightKg,
                    reps: repsPerformed,
                    estimated1rm,
                    achievedAt: new Date(),
                },
            })
            isNewPR = true
        }
    }

    return NextResponse.json({ set, isNewPR }, { status: 201 })
}
