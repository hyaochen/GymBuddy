import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const muscleGroups = await prisma.muscleGroup.findMany({
        orderBy: [{ bodyRegion: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ muscleGroups })
}
