import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'active' // active | past | all

    const now = new Date()
    const where: Record<string, unknown> = { isPublic: true }

    if (status === 'active') {
        where.endDate = { gte: now }
        where.startDate = { lte: now }
    } else if (status === 'past') {
        where.endDate = { lt: now }
    }

    const challenges = await prisma.challenge.findMany({
        where,
        include: {
            creator: { select: { id: true, name: true } },
            exercise: { select: { id: true, name: true } },
            participants: {
                select: {
                    userId: true,
                    currentValue: true,
                    completed: true,
                    user: { select: { name: true } },
                },
                orderBy: { currentValue: 'desc' },
            },
        },
        orderBy: { endDate: 'asc' },
        take: 50,
    })

    const items = challenges.map(c => ({
        ...c,
        participantCount: c.participants.length,
        isJoined: c.participants.some(p => p.userId === user.id),
        myProgress: c.participants.find(p => p.userId === user.id) || null,
    }))

    return NextResponse.json({ challenges: items })
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, description, type, targetValue, exerciseId, startDate, endDate, isPublic } = body

    if (!title || !type || !targetValue || !startDate || !endDate) {
        return NextResponse.json({ error: '請填寫所有必要欄位' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end <= start) {
        return NextResponse.json({ error: '結束日期必須在開始日期之後' }, { status: 400 })
    }

    const challenge = await prisma.challenge.create({
        data: {
            creatorId: user.id,
            title,
            description: description || null,
            type,
            targetValue: Number(targetValue),
            exerciseId: exerciseId || null,
            startDate: start,
            endDate: end,
            isPublic: isPublic !== false,
            participants: {
                create: { userId: user.id },
            },
        },
        include: {
            creator: { select: { id: true, name: true } },
            participants: true,
        },
    })

    return NextResponse.json({ challenge }, { status: 201 })
}
