import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getFriendIds } from '@/lib/friends'
import { toDateKey, sumSetsVolume } from '@/lib/utils'

function computeCurrentStreak(dates: string[]): number {
    if (dates.length === 0) return 0
    const sorted = Array.from(new Set(dates)).sort().reverse()
    const today = toDateKey(new Date())
    const yesterday = toDateKey(new Date(Date.now() - 86400000))
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0
    let streak = 1
    for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1] + 'T00:00:00Z').getTime()
        const curr = new Date(sorted[i] + 'T00:00:00Z').getTime()
        if (Math.round((prev - curr) / 86400000) === 1) streak++
        else break
    }
    return streak
}

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const friendIds = await getFriendIds(user.id)
    const allIds = [user.id, ...friendIds]

    // Get users
    const users = await prisma.user.findMany({
        where: { id: { in: allIds } },
        select: { id: true, name: true },
    })

    const nameMap = new Map(users.map(u => [u.id, u.name]))

    // Get privacy settings
    const profiles = await prisma.userProfile.findMany({
        where: { userId: { in: allIds } },
    })
    const profileMap = new Map(profiles.map(p => [p.userId, p]))

    // 1. Streak leaderboard — one query for all users, bucket per-user in JS.
    const streakSessions = await prisma.workoutSession.findMany({
        where: { userId: { in: allIds }, completedAt: { not: null } },
        select: { userId: true, startedAt: true },
    })
    const datesByUser = new Map<string, string[]>()
    for (const s of streakSessions) {
        const arr = datesByUser.get(s.userId) ?? []
        arr.push(toDateKey(s.startedAt))
        datesByUser.set(s.userId, arr)
    }
    const streakBoard = allIds
        .map((id) => {
            const p = profileMap.get(id)
            if (p && !p.showStreak && id !== user.id) return null
            const currentStreak = computeCurrentStreak(datesByUser.get(id) ?? [])
            if (currentStreak === 0) return null
            return { userId: id, name: nameMap.get(id)!, currentStreak }
        })
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .sort((a, b) => b.currentStreak - a.currentStreak)

    // 2. This week's volume
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const weekSessions = await prisma.workoutSession.findMany({
        where: {
            userId: { in: allIds },
            completedAt: { not: null },
            startedAt: { gte: weekAgo },
        },
        include: {
            exercises: { include: { sets: true } },
        },
    })

    const volumeMap = new Map<string, number>()
    for (const s of weekSessions) {
        const p = profileMap.get(s.userId)
        if (p && !p.showWorkouts && s.userId !== user.id) continue
        const vol = s.exercises.reduce((sum, e) => sum + sumSetsVolume(e.sets), 0)
        volumeMap.set(s.userId, (volumeMap.get(s.userId) || 0) + vol)
    }
    const volumeBoard = Array.from(volumeMap.entries())
        .map(([userId, volume]) => ({ userId, name: nameMap.get(userId)!, volume: Math.round(volume) }))
        .sort((a, b) => b.volume - a.volume)

    // 3. Most sessions this month
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthSessions = await prisma.workoutSession.groupBy({
        by: ['userId'],
        where: {
            userId: { in: allIds },
            completedAt: { not: null },
            startedAt: { gte: monthAgo },
        },
        _count: true,
    })

    const sessionsBoard = monthSessions
        .filter(s => {
            const p = profileMap.get(s.userId)
            return !(p && !p.showWorkouts && s.userId !== user.id)
        })
        .map(s => ({ userId: s.userId, name: nameMap.get(s.userId)!, sessions: s._count }))
        .sort((a, b) => b.sessions - a.sessions)

    return NextResponse.json({
        streak: streakBoard,
        weeklyVolume: volumeBoard,
        monthlySessions: sessionsBoard,
    })
}
