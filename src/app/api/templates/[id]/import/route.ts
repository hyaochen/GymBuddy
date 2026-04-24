import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface TemplateExercise {
    exerciseId: string
    exerciseName?: string
    sets: number
    repsMin: number
    repsMax: number
    weightKg: number | null
    restSeconds: number
}

interface TemplateDay {
    dayName: string
    exercises: TemplateExercise[]
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const template = await prisma.sharedTemplate.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!template.isPublic && template.creatorId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let days: TemplateDay[]
    try {
        days = JSON.parse(template.days)
        if (!Array.isArray(days)) throw new Error('days not array')
    } catch {
        return NextResponse.json({ error: 'Template data malformed' }, { status: 422 })
    }

    const exerciseIds = Array.from(
        new Set(days.flatMap((d) => (d.exercises ?? []).map((e) => e.exerciseId)))
    )
    if (exerciseIds.length > 0) {
        const found = await prisma.exercise.findMany({
            where: { id: { in: exerciseIds } },
            select: { id: true },
        })
        if (found.length !== exerciseIds.length) {
            return NextResponse.json(
                { error: 'Template references missing exercises' },
                { status: 422 }
            )
        }
    }

    const plan = await prisma.$transaction(async (tx) => {
        const created = await tx.workoutPlan.create({
            data: {
                userId: user.id,
                name: template.name,
                description: template.description,
                daysPerWeek: template.daysPerWeek,
                days: {
                    create: days.map((day, dayIdx) => ({
                        dayName: day.dayName,
                        orderIndex: dayIdx,
                        exercises: {
                            create: day.exercises.map((ex, exIdx) => ({
                                exerciseId: ex.exerciseId,
                                orderIndex: exIdx,
                                defaultSets: ex.sets,
                                defaultRepsMin: ex.repsMin,
                                defaultRepsMax: ex.repsMax,
                                defaultWeightKg: ex.weightKg,
                                restSeconds: ex.restSeconds,
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

        await tx.sharedTemplate.update({
            where: { id },
            data: { downloads: { increment: 1 } },
        })

        return created
    })

    return NextResponse.json({ plan })
}
