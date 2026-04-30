import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/validation'
import { parseTaipeiDateInput } from '@/lib/timezone'
import type { Prisma } from '@prisma/client'

const challengeStatusSchema = z.enum(['active', 'past', 'all']).default('active')
const createChallengeSchema = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullable().optional(),
    type: z.enum(['STREAK', 'TOTAL_SESSIONS', 'WEIGHT_PR', 'VOLUME']),
    targetValue: z.coerce.number().int().positive().max(1_000_000),
    exerciseId: z.string().min(8).max(64).nullable().optional(),
    startDate: z.string().min(8),
    endDate: z.string().min(8),
    isPublic: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const statusParsed = challengeStatusSchema.safeParse(url.searchParams.get('status') || 'active')
    if (!statusParsed.success) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const status = statusParsed.data

    const now = new Date()
    const where: Prisma.ChallengeWhereInput = {
        OR: [
            { isPublic: true },
            { creatorId: user.id },
            { participants: { some: { userId: user.id } } },
        ],
    }

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

    const parsed = await parseJsonBody(req, createChallengeSchema)
    if ('response' in parsed) return parsed.response
    const { title, description, type, targetValue, exerciseId, startDate, endDate, isPublic } = parsed.data

    if (!title || !type || !targetValue || !startDate || !endDate) {
        return NextResponse.json({ error: '請填寫所有必要欄位' }, { status: 400 })
    }

    let start: Date
    let end: Date
    try {
        start = parseTaipeiDateInput(startDate)
        end = parseTaipeiDateInput(endDate)
    } catch {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }
    if (end <= start) {
        return NextResponse.json({ error: '結束日期必須在開始日期之後' }, { status: 400 })
    }

    if (type === 'WEIGHT_PR' && !exerciseId) {
        return NextResponse.json({ error: 'exerciseId required for WEIGHT_PR challenges' }, { status: 400 })
    }

    const challenge = await prisma.challenge.create({
        data: {
            creatorId: user.id,
            title,
            description: description || null,
            type,
            targetValue,
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
