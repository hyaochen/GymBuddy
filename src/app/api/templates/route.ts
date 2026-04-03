import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const sort = url.searchParams.get('sort') || 'recent' // recent | likes | downloads
    const difficulty = url.searchParams.get('difficulty') // BEGINNER | INTERMEDIATE | ADVANCED
    const search = url.searchParams.get('search')
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
    const limit = 20

    const where: Record<string, unknown> = { isPublic: true }
    if (difficulty) where.difficulty = difficulty
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ]
    }

    const orderBy: Record<string, string> =
        sort === 'likes' ? { likes: 'desc' } :
        sort === 'downloads' ? { downloads: 'desc' } :
        { createdAt: 'desc' }

    const [templates, total] = await Promise.all([
        prisma.sharedTemplate.findMany({
            where,
            include: {
                creator: { select: { id: true, name: true } },
                templateLikes: {
                    where: { userId: user.id },
                    select: { id: true },
                    take: 1,
                },
            },
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.sharedTemplate.count({ where }),
    ])

    const items = templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        daysPerWeek: t.daysPerWeek,
        difficulty: t.difficulty,
        targetMuscles: t.targetMuscles ? JSON.parse(t.targetMuscles) : [],
        likes: t.likes,
        downloads: t.downloads,
        isLiked: t.templateLikes.length > 0,
        creator: t.creator,
        createdAt: t.createdAt,
    }))

    return NextResponse.json({ templates: items, total, page, totalPages: Math.ceil(total / limit) })
}
