import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendPushNow } from '@/lib/push-scheduler'
import { createRateLimiter } from '@/lib/rate-limiter'
import { rejectCooldownDaysLeft } from '@/lib/friends'
import { canNotify } from '@/lib/social-privacy'

// 20 friend-requests per user per hour — stops push-spam abuse.
const friendRequestLimiter = createRateLimiter({ namespace: 'friends:request', maxAttempts: 20, windowMs: 60 * 60 * 1000 })

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (await friendRequestLimiter.isBlocked(user.id)) {
        const mins = Math.ceil(await friendRequestLimiter.remainingSeconds(user.id) / 60)
        return NextResponse.json(
            { error: `好友邀請過於頻繁，請 ${mins} 分鐘後再試` },
            { status: 429 }
        )
    }

    let body: { username?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: '請求內容格式錯誤' }, { status: 400 })
    }
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    if (!username) {
        return NextResponse.json({ error: '請提供使用者名稱' }, { status: 400 })
    }

    // Names are unique case-insensitively (see register), so look them up the same way.
    if (username.toLowerCase() === user.name.toLowerCase()) {
        return NextResponse.json({ error: '不能加自己為好友' }, { status: 400 })
    }

    const candidates = await prisma.user.findMany({
        where: { name: { equals: username, mode: 'insensitive' } },
        take: 5,
    })
    const target = candidates.find(u => u.name === username) ?? candidates[0]
    if (!target) {
        return NextResponse.json({ error: '找不到該使用者' }, { status: 404 })
    }
    if (target.id === user.id) {
        return NextResponse.json({ error: '不能加自己為好友' }, { status: 400 })
    }

    // Check existing friendship in either direction
    const existing = await prisma.friendship.findFirst({
        where: {
            OR: [
                { requesterId: user.id, receiverId: target.id },
                { requesterId: target.id, receiverId: user.id },
            ],
        },
    })

    if (existing) {
        if (existing.status === 'ACCEPTED') {
            return NextResponse.json({ error: '你們已經是好友了' }, { status: 400 })
        }
        if (existing.status === 'PENDING') {
            return NextResponse.json({ error: '已有待處理的好友邀請' }, { status: 400 })
        }
        if (existing.status === 'BLOCKED') {
            return NextResponse.json({ error: '無法發送好友邀請' }, { status: 400 })
        }
        if (existing.status === 'REJECTED') {
            // Only the person who was rejected is throttled; the rejecter may invite freely.
            const daysLeft = existing.requesterId === user.id ? rejectCooldownDaysLeft(existing.rejectedAt) : 0
            if (daysLeft > 0) {
                return NextResponse.json(
                    { error: `對方先前拒絕了你的邀請，請於 ${daysLeft} 天後再試` },
                    { status: 400 }
                )
            }
            // Cool-down over (or reversed direction): drop the old row so a fresh invite can be stored.
            await prisma.friendship.delete({ where: { id: existing.id } })
        }
    }

    const friendship = await prisma.friendship.create({
        data: { requesterId: user.id, receiverId: target.id },
    })

    await friendRequestLimiter.record(user.id)

    // Notify the receiver via push
    const displayName = user.name
    if (await canNotify(target.id)) {
        sendPushNow(target.id, `${displayName} 想加你為好友`, '點擊查看並回覆', 'friend-request')
            .catch(console.error)
    }

    return NextResponse.json({ success: true, id: friendship.id })
}
