import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const plan = await prisma.workoutPlan.findUnique({
        where: { id },
        include: {
            days: {
                include: {
                    exercises: {
                        include: { exercise: { include: { muscles: { include: { muscleGroup: true } } } } },
                        orderBy: { orderIndex: 'asc' },
                    },
                },
                orderBy: { orderIndex: 'asc' },
            },
        },
    })

    if (!plan || plan.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ plan })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const plan = await prisma.workoutPlan.findUnique({ where: { id } })
    if (!plan || plan.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, description, daysPerWeek } = body

    const updated = await prisma.workoutPlan.update({
        where: { id },
        data: { name, description, daysPerWeek },
    })

    return NextResponse.json({ plan: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const plan = await prisma.workoutPlan.findUnique({ where: { id } })
    if (!plan || plan.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.workoutPlan.update({
        where: { id },
        data: { isActive: false },
    })

    return NextResponse.json({ success: true })
}
