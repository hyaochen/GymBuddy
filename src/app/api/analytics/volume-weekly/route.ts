import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const REGION_MAP: Record<string, string> = {
    CHEST: 'Chest',
    BACK: 'Back',
    SHOULDERS: 'Shoulders',
    ARMS: 'Arms',
    LEGS: 'Legs',
    CORE: 'Core',
    FULL_BODY: 'Core',
    CARDIO: 'Core',
}

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Last 8 weeks
    const since = new Date()
    since.setDate(since.getDate() - 8 * 7)
    since.setHours(0, 0, 0, 0)

    const sessions = await prisma.workoutSession.findMany({
        where: {
            userId: user.id,
            completedAt: { not: null },
            startedAt: { gte: since },
        },
        include: {
            exercises: {
                include: {
                    sets: true,
                    exercise: {
                        include: {
                            muscles: {
                                where: { isPrimary: true },
                                include: { muscleGroup: true },
                            },
                        },
                    },
                },
            },
        },
        orderBy: { startedAt: 'asc' },
    })

    const muscleGroups = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']

    // Build week labels
    const weeks: { label: string; start: Date; end: Date }[] = []
    for (let i = 7; i >= 0; i--) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)
        const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
        weeks.push({ label, start: weekStart, end: weekEnd })
    }

    const data = weeks.map(week => {
        const entry: Record<string, string | number> = { week: week.label }

        for (const mg of muscleGroups) {
            entry[mg] = 0
        }

        for (const s of sessions) {
            if (s.startedAt < week.start || s.startedAt >= week.end) continue

            for (const se of s.exercises) {
                const volume = se.sets.reduce((sum, set) =>
                    sum + Number(set.weightKg) * set.repsPerformed, 0
                )

                // Get primary muscle group
                if (se.exercise.muscles.length > 0) {
                    const region = se.exercise.muscles[0].muscleGroup.bodyRegion
                    const cat = REGION_MAP[region] || 'Core'
                    entry[cat] = (entry[cat] as number) + Math.round(volume)
                }
            }
        }

        return entry
    })

    return NextResponse.json({ data, muscleGroups })
}
