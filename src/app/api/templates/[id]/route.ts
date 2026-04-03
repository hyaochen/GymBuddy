import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const template = await prisma.sharedTemplate.findUnique({
        where: { id },
        include: {
            creator: { select: { id: true, name: true } },
            templateLikes: {
                where: { userId: user.id },
                select: { id: true },
                take: 1,
            },
        },
    })

    if (!template) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
        ...template,
        days: JSON.parse(template.days),
        targetMuscles: template.targetMuscles ? JSON.parse(template.targetMuscles) : [],
        isLiked: template.templateLikes.length > 0,
        isOwn: template.creatorId === user.id,
    })
}
