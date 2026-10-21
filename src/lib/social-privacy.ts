import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Single place that decides what a friend may see of someone's activity and
 * who may be pushed a notification. Every feed / profile / push path goes
 * through these helpers so the privacy toggles behave the same everywhere.
 */

export interface SocialPrivacy {
    showWorkouts: boolean
    showStreak: boolean
    showPRs: boolean
    showWeight: boolean
    notifySocial: boolean
}

/** Mirrors the column defaults of UserProfile (a user without a row uses these). */
export const DEFAULT_SOCIAL_PRIVACY: SocialPrivacy = {
    showWorkouts: true,
    showStreak: true,
    showPRs: false,
    showWeight: false,
    notifySocial: true,
}

type ProfileLike = Partial<SocialPrivacy> | null | undefined

export function resolvePrivacy(profile: ProfileLike): SocialPrivacy {
    return {
        showWorkouts: profile?.showWorkouts ?? DEFAULT_SOCIAL_PRIVACY.showWorkouts,
        showStreak: profile?.showStreak ?? DEFAULT_SOCIAL_PRIVACY.showStreak,
        showPRs: profile?.showPRs ?? DEFAULT_SOCIAL_PRIVACY.showPRs,
        showWeight: profile?.showWeight ?? DEFAULT_SOCIAL_PRIVACY.showWeight,
        notifySocial: profile?.notifySocial ?? DEFAULT_SOCIAL_PRIVACY.notifySocial,
    }
}

export async function getPrivacyMap(userIds: string[]): Promise<Map<string, SocialPrivacy>> {
    const map = new Map<string, SocialPrivacy>()
    if (userIds.length === 0) return map
    const rows = await prisma.userProfile.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, showWorkouts: true, showStreak: true, showPRs: true, showWeight: true, notifySocial: true },
    })
    const byId = new Map(rows.map(r => [r.userId, r]))
    for (const id of userIds) map.set(id, resolvePrivacy(byId.get(id)))
    return map
}

/** Can a friend (not the owner) see this kind of feed item at all? */
export function isFeedTypeVisibleToFriend(type: string, privacy: SocialPrivacy): boolean {
    if (type === 'WORKOUT_COMPLETED') return privacy.showWorkouts
    if (type === 'STREAK_MILESTONE') return privacy.showStreak
    return true
}

/**
 * Remove numbers a friend must not see when the owner turned showWeight off.
 * The owner always sees the full payload.
 */
export function redactFeedData<T extends Record<string, unknown> | null>(
    type: string,
    data: T,
    privacy: SocialPrivacy,
    isOwner: boolean,
): T {
    if (!data || isOwner || privacy.showWeight) return data
    const copy: Record<string, unknown> = { ...data }
    if (type === 'WORKOUT_COMPLETED') {
        delete copy.totalVolume
    } else if (type === 'PR_ACHIEVED') {
        delete copy.weightKg
        delete copy.estimated1rm
    }
    return copy as T
}

/**
 * Prisma `where` that selects the public feed items a viewer may see for the
 * given friends, with showWorkouts / showStreak applied.
 */
export async function friendFeedWhere(friendIds: string[]): Promise<Prisma.ActivityFeedItemWhereInput> {
    if (friendIds.length === 0) return { id: { in: [] } }
    const privacy = await getPrivacyMap(friendIds)
    const hideWorkouts = friendIds.filter(id => !privacy.get(id)!.showWorkouts)
    const hideStreak = friendIds.filter(id => !privacy.get(id)!.showStreak)
    const exclusions: Prisma.ActivityFeedItemWhereInput[] = []
    if (hideWorkouts.length > 0) exclusions.push({ type: 'WORKOUT_COMPLETED', userId: { in: hideWorkouts } })
    if (hideStreak.length > 0) exclusions.push({ type: 'STREAK_MILESTONE', userId: { in: hideStreak } })
    return {
        userId: { in: friendIds },
        isPublic: true,
        ...(exclusions.length > 0 ? { NOT: { OR: exclusions } } : {}),
    }
}

/** Keep only recipients who have not switched social notifications off. */
export async function filterNotifiable(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return []
    const privacy = await getPrivacyMap(userIds)
    return userIds.filter(id => privacy.get(id)!.notifySocial)
}

export async function canNotify(userId: string): Promise<boolean> {
    return (await filterNotifiable([userId])).length > 0
}
