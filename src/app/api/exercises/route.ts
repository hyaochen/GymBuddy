import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const muscleId = searchParams.get('muscle') || ''
    const equipmentId = searchParams.get('equipment') || ''
    const difficulty = searchParams.get('difficulty') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (q) {
        where.name = { contains: q, mode: 'insensitive' }
    }
    if (muscleId) {
        where.muscles = { some: { muscleGroupId: muscleId, isPrimary: true } }
    }
    if (equipmentId) {
        where.equipment = { some: { equipmentId } }
    }
    if (difficulty) {
        where.difficulty = difficulty
    }

    const [exercises, total] = await Promise.all([
        prisma.exercise.findMany({
            where,
            skip,
            take: limit,
            include: {
                muscles: { include: { muscleGroup: true }, orderBy: { isPrimary: 'desc' } },
                equipment: { include: { equipment: true } },
            },
            orderBy: { name: 'asc' },
        }),
        prisma.exercise.count({ where }),
    ])

    return NextResponse.json({ exercises, total, page, limit })
}
