import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const alternatives = await prisma.exerciseAlternative.findMany({
        where: { exerciseId: id },
        include: {
            alternative: {
                include: {
                    muscles: { include: { muscleGroup: true }, where: { isPrimary: true } },
                    equipment: { include: { equipment: true } },
                },
            },
        },
    })

    return NextResponse.json({ alternatives: alternatives.map(a => a.alternative) })
}
