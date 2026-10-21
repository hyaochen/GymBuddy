import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { parseJsonBodyZh, updatePlanExerciseSchema, checkRanges } from '@/lib/validation'

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

    const parsed = await parseJsonBodyZh(req, updatePlanExerciseSchema)
    if ('response' in parsed) return parsed.response
    const { defaultSets, defaultRepsMin, defaultRepsMax, restSeconds, defaultWeightKg, defaultDurationMin, defaultDurationMax } = parsed.data

    // 只送一邊時，要與資料庫現值合併後再檢查 min <= max
    const rangeError = checkRanges({
        defaultRepsMin: defaultRepsMin ?? pe.defaultRepsMin,
        defaultRepsMax: defaultRepsMax ?? pe.defaultRepsMax,
        defaultDurationMin: defaultDurationMin !== undefined ? defaultDurationMin : pe.defaultDurationMin,
        defaultDurationMax: defaultDurationMax !== undefined ? defaultDurationMax : pe.defaultDurationMax,
    })
    if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 })

    const updated = await prisma.workoutPlanExercise.update({
        where: { id },
        data: {
            ...(defaultSets !== undefined && { defaultSets }),
            ...(defaultRepsMin !== undefined && { defaultRepsMin }),
            ...(defaultRepsMax !== undefined && { defaultRepsMax }),
            ...(restSeconds !== undefined && { restSeconds }),
            ...(defaultWeightKg !== undefined && { defaultWeightKg }),
            ...(defaultDurationMin !== undefined && { defaultDurationMin }),
            ...(defaultDurationMax !== undefined && { defaultDurationMax }),
        },
    })

    return NextResponse.json({ exercise: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    await prisma.workoutPlanExercise.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
