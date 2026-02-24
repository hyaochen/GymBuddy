import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(30, parseInt(searchParams.get('limit') || '10'))
    const skip = (page - 1) * limit

    // Show all sessions that have at least one set logged (complete or partial)
    const where = {
        userId: user.id,
        exercises: { some: { sets: { some: {} } } },
    }

    const [sessions, total] = await Promise.all([
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
            orderBy: { startedAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.workoutSession.count({ where }),
    ])

    return NextResponse.json({ sessions, total, page, limit })
}
