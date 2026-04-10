import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { resolveAnalyticsUser } from '@/lib/analytics-auth'
import { epley1rm } from '@/lib/utils'

export async function GET(req: NextRequest) {
    const { userId, error } = await resolveAnalyticsUser(req)
    if (error) return NextResponse.json({ error }, { status: 401 })

    const exerciseId = req.nextUrl.searchParams.get('exerciseId')
    if (!exerciseId) {
        return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    // Last 12 weeks
    const since = new Date()
    since.setDate(since.getDate() - 12 * 7)
    since.setHours(0, 0, 0, 0)

    const sessions = await prisma.workoutSession.findMany({
        where: {
            userId,
            completedAt: { not: null },
            startedAt: { gte: since },
        },
        include: {
            exercises: {
                where: { exerciseId },
                include: { sets: true },
            },
        },
        orderBy: { startedAt: 'asc' },
    })

    // Build weekly buckets
    const weeks: { label: string; start: Date; end: Date }[] = []
    for (let i = 11; i >= 0; i--) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)
        const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
        weeks.push({ label, start: weekStart, end: weekEnd })
    }

    const data = weeks.map(week => {
        let maxWeight = 0
        let totalVolume = 0
        let best1rm = 0

        for (const s of sessions) {
            if (s.startedAt < week.start || s.startedAt >= week.end) continue
            for (const se of s.exercises) {
                for (const set of se.sets) {
                    const w = Number(set.weightKg)
                    const r = set.repsPerformed
                    if (w > maxWeight) maxWeight = w
                    totalVolume += w * r
                    const e = epley1rm(w, r)
                    if (e > best1rm) best1rm = e
                }
            }
        }

        return {
            week: week.label,
            maxWeight: maxWeight || null,
            totalVolume: Math.round(totalVolume) || null,
            estimated1rm: best1rm ? Math.round(best1rm * 4) / 4 : null,
        }
    })

    // Also get the exercise list for the dropdown
    const exercises = await prisma.sessionExercise.findMany({
        where: {
            session: { userId, completedAt: { not: null } },
        },
        select: {
            exerciseId: true,
            exercise: { select: { name: true } },
        },
        distinct: ['exerciseId'],
    })

    const exerciseList = exercises.map(e => ({
        id: e.exerciseId,
        name: e.exercise.name,
    }))

    return NextResponse.json({ data, exerciseList })
}
