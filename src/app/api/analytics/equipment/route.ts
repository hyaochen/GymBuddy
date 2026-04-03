import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get all exercises the user has done with their equipment
    const sessionExercises = await prisma.sessionExercise.findMany({
        where: {
            session: { userId: user.id, completedAt: { not: null } },
        },
        include: {
            exercise: {
                include: {
                    equipment: {
                        include: { equipment: true },
                    },
                },
            },
            sets: true,
            session: { select: { startedAt: true } },
        },
    })

    // Aggregate by equipment
    const equipmentMap = new Map<string, {
        id: string
        name: string
        category: string
        sessionCount: number
        sessionDates: Set<string>
        maxWeight: number
        lastUsed: Date
        exercises: Set<string>
    }>()

    for (const se of sessionExercises) {
        for (const eq of se.exercise.equipment) {
            const existing = equipmentMap.get(eq.equipmentId)
            const maxW = se.sets.reduce((max, set) => Math.max(max, Number(set.weightKg)), 0)
            const dateKey = se.session.startedAt.toISOString().split('T')[0]

            if (existing) {
                existing.sessionDates.add(dateKey)
                if (maxW > existing.maxWeight) existing.maxWeight = maxW
                if (se.session.startedAt > existing.lastUsed) existing.lastUsed = se.session.startedAt
                existing.exercises.add(se.exercise.name)
            } else {
                equipmentMap.set(eq.equipmentId, {
                    id: eq.equipmentId,
                    name: eq.equipment.name,
                    category: eq.equipment.category,
                    sessionCount: 0,
                    sessionDates: new Set([dateKey]),
                    maxWeight: maxW,
                    lastUsed: se.session.startedAt,
                    exercises: new Set([se.exercise.name]),
                })
            }
        }
    }

    const data = Array.from(equipmentMap.values())
        .map(e => ({
            id: e.id,
            name: e.name,
            category: e.category,
            sessionCount: e.sessionDates.size,
            maxWeight: e.maxWeight,
            lastUsed: e.lastUsed.toISOString(),
            exerciseCount: e.exercises.size,
            exercises: Array.from(e.exercises).slice(0, 5),
        }))
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())

    return NextResponse.json({ data })
}
