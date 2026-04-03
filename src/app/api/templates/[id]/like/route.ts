import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const template = await prisma.sharedTemplate.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Toggle like
    const existing = await prisma.templateLike.findUnique({
        where: { userId_templateId: { userId: user.id, templateId: id } },
    })

    if (existing) {
        await prisma.templateLike.delete({ where: { id: existing.id } })
        await prisma.sharedTemplate.update({
            where: { id },
            data: { likes: { decrement: 1 } },
        })
        return NextResponse.json({ liked: false })
    } else {
        await prisma.templateLike.create({
            data: { userId: user.id, templateId: id },
        })
        await prisma.sharedTemplate.update({
            where: { id },
            data: { likes: { increment: 1 } },
        })
        return NextResponse.json({ liked: true })
    }
}
