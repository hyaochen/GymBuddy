import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getStreakInfo } from '@/lib/streak'
import { isOwnAvatarUrl } from '@/lib/profile-safety'

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
            notifySocial: true,
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

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: '請求內容格式錯誤' }, { status: 400 })
    }
    const { displayName: rawDisplayName, bio: rawBio, avatarUrl } = body
    const flags = ['showStreak', 'showWorkouts', 'showPRs', 'showWeight', 'publicAnalytics', 'notifySocial'] as const
    for (const key of flags) {
        if (body[key] !== undefined && typeof body[key] !== 'boolean') {
            return NextResponse.json({ error: `${key} 必須是布林值` }, { status: 400 })
        }
    }
    for (const raw of [rawDisplayName, rawBio]) {
        if (raw !== undefined && raw !== null && typeof raw !== 'string') {
            return NextResponse.json({ error: '欄位格式錯誤' }, { status: 400 })
        }
    }
    // Only this site's own upload path (or null to clear) is a valid avatar.
    if (avatarUrl !== undefined && avatarUrl !== null && !isOwnAvatarUrl(avatarUrl, user.id)) {
        return NextResponse.json({ error: '頭像網址無效，請使用上傳功能' }, { status: 400 })
    }
    const showStreak = body.showStreak as boolean | undefined
    const showWorkouts = body.showWorkouts as boolean | undefined
    const showPRs = body.showPRs as boolean | undefined
    const showWeight = body.showWeight as boolean | undefined
    const publicAnalytics = body.publicAnalytics as boolean | undefined
    const notifySocial = body.notifySocial as boolean | undefined

    // Length guards — prevent 10MB bio DoS / payload bloat.
    const displayName =
        typeof rawDisplayName === 'string' ? rawDisplayName.trim().slice(0, 50) : (rawDisplayName as null | undefined)
    const bio = typeof rawBio === 'string' ? rawBio.trim().slice(0, 500) : (rawBio as null | undefined)

    const profile = await prisma.userProfile.upsert({
        where: { userId: user.id },
        create: {
            userId: user.id,
            displayName: displayName ?? null,
            bio: bio ?? null,
            avatarUrl: (avatarUrl as string | null | undefined) ?? null,
            showStreak: showStreak ?? true,
            showWorkouts: showWorkouts ?? true,
            showPRs: showPRs ?? false,
            showWeight: showWeight ?? false,
            publicAnalytics: publicAnalytics ?? false,
            notifySocial: notifySocial ?? true,
        },
        update: {
            ...(displayName !== undefined && { displayName }),
            ...(bio !== undefined && { bio }),
            ...(avatarUrl !== undefined && { avatarUrl: avatarUrl as string | null }),
            ...(showStreak !== undefined && { showStreak }),
            ...(showWorkouts !== undefined && { showWorkouts }),
            ...(showPRs !== undefined && { showPRs }),
            ...(showWeight !== undefined && { showWeight }),
            ...(publicAnalytics !== undefined && { publicAnalytics }),
            ...(notifySocial !== undefined && { notifySocial }),
        },
    })

    return NextResponse.json({ success: true, profile })
}
