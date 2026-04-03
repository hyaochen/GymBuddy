import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkSocialBadge } from '@/lib/badges'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { planId, name, description, difficulty, targetMuscles } = body

    if (!planId) {
        return NextResponse.json({ error: '請選擇要分享的計畫' }, { status: 400 })
    }

    // Get the plan with all details
    const plan = await prisma.workoutPlan.findUnique({
        where: { id: planId },
        include: {
            days: {
                include: {
                    exercises: {
                        include: {
                            exercise: {
                                include: {
                                    muscles: {
                                        include: { muscleGroup: true },
                                        where: { isPrimary: true },
                                    },
                                },
                            },
                        },
                        orderBy: { orderIndex: 'asc' },
                    },
                },
                orderBy: { orderIndex: 'asc' },
            },
        },
    })

    if (!plan || plan.userId !== user.id) {
        return NextResponse.json({ error: '計畫不存在' }, { status: 404 })
    }

    // Build template days JSON
    const days = plan.days.map(day => ({
        dayName: day.dayName,
        exercises: day.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exercise.name,
            sets: ex.defaultSets,
            repsMin: ex.defaultRepsMin,
            repsMax: ex.defaultRepsMax,
            weightKg: ex.defaultWeightKg ? Number(ex.defaultWeightKg) : null,
            restSeconds: ex.restSeconds,
        })),
    }))

    // Auto-detect muscle groups if not provided
    const muscleSet = new Set<string>()
    plan.days.forEach(day =>
        day.exercises.forEach(ex =>
            ex.exercise.muscles.forEach(m => muscleSet.add(m.muscleGroup.name))
        )
    )

    const template = await prisma.sharedTemplate.create({
        data: {
            creatorId: user.id,
            name: name || plan.name,
            description: description || plan.description,
            daysPerWeek: plan.daysPerWeek,
            difficulty: difficulty || 'INTERMEDIATE',
            targetMuscles: JSON.stringify(targetMuscles || Array.from(muscleSet)),
            days: JSON.stringify(days),
        },
    })

    // Badge: template shared
    const badge = await checkSocialBadge(user.id, 'template_shared')

    return NextResponse.json({ template, newBadge: badge }, { status: 201 })
}
