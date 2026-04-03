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

    const days: TemplateDay[] = JSON.parse(template.days)

    // Create a new workout plan from the template
    const plan = await prisma.workoutPlan.create({
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

    // Increment download count
    await prisma.sharedTemplate.update({
        where: { id },
        data: { downloads: { increment: 1 } },
    })

    return NextResponse.json({ plan })
}
