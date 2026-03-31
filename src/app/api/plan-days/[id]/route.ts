import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const day = await prisma.workoutPlanDay.findUnique({
        where: { id },
        include: { plan: true },
    })
    if (!day || day.plan.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const updated = await prisma.workoutPlanDay.update({
        where: { id },
        data: { ...(body.dayName !== undefined && { dayName: body.dayName }) },
    })
    return NextResponse.json({ day: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const day = await prisma.workoutPlanDay.findUnique({
        where: { id },
        include: { plan: true },
    })
    if (!day || day.plan.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.workoutPlanDay.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
