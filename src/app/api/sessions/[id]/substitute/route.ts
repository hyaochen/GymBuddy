import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/sessions/[id]/substitute
// Body: { originalSessionExerciseId, newExerciseId }
// Creates a new sessionExercise for the substitute, linked to the original via substituteForId.
// Returns the new sessionExercise with full exercise details.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    const { originalSessionExerciseId, newExerciseId } = await req.json()

    // Verify session ownership
    const session = await prisma.workoutSession.findUnique({
        where: { id: sessionId },
        select: { userId: true },
    })
    if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Get original sessionExercise for orderIndex
    const original = await prisma.sessionExercise.findUnique({
        where: { id: originalSessionExerciseId },
        select: { orderIndex: true, exerciseId: true },
    })
    if (!original) {
        return NextResponse.json({ error: 'Original exercise not found' }, { status: 404 })
    }

    // Create new sessionExercise for the substitute
    const newSessionExercise = await prisma.sessionExercise.create({
        data: {
            sessionId,
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
