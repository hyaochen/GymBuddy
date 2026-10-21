import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hideReplacedExercises, resolveSubstituteDefaults } from '@/lib/session-logic'
import { suggestNextWeight, type NextWeightSuggestion } from '@/lib/progressive-overload'
import { updateExerciseSummary, recomputePersonalRecords } from '@/lib/exercise-summary'

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
                // substitutes share the original's orderIndex: id breaks the tie
                orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
            },
        },
    })

    if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Enrich with plan exercise defaults (for rest times and target reps)
    let planExerciseDefaults: Record<string, { defaultSets: number; defaultRepsMin: number; defaultRepsMax: number; defaultWeightKg: unknown; restSeconds: number; defaultDurationMin: number | null; defaultDurationMax: number | null }> = {}

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
                defaultDurationMin: pe.defaultDurationMin,
                defaultDurationMax: pe.defaultDurationMax,
                restSeconds: pe.restSeconds,
            }])
        )
    }

    // A substituted-away original that was never trained is hidden; the substitute
    // takes its place and inherits its defaults (sets / reps / rest).
    const exercises = hideReplacedExercises(session.exercises)
    planExerciseDefaults = resolveSubstituteDefaults(session.exercises, planExerciseDefaults)

    // Auto-applied progressive overload: for exercises not started yet, suggest a
    // starting weight from the user's last completed session of that exercise.
    const suggestedWeights: Record<string, NextWeightSuggestion> = {}
    if (!session.completedAt) {
        const todo = [...new Set(
            exercises.filter(se => se.sets.length === 0 && !se.exercise.isTimeBased).map(se => se.exerciseId),
        )]
        await Promise.all(todo.map(async exerciseId => {
            const last = await prisma.sessionExercise.findFirst({
                where: {
                    exerciseId,
                    sessionId: { not: session.id },
                    session: { userId: user.id, completedAt: { not: null } },
                    sets: { some: {} },
                },
                orderBy: { session: { completedAt: 'desc' } },
                select: { sets: { orderBy: { setNumber: 'asc' }, select: { setNumber: true, repsPerformed: true, weightKg: true } } },
            })
            if (!last) return
            const d = planExerciseDefaults[exerciseId]
            const suggestion = suggestNextWeight(
                {
                    defaultSets: d?.defaultSets ?? 3,
                    defaultRepsMin: d?.defaultRepsMin ?? 8,
                    defaultRepsMax: d?.defaultRepsMax ?? 12,
                    defaultWeightKg: d ? (d.defaultWeightKg as number | null) : null,
                },
                last.sets.map(s => ({ setNumber: s.setNumber, repsPerformed: s.repsPerformed, weightKg: Number(s.weightKg) })),
            )
            if (suggestion) suggestedWeights[exerciseId] = suggestion
        }))
    }

    return NextResponse.json({ session: { ...session, exercises }, planExerciseDefaults, suggestedWeights })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const session = await prisma.workoutSession.findUnique({
        where: { id },
        select: {
            userId: true,
            completedAt: true,
            exercises: { select: { exerciseId: true, sets: { select: { id: true }, take: 1 } } },
        },
    })
    if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.workoutSession.delete({ where: { id } })

    // PRs and exercise summaries only count completed sessions: rebuild them for
    // every exercise that had logged sets so deleted data stops showing up.
    if (session.completedAt) {
        const exerciseIds = [...new Set(
            session.exercises.filter(se => se.sets.length > 0).map(se => se.exerciseId),
        )]
        try {
            await Promise.all(exerciseIds.flatMap(eid => [
                recomputePersonalRecords(user.id, eid),
                updateExerciseSummary(user.id, eid),
            ]))
        } catch (e) {
            console.error('[session delete] PR/summary rebuild failed', id, e)
        }
    }
    return NextResponse.json({ success: true })
}
