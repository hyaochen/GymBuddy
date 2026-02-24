import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { epley1rm } from '@/lib/utils'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const exerciseId = searchParams.get('exerciseId')
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    if (exerciseId) {
        // Return chart data for a specific exercise
        const sessions = await prisma.workoutSession.findMany({
            where: { userId: user.id, startedAt: { gte: since }, completedAt: { not: null } },
            include: {
                exercises: {
                    where: { exerciseId },
                    include: { sets: true },
                },
            },
            orderBy: { startedAt: 'asc' },
        })

        const chartData = sessions
            .filter(s => s.exercises.length > 0 && s.exercises[0].sets.length > 0)
            .map(s => {
                const sets = s.exercises[0].sets
                const maxWeight = Math.max(...sets.map(set => Number(set.weightKg)))
                const maxRepsAtMax = sets.filter(set => Number(set.weightKg) === maxWeight).reduce((max, set) => Math.max(max, set.repsPerformed), 0)
                const estimated1rm = epley1rm(maxWeight, maxRepsAtMax)
                const totalVolume = sets.reduce((sum, set) => sum + Number(set.weightKg) * set.repsPerformed, 0)
                return {
                    date: s.startedAt.toISOString().split('T')[0],
                    maxWeight,
                    estimated1rm: Math.round(estimated1rm * 4) / 4,
                    totalVolume: Math.round(totalVolume),
                    totalSets: sets.length,
                    totalReps: sets.reduce((sum, set) => sum + set.repsPerformed, 0),
                }
            })

        return NextResponse.json({ chartData, exerciseId })
    }

    // Return overall volume chart data
    const sessions = await prisma.workoutSession.findMany({
        where: { userId: user.id, startedAt: { gte: since }, completedAt: { not: null } },
        include: { exercises: { include: { sets: true } } },
        orderBy: { startedAt: 'asc' },
    })

    const chartData = sessions.map(s => {
        const totalVolume = s.exercises.reduce((sum, se) =>
            sum + se.sets.reduce((s2, set) => s2 + Number(set.weightKg) * set.repsPerformed, 0), 0
        )
        const totalSets = s.exercises.reduce((sum, se) => sum + se.sets.length, 0)
        return {
            date: s.startedAt.toISOString().split('T')[0],
            totalVolume: Math.round(totalVolume),
            totalSets,
            durationMin: s.durationMin || 0,
        }
    })

    return NextResponse.json({ chartData })
}
