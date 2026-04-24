import prisma from '@/lib/prisma'
import { toDateKey } from '@/lib/utils'

/**
 * Calculate current and longest streak for a user.
 * A streak = consecutive calendar days with at least 1 completed session.
 */
export async function getStreakInfo(userId: string) {
    // Get all completed session dates, grouped by date (local TZ approximation using UTC date)
    const sessions = await prisma.workoutSession.findMany({
        where: { userId, completedAt: { not: null } },
        select: { startedAt: true },
        orderBy: { startedAt: 'desc' },
    })

    if (sessions.length === 0) {
        return { currentStreak: 0, longestStreak: 0 }
    }

    // Deduplicate by date string (YYYY-MM-DD)
    const dateSet = new Set<string>()
    for (const s of sessions) {
        dateSet.add(toDateString(s.startedAt))
    }

    // Sort dates descending
    const dates = Array.from(dateSet).sort().reverse()

    // Current streak: must include today or yesterday
    const today = toDateString(new Date())
    const yesterday = toDateString(new Date(Date.now() - 86400000))

    let currentStreak = 0
    if (dates[0] === today || dates[0] === yesterday) {
        currentStreak = 1
        for (let i = 1; i < dates.length; i++) {
            const prev = new Date(dates[i - 1])
            const curr = new Date(dates[i])
            const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)
            if (diffDays === 1) {
                currentStreak++
            } else {
                break
            }
        }
    }

    // Longest streak: scan all sorted dates (ascending)
    const asc = [...dates].reverse()
    let longestStreak = 1
    let streak = 1
    for (let i = 1; i < asc.length; i++) {
        const prev = new Date(asc[i - 1])
        const curr = new Date(asc[i])
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
        if (diffDays === 1) {
            streak++
            if (streak > longestStreak) longestStreak = streak
        } else {
            streak = 1
        }
    }

    return { currentStreak, longestStreak }
}

const toDateString = toDateKey

export const STREAK_MILESTONES = [7, 14, 30, 60, 90, 100]
