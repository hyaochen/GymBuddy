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

    // Aggregate per day: count completed sets (volume OR duration-based)
    const dailyVolumeMap = new Map<string, number>()
    const dailySetCountMap = new Map<string, number>()

    for (const s of sessions) {
        const dateKey = s.startedAt.toISOString().split('T')[0]
        let volume = 0
        let setCount = 0
        for (const se of s.exercises) {
            for (const set of se.sets) {
                setCount++
                if (!set.durationSeconds) {
                    volume += Number(set.weightKg) * set.repsPerformed
                }
            }
        }
        dailyVolumeMap.set(dateKey, (dailyVolumeMap.get(dateKey) || 0) + Math.round(volume))
        dailySetCountMap.set(dateKey, (dailySetCountMap.get(dateKey) || 0) + setCount)
    }

    const days: { date: string; volume: number; trained: boolean }[] = []
    for (let i = 89; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().split('T')[0]
        const volume = dailyVolumeMap.get(key) || 0
        const setCount = dailySetCountMap.get(key) || 0
        // A day counts as trained if it has ANY completed sets (including duration-only)
        days.push({ date: key, volume, trained: setCount > 0 })
    }

    // Calculate streaks using 'trained' flag instead of volume > 0
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].trained) {
            if (i === days.length - 1 || (i < days.length - 1 && currentStreak > 0)) {
                currentStreak++
            }
        } else if (currentStreak > 0) {
            break
        }
    }

    // If today has no training but yesterday did, current streak = 0 but check from yesterday
    if (!days[days.length - 1].trained) {
        currentStreak = 0
        for (let i = days.length - 2; i >= 0; i--) {
            if (days[i].trained) currentStreak++
            else break
        }
    }

    // Longest streak
    for (const day of days) {
        if (day.trained) {
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
