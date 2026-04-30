import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'
import { parseJsonBody, parseRouteId } from '@/lib/validation'

const substituteSchema = z.object({
    originalSessionExerciseId: z.string().min(8).max(64),
    newExerciseId: z.string().min(8).max(64),
})

// POST /api/sessions/[id]/substitute
// Body: { originalSessionExerciseId, newExerciseId }
// Creates a new sessionExercise for the substitute, linked to the original via substituteForId.
// Returns the new sessionExercise with full exercise details.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    const validSessionId = parseRouteId(sessionId)
    if (!validSessionId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const parsed = await parseJsonBody(req, substituteSchema)
    if ('response' in parsed) return parsed.response
    const { originalSessionExerciseId, newExerciseId } = parsed.data

    // Verify session ownership
    const session = await prisma.workoutSession.findUnique({
        where: { id: validSessionId },
        select: { userId: true, completedAt: true },
    })
    if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (session.completedAt) {
        return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    }

    // Get original sessionExercise for orderIndex
    const original = await prisma.sessionExercise.findFirst({
        where: { id: originalSessionExerciseId, sessionId: validSessionId },
        select: { orderIndex: true, exerciseId: true },
    })
    if (!original) {
        return NextResponse.json({ error: 'Original exercise not found' }, { status: 404 })
    }
    const replacement = await prisma.exercise.findUnique({
        where: { id: newExerciseId },
        select: { id: true },
    })
    if (!replacement) {
        return NextResponse.json({ error: 'Replacement exercise not found' }, { status: 404 })
    }

    // Create new sessionExercise for the substitute
    const newSessionExercise = await prisma.sessionExercise.create({
        data: {
            sessionId: validSessionId,
            exerciseId: newExerciseId,
            orderIndex: original.orderIndex,
            substituteForId: originalSessionExerciseId,
        },
        include: {
            exercise: {
                select: {
                    id: true,
                    name: true,
                    gifUrl: true,
                    stepInstructions: true,
                    muscles: { include: { muscleGroup: true }, orderBy: { isPrimary: 'desc' } },
                    equipment: { include: { equipment: true } },
                },
            },
            sets: true,
        },
    })

    return NextResponse.json({ sessionExercise: newSessionExercise })
}
