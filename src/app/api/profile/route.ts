import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getStreakInfo } from '@/lib/streak'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [profile, userRecord, streakInfo, totalSessions] = await Promise.all([
        prisma.userProfile.findUnique({ where: { userId: user.id } }),
        prisma.user.findUnique({
            where: { id: user.id },
            select: { createdAt: true },
        }),
        getStreakInfo(user.id),
        prisma.workoutSession.count({
            where: { userId: user.id, completedAt: { not: null } },
        }),
    ])

    return NextResponse.json({
        name: user.name,
        email: user.email,
        createdAt: userRecord?.createdAt,
        profile: profile || {
            displayName: null,
            bio: null,
            avatarUrl: null,
            showStreak: true,
            showWorkouts: true,
            showPRs: false,
            showWeight: false,
            publicAnalytics: false,
        },
        stats: {
            totalSessions,
            currentStreak: streakInfo.currentStreak,
            longestStreak: streakInfo.longestStreak,
        },
    })
}

export async function PATCH(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { displayName: rawDisplayName, bio: rawBio, avatarUrl, showStreak, showWorkouts, showPRs, showWeight, publicAnalytics } = body

    // Length guards — prevent 10MB bio DoS / payload bloat.
    const displayName =
        typeof rawDisplayName === 'string' ? rawDisplayName.trim().slice(0, 50) : rawDisplayName
    const bio = typeof rawBio === 'string' ? rawBio.trim().slice(0, 500) : rawBio

    const profile = await prisma.userProfile.upsert({
        where: { userId: user.id },
        create: {
            userId: user.id,
            displayName: displayName ?? null,
            bio: bio ?? null,
            avatarUrl: avatarUrl ?? null,
            showStreak: showStreak ?? true,
            showWorkouts: showWorkouts ?? true,
            showPRs: showPRs ?? false,
            showWeight: showWeight ?? false,
            publicAnalytics: publicAnalytics ?? false,
        },
        update: {
            ...(displayName !== undefined && { displayName }),
            ...(bio !== undefined && { bio }),
            ...(avatarUrl !== undefined && { avatarUrl }),
            ...(showStreak !== undefined && { showStreak }),
            ...(showWorkouts !== undefined && { showWorkouts }),
            ...(showPRs !== undefined && { showPRs }),
            ...(showWeight !== undefined && { showWeight }),
            ...(publicAnalytics !== undefined && { publicAnalytics }),
        },
    })

    return NextResponse.json({ success: true, profile })
}
