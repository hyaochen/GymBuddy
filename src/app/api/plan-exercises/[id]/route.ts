import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const pe = await prisma.workoutPlanExercise.findUnique({
        where: { id },
        include: { day: { include: { plan: true } } },
    })
    if (!pe || pe.day.plan.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const { defaultSets, defaultRepsMin, defaultRepsMax, restSeconds, defaultWeightKg } = body

    const updated = await prisma.workoutPlanExercise.update({
        where: { id },
        data: {
            ...(defaultSets !== undefined && { defaultSets }),
            ...(defaultRepsMin !== undefined && { defaultRepsMin }),
            ...(defaultRepsMax !== undefined && { defaultRepsMax }),
            ...(restSeconds !== undefined && { restSeconds }),
            ...(defaultWeightKg !== undefined && { defaultWeightKg }),
        },
    })

    return NextResponse.json({ exercise: updated })
}
