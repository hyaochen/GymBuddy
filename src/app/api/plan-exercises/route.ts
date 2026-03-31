import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { dayId, exerciseId, defaultSets, defaultRepsMin, defaultRepsMax, restSeconds } = body

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
            restSeconds: restSeconds ?? 90,
        },
        include: { exercise: true },
    })

    return NextResponse.json({ exercise: pe })
}
