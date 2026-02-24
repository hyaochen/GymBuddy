import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const equipment = await prisma.equipment.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ equipment })
}
