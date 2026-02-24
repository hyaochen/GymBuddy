import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

async function verifySetOwnership(setId: string, userId: string) {
    return prisma.sessionSet.findFirst({
        where: {
            id: setId,
            sessionExercise: { session: { userId } },
        },
    })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ setId: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { setId } = await params
    const existing = await verifySetOwnership(setId, user.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { repsPerformed, weightKg } = body
    if (repsPerformed === undefined && weightKg === undefined) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const updated = await prisma.sessionSet.update({
        where: { id: setId },
        data: {
            ...(repsPerformed !== undefined && { repsPerformed: Number(repsPerformed) }),
            ...(weightKg !== undefined && { weightKg: Number(weightKg) }),
        },
    })

    return NextResponse.json({ set: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ setId: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { setId } = await params
    const existing = await verifySetOwnership(setId, user.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.sessionSet.delete({ where: { id: setId } })
    return NextResponse.json({ success: true })
}
