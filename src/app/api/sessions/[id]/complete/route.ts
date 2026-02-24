import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateOverloadSuggestion } from '@/lib/progressive-overload'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    const body = await req.json()
    const { notes } = body

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

    if (session.completedAt) {
        return NextResponse.json({ error: 'Session already completed' }, { status: 400 })
    }

    const now = new Date()
    const durationMin = Math.round((now.getTime() - session.startedAt.getTime()) / 60000)

    await prisma.workoutSession.update({
        where: { id: sessionId },
        data: { completedAt: now, durationMin, notes },
    })

    // Generate overload suggestions for each exercise
    const suggestions = []
    for (const se of session.exercises) {
        if (se.sets.length === 0) continue

        // Get plan exercise defaults
        let planDefaults = {
            defaultSets: 3,
            defaultRepsMin: 8,
            defaultRepsMax: 12,
            defaultWeightKg: null as number | null,
        }

        if (session.dayId) {
            const planEx = await prisma.workoutPlanExercise.findFirst({
                where: { dayId: session.dayId, exerciseId: se.exerciseId },
            })
            if (planEx) {
                planDefaults = {
                    defaultSets: planEx.defaultSets,
                    defaultRepsMin: planEx.defaultRepsMin,
                    defaultRepsMax: planEx.defaultRepsMax,
                    defaultWeightKg: planEx.defaultWeightKg ? Number(planEx.defaultWeightKg) : null,
                }
            }
        }

        const suggestion = generateOverloadSuggestion(
            se.exerciseId,
            se.exercise.name,
            planDefaults,
            se.sets.map(s => ({
                setNumber: s.setNumber,
                repsPerformed: s.repsPerformed,
                weightKg: Number(s.weightKg),
            })),
        )

        suggestions.push(suggestion)
    }

    // Calculate session summary
    const totalSets = session.exercises.reduce((sum, se) => sum + se.sets.length, 0)
    const totalVolume = session.exercises.reduce((sum, se) =>
        sum + se.sets.reduce((s2, set) => s2 + (Number(set.weightKg) * set.repsPerformed), 0), 0
    )

    return NextResponse.json({
        success: true,
        durationMin,
        totalSets,
        totalVolume: Math.round(totalVolume),
        suggestions,
    })
}
