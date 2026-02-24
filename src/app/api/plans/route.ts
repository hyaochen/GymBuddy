import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const plans = await prisma.workoutPlan.findMany({
        where: { userId: user.id, isActive: true },
        include: {
            days: {
                include: { exercises: { include: { exercise: true } } },
                orderBy: { orderIndex: 'asc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ plans })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, description, daysPerWeek, days } = body

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const plan = await prisma.workoutPlan.create({
        data: {
            userId: user.id,
            name,
            description,
            daysPerWeek: daysPerWeek || 3,
            days: {
                create: (days || []).map((day: { dayName: string; dayOfWeek?: number; orderIndex?: number; exercises?: Array<{ exerciseId: string; orderIndex?: number; defaultSets?: number; defaultRepsMin?: number; defaultRepsMax?: number; defaultWeightKg?: number; restSeconds?: number; notes?: string }> }, idx: number) => ({
                    dayName: day.dayName,
                    dayOfWeek: day.dayOfWeek,
                    orderIndex: day.orderIndex ?? idx,
                    exercises: {
                        create: (day.exercises || []).map((ex, exIdx: number) => ({
                            exerciseId: ex.exerciseId,
                            orderIndex: ex.orderIndex ?? exIdx,
                            defaultSets: ex.defaultSets ?? 3,
                            defaultRepsMin: ex.defaultRepsMin ?? 8,
                            defaultRepsMax: ex.defaultRepsMax ?? 12,
                            defaultWeightKg: ex.defaultWeightKg,
                            restSeconds: ex.restSeconds ?? 90,
                            notes: ex.notes,
                        })),
                    },
                })),
            },
        },
        include: {
            days: {
                include: { exercises: { include: { exercise: true } } },
                orderBy: { orderIndex: 'asc' },
            },
        },
    })

    return NextResponse.json({ plan }, { status: 201 })
}
