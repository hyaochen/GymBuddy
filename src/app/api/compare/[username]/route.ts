import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { username } = await params
    const url = new URL(req.url)
    const exerciseId = url.searchParams.get('exerciseId')

    if (!exerciseId) {
        return NextResponse.json({ error: '請選擇一個動作' }, { status: 400 })
    }

    // Find the friend
    const friend = await prisma.user.findUnique({
        where: { name: username },
        include: { profile: true },
    })

    if (!friend) {
        return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    // Check friendship
    const friendship = await prisma.friendship.findFirst({
        where: {
            status: 'ACCEPTED',
            OR: [
                { requesterId: user.id, receiverId: friend.id },
                { requesterId: friend.id, receiverId: user.id },
            ],
        },
    })

    if (!friendship) {
        return NextResponse.json({ error: '你們還不是好友' }, { status: 403 })
    }

    // Check privacy: both must have showPRs enabled
    const myProfile = await prisma.userProfile.findUnique({ where: { userId: user.id } })
    const myShowPRs = myProfile?.showPRs ?? false
    const friendShowPRs = friend.profile?.showPRs ?? false

    if (!myShowPRs || !friendShowPRs) {
        return NextResponse.json({
            error: '雙方都必須啟用「顯示個人最佳紀錄」才能比較',
            myShowPRs,
            friendShowPRs,
        }, { status: 403 })
    }

    // Get 12 weeks of PR data for both users
    const twelveWeeksAgo = new Date()
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

    const [myPRs, friendPRs, exercise] = await Promise.all([
        prisma.personalRecord.findMany({
            where: {
                userId: user.id,
                exerciseId,
                achievedAt: { gte: twelveWeeksAgo },
            },
            orderBy: { achievedAt: 'asc' },
            select: { weightKg: true, reps: true, estimated1rm: true, achievedAt: true },
        }),
        prisma.personalRecord.findMany({
            where: {
                userId: friend.id,
                exerciseId,
                achievedAt: { gte: twelveWeeksAgo },
            },
            orderBy: { achievedAt: 'asc' },
            select: { weightKg: true, reps: true, estimated1rm: true, achievedAt: true },
        }),
        prisma.exercise.findUnique({
            where: { id: exerciseId },
            select: { name: true },
        }),
    ])

    return NextResponse.json({
        exercise: exercise?.name || 'Unknown',
        myName: user.name,
        friendName: friend.name,
        myData: myPRs.map(pr => ({
            date: pr.achievedAt,
            weightKg: Number(pr.weightKg),
            reps: pr.reps,
            estimated1rm: Number(pr.estimated1rm),
        })),
        friendData: friendPRs.map(pr => ({
            date: pr.achievedAt,
            weightKg: Number(pr.weightKg),
            reps: pr.reps,
            estimated1rm: Number(pr.estimated1rm),
        })),
    })
}
