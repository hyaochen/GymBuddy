import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const session = await prisma.workoutSession.findUnique({
        where: { id },
        include: {
            plan: { select: { id: true, name: true } },
            day: { select: { id: true, dayName: true } },
            exercises: {
                include: {
                    exercise: {
                        include: {
                            muscles: { include: { muscleGroup: true }, orderBy: { isPrimary: 'desc' } },
                            equipment: { include: { equipment: true } },
                        },
                    },
                    sets: { orderBy: { setNumber: 'asc' } },
                },
                orderBy: { orderIndex: 'asc' },
            },
        },
    })

    if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Enrich with plan exercise defaults (for rest times and target reps)
    let planExerciseDefaults: Record<string, { defaultSets: number; defaultRepsMin: number; defaultRepsMax: number; defaultWeightKg: unknown; restSeconds: number }> = {}

    if (session.dayId) {
        const planExercises = await prisma.workoutPlanExercise.findMany({
            where: { dayId: session.dayId },
        })
        planExerciseDefaults = Object.fromEntries(
            planExercises.map(pe => [pe.exerciseId, {
                defaultSets: pe.defaultSets,
                defaultRepsMin: pe.defaultRepsMin,
                defaultRepsMax: pe.defaultRepsMax,
                // Prisma Decimal serialises as string — convert to number explicitly
                defaultWeightKg: pe.defaultWeightKg !== null ? Number(pe.defaultWeightKg) : null,
                restSeconds: pe.restSeconds,
            }])
        )
    }

    return NextResponse.json({ session, planExerciseDefaults })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const session = await prisma.workoutSession.findUnique({ where: { id }, select: { userId: true } })
    if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.workoutSession.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
