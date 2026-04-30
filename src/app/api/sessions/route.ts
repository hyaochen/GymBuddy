import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/validation'

const createSessionSchema = z.object({
    planId: z.string().min(8).max(64).nullable().optional(),
    dayId: z.string().min(8).max(64).nullable().optional(),
})

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = await parseJsonBody(req, createSessionSchema)
    if ('response' in parsed) return parsed.response
    const { planId, dayId } = parsed.data

    // Load the plan day with its exercises to create session exercises
    let sessionExercisesData: Array<{ exerciseId: string; orderIndex: number }> = []

    if ((planId && !dayId) || (!planId && dayId)) {
        return NextResponse.json({ error: 'planId and dayId must be provided together' }, { status: 400 })
    }

    if (planId && dayId) {
        const planDay = await prisma.workoutPlanDay.findFirst({
            where: { id: dayId, planId },
            include: {
                exercises: {
                    include: { exercise: true },
                    orderBy: { orderIndex: 'asc' },
                },
                plan: { select: { userId: true } },
            },
        })

        if (!planDay || planDay.plan.userId !== user.id) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
        }

        sessionExercisesData = planDay.exercises.map((pe, idx) => ({
            exerciseId: pe.exerciseId,
            orderIndex: idx,
        }))
    }

    const session = await prisma.workoutSession.create({
        data: {
            userId: user.id,
            planId: planId || null,
            dayId: dayId || null,
            exercises: {
                create: sessionExercisesData,
            },
        },
        include: {
            exercises: {
                include: {
                    exercise: {
                        include: {
                            muscles: { include: { muscleGroup: true }, where: { isPrimary: true } },
                        },
                    },
                    sets: true,
                },
                orderBy: { orderIndex: 'asc' },
            },
            plan: { select: { name: true } },
            day: { select: { dayName: true } },
        },
    })

    return NextResponse.json({ session }, { status: 201 })
}
