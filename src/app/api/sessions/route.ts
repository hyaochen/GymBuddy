import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { planId, dayId } = body

    // Load the plan day with its exercises to create session exercises
    let sessionExercisesData: Array<{ exerciseId: string; orderIndex: number }> = []

    if (planId && dayId) {
        const planDay = await prisma.workoutPlanDay.findUnique({
            where: { id: dayId },
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
