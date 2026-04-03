import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [sent, received] = await Promise.all([
        prisma.friendship.findMany({
            where: { requesterId: user.id },
            include: { receiver: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.friendship.findMany({
            where: { receiverId: user.id },
            include: { requester: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        }),
    ])

    const friends = [
        ...sent.filter(f => f.status === 'ACCEPTED').map(f => ({
            friendshipId: f.id,
            userId: f.receiver.id,
            name: f.receiver.name,
            since: f.createdAt,
        })),
        ...received.filter(f => f.status === 'ACCEPTED').map(f => ({
            friendshipId: f.id,
            userId: f.requester.id,
            name: f.requester.name,
            since: f.createdAt,
        })),
    ]

    const pendingReceived = received
        .filter(f => f.status === 'PENDING')
        .map(f => ({
            friendshipId: f.id,
            userId: f.requester.id,
            name: f.requester.name,
            sentAt: f.createdAt,
        }))

    const pendingSent = sent
        .filter(f => f.status === 'PENDING')
        .map(f => ({
            friendshipId: f.id,
            userId: f.receiver.id,
            name: f.receiver.name,
            sentAt: f.createdAt,
        }))

    return NextResponse.json({ friends, pendingReceived, pendingSent })
}
