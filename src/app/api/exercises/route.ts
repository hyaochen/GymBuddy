import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q') || ''
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')

    const exercises = await prisma.exercise.findMany({
        where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: Math.min(limit, 50),
    })

    return NextResponse.json({ exercises })
}
