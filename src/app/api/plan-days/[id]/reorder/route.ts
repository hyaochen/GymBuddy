import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const day = await prisma.workoutPlanDay.findUnique({
        where: { id },
        include: { plan: true, exercises: { select: { id: true } } },
    })
    if (!day || day.plan.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const exerciseIds = body?.exerciseIds
    if (!Array.isArray(exerciseIds) || exerciseIds.some(x => typeof x !== 'string')) {
        return NextResponse.json({ error: 'exerciseIds must be string[]' }, { status: 400 })
    }

    const owned = new Set(day.exercises.map(e => e.id))
    if (exerciseIds.length !== owned.size || exerciseIds.some(eid => !owned.has(eid))) {
        return NextResponse.json({ error: 'exerciseIds must match this day' }, { status: 400 })
    }

    await prisma.$transaction(
        exerciseIds.map((peId, idx) =>
            prisma.workoutPlanExercise.update({
                where: { id: peId },
                data: { orderIndex: idx },
            })
        )
    )

    return NextResponse.json({ success: true })
}
