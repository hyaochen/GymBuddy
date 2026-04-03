import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const sessions = await prisma.workoutSession.findMany({
        where: {
            userId: user.id,
            completedAt: { not: null },
            startedAt: { gte: since },
        },
        include: {
            exercises: {
                include: { sets: true },
            },
        },
        orderBy: { startedAt: 'asc' },
    })

    // Aggregate volume per day
    const dailyMap = new Map<string, number>()

    for (const s of sessions) {
        const dateKey = s.startedAt.toISOString().split('T')[0]
        const volume = s.exercises.reduce((sum, se) =>
            sum + se.sets.reduce((s2, set) => s2 + Number(set.weightKg) * set.repsPerformed, 0), 0
        )
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + Math.round(volume))
    }

    const days: { date: string; volume: number }[] = []
    for (let i = 89; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().split('T')[0]
        days.push({ date: key, volume: dailyMap.get(key) || 0 })
    }

    // Calculate streaks
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].volume > 0) {
            if (i === days.length - 1 || (i < days.length - 1 && currentStreak > 0)) {
                currentStreak++
            }
        } else if (currentStreak > 0) {
            break
        }
    }

    // If today has no volume but yesterday did, current streak = 0 but check from yesterday
    if (days[days.length - 1].volume === 0) {
        currentStreak = 0
        // Check if yesterday started a streak
        for (let i = days.length - 2; i >= 0; i--) {
            if (days[i].volume > 0) currentStreak++
            else break
        }
    }

    // Longest streak
    for (const day of days) {
        if (day.volume > 0) {
            tempStreak++
            if (tempStreak > longestStreak) longestStreak = tempStreak
        } else {
            tempStreak = 0
        }
    }

    return NextResponse.json({
        days,
        currentStreak,
        longestStreak,
    })
}
