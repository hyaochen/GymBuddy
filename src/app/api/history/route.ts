import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sumSetsVolume } from '@/lib/utils'

function intParam(raw: string | null, fallback: number): number {
    const n = parseInt(raw ?? '', 10)
    return Number.isFinite(n) ? n : fallback
}

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(30, Math.max(1, intParam(searchParams.get('limit'), 10)))
    // offset 優先（前端「載入更多」用目前已載入筆數當 offset，刪除後不會漏筆）；否則沿用 page
    const page = Math.max(1, intParam(searchParams.get('page'), 1))
    const skip = searchParams.has('offset')
        ? Math.max(0, intParam(searchParams.get('offset'), 0))
        : (page - 1) * limit

    // Show all sessions that have at least one set logged (complete or partial)
    const where = {
        userId: user.id,
        exercises: { some: { sets: { some: {} } } },
    }

    // 全期彙總：只算已完成的訓練；限時組不計量（沿用 sumSetsVolume 規則）
    const loadStats = async () => {
        const completedWhere = { ...where, completedAt: { not: null } }
        const [completedCount, sets] = await Promise.all([
            prisma.workoutSession.count({ where: completedWhere }),
            prisma.sessionSet.findMany({
                where: { sessionExercise: { session: completedWhere } },
                select: { repsPerformed: true, weightKg: true, durationSeconds: true },
            }),
        ])
        return {
            completedCount,
            totalSets: sets.length,
            totalVolume: Math.round(sumSetsVolume(sets)),
        }
    }

    if (searchParams.get('statsOnly') === '1') {
        return NextResponse.json({ stats: await loadStats() })
    }

    const [sessions, total, stats] = await Promise.all([
        prisma.workoutSession.findMany({
            where,
            include: {
                plan: { select: { name: true } },
                day: { select: { dayName: true } },
                exercises: {
                    include: {
                        exercise: { select: { id: true, name: true } },
                        sets: { orderBy: { setNumber: 'asc' } },
                    },
                    orderBy: { orderIndex: 'asc' },
                },
            },
            orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
            skip,
            take: limit,
        }),
        prisma.workoutSession.count({ where }),
        searchParams.get('stats') === '1' ? loadStats() : Promise.resolve(undefined),
    ])

    return NextResponse.json({
        sessions,
        total,
        page,
        limit,
        hasMore: skip + sessions.length < total,
        ...(stats && { stats }),
    })
}
