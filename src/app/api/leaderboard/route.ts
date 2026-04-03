import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getStreakInfo } from '@/lib/streak'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get friend IDs
    const friendships = await prisma.friendship.findMany({
        where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: user.id }, { receiverId: user.id }],
        },
    })

    const friendIds = friendships.map(f =>
        f.requesterId === user.id ? f.receiverId : f.requesterId
    )

    // Include self
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

    // 1. Streak leaderboard
    const streakData = await Promise.all(
        allIds.map(async (id) => {
            const p = profileMap.get(id)
            if (p && !p.showStreak && id !== user.id) return null
            const info = await getStreakInfo(id)
            return { userId: id, name: nameMap.get(id)!, currentStreak: info.currentStreak }
        })
    )
    const streakBoard = streakData
        .filter((d): d is NonNullable<typeof d> => d !== null && d.currentStreak > 0)
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
        const vol = s.exercises.reduce((sum, e) =>
            sum + e.sets.reduce((s2, set) => s2 + Number(set.weightKg) * set.repsPerformed, 0), 0
        )
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
