import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const exercise = await prisma.exercise.findUnique({
        where: { id },
        include: {
            muscles: { include: { muscleGroup: true }, orderBy: { isPrimary: 'desc' } },
            equipment: { include: { equipment: true } },
            alternatives: {
                include: {
                    alternative: {
                        include: {
                            muscles: { include: { muscleGroup: true }, where: { isPrimary: true } },
                            equipment: { include: { equipment: true } },
                        },
                    },
                },
            },
        },
    })

    if (!exercise) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ exercise })
}
