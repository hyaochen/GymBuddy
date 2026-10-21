import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { parseJsonBodyZh, createPlanDaySchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = await parseJsonBodyZh(req, createPlanDaySchema)
    if ('response' in parsed) return parsed.response
    const { planId, dayName } = parsed.data

    const plan = await prisma.workoutPlan.findUnique({ where: { id: planId } })
    if (!plan || plan.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const lastDay = await prisma.workoutPlanDay.findFirst({
        where: { planId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
    })

    const day = await prisma.workoutPlanDay.create({
        data: {
            planId,
            dayName: dayName || `Day ${(lastDay?.orderIndex ?? -1) + 2}`,
            orderIndex: (lastDay?.orderIndex ?? -1) + 1,
        },
    })

    return NextResponse.json({ day })
}
