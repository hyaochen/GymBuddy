import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { epley1rm } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    const body = await req.json()
    const { sessionExerciseId, setNumber, repsPerformed, weightKg, restAfterSeconds } = body

    if (!sessionExerciseId || !setNumber || repsPerformed === undefined || weightKg === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify session belongs to user
    const sessionExercise = await prisma.sessionExercise.findUnique({
        where: { id: sessionExerciseId },
        include: { session: { select: { userId: true } } },
    })

    if (!sessionExercise || sessionExercise.session.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const set = await prisma.sessionSet.create({
        data: {
            sessionExerciseId,
            setNumber,
            repsPerformed,
            weightKg,
            restAfterSeconds,
            completedAt: new Date(),
        },
    })

    // Check for personal record
    const estimated1rm = epley1rm(Number(weightKg), repsPerformed)
    const existingPR = await prisma.personalRecord.findFirst({
        where: { userId: user.id, exerciseId: sessionExercise.exerciseId },
        orderBy: { estimated1rm: 'desc' },
    })

    let isNewPR = false
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

    return NextResponse.json({ set, isNewPR }, { status: 201 })
}
