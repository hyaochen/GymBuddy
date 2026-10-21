import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { parseJsonBodyZh, createPlanExerciseSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = await parseJsonBodyZh(req, createPlanExerciseSchema)
    if ('response' in parsed) return parsed.response
    const { dayId, exerciseId, defaultSets, defaultRepsMin, defaultRepsMax, defaultWeightKg, defaultDurationMin, defaultDurationMax, restSeconds } = parsed.data

    const day = await prisma.workoutPlanDay.findUnique({
        where: { id: dayId },
        include: { plan: true, exercises: { select: { orderIndex: true }, orderBy: { orderIndex: 'desc' }, take: 1 } },
    })
    if (!day || day.plan.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const nextOrder = (day.exercises[0]?.orderIndex ?? -1) + 1

    const pe = await prisma.workoutPlanExercise.create({
        data: {
            dayId,
            exerciseId,
            orderIndex: nextOrder,
            defaultSets: defaultSets ?? 3,
            defaultRepsMin: defaultRepsMin ?? 8,
            defaultRepsMax: defaultRepsMax ?? 12,
            defaultWeightKg,
            defaultDurationMin,
            defaultDurationMax,
            restSeconds: restSeconds ?? 90,
        },
        include: { exercise: true },
    })

    return NextResponse.json({ exercise: pe })
}
