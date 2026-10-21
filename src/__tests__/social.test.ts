import { describe, it, expect, vi } from 'vitest'

// These modules import the Prisma client at load time; the functions under test are pure.
vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('@/lib/push-scheduler', () => ({ sendPushToMany: vi.fn(), sendPushNow: vi.fn() }))

import { classifyQuery } from '../lib/query-router'
import {
    DEFAULT_SOCIAL_PRIVACY,
    isFeedTypeVisibleToFriend,
    redactFeedData,
    resolvePrivacy,
} from '../lib/social-privacy'
import { selectSessionPRs } from '../lib/feed'
import { REJECT_COOLDOWN_MS, rejectCooldownDaysLeft } from '../lib/friends'
import { longestConsecutiveRun } from '../lib/badges'
import { isLocalAvatarUrl, isOwnAvatarUrl, profileHref, safeDecodeURIComponent } from '../lib/profile-safety'

describe('query router (B23)', () => {
    // Sample questions shown on the AI page under "ask about the books".
    const bookSamples = [
        '棒式的正確姿勢和常見錯誤？',
        '核心訓練對初學者有哪些動作推薦？',
        '深蹲時如何保護膝蓋和腰椎？',
        '訓練後有哪些適合的伸展放鬆動作？',
    ]
    it.each(bookSamples)('book sample goes to RAG: %s', q => {
        expect(classifyQuery(q).type).toBe('book-knowledge')
    })

    it('quick buttons keep their personal categories', () => {
        expect(classifyQuery('我的 PR 紀錄').type).toBe('direct')
        expect(classifyQuery('我這週的訓練頻率和訓練量？').type).toBe('direct')
        expect(classifyQuery('根據我最近的訓練，推薦今天練什麼？').type).toBe('recommendation')
        expect(classifyQuery('分析我的肌群訓練平衡，有哪些不足？').type).toBe('recommendation')
    })

    it('a picked book forces book knowledge', () => {
        expect(classifyQuery('我的 PR 紀錄', { bookFilter: 'core_strength' }).type).toBe('book-knowledge')
    })

    it('Latin "pr" only matches as a whole word', () => {
        expect(classifyQuery('我想了解 progressive overload program').type).not.toBe('direct')
        expect(classifyQuery('我的 PR 是多少').type).toBe('direct')
    })
})

describe('social privacy (B3)', () => {
    it('defaults match the UserProfile column defaults', () => {
        expect(resolvePrivacy(null)).toEqual(DEFAULT_SOCIAL_PRIVACY)
        expect(resolvePrivacy({ showWorkouts: false }).showWorkouts).toBe(false)
        expect(resolvePrivacy({ showWorkouts: false }).showStreak).toBe(true)
    })

    it('hides workout and streak items according to the owner toggles', () => {
        const p = resolvePrivacy({ showWorkouts: false, showStreak: false })
        expect(isFeedTypeVisibleToFriend('WORKOUT_COMPLETED', p)).toBe(false)
        expect(isFeedTypeVisibleToFriend('STREAK_MILESTONE', p)).toBe(false)
        expect(isFeedTypeVisibleToFriend('PR_ACHIEVED', p)).toBe(true)
        expect(isFeedTypeVisibleToFriend('WORKOUT_COMPLETED', resolvePrivacy(null))).toBe(true)
    })

    it('removes kg numbers for friends when showWeight is off, never for the owner', () => {
        const hidden = resolvePrivacy({ showWeight: false })
        const pr = { exerciseName: '深蹲', weightKg: 100, reps: 5, estimated1rm: 116 }
        expect(redactFeedData('PR_ACHIEVED', pr, hidden, false)).toEqual({ exerciseName: '深蹲', reps: 5 })
        expect(redactFeedData('PR_ACHIEVED', pr, hidden, true)).toEqual(pr)
        expect(redactFeedData('PR_ACHIEVED', pr, resolvePrivacy({ showWeight: true }), false)).toEqual(pr)

        const workout = { durationMin: 50, totalSets: 12, totalVolume: 5000 }
        expect(redactFeedData('WORKOUT_COMPLETED', workout, hidden, false)).toEqual({ durationMin: 50, totalSets: 12 })
    })
})

describe('PR feed window (A7/B2)', () => {
    const t = (min: number) => new Date(Date.UTC(2026, 9, 21, 10, min))
    const pr = (id: string, exerciseId: string, e1rm: number, min: number) => ({
        id, exerciseId, estimated1rm: e1rm, achievedAt: t(min),
    })

    it('keeps PRs set anywhere inside the session, not just the last minutes', () => {
        const picked = selectSessionPRs([pr('a', 'sq', 100, 10), pr('b', 'bp', 80, 55)], t(0), t(60))
        expect(picked.map(p => p.id).sort()).toEqual(['a', 'b'])
    })

    it('ignores PRs from other sessions', () => {
        const picked = selectSessionPRs([pr('old', 'sq', 90, -120), pr('next', 'sq', 95, 200)], t(0), t(60))
        expect(picked).toEqual([])
    })

    it('collapses several PRs of one exercise to the best one', () => {
        const picked = selectSessionPRs([pr('a', 'sq', 100, 10), pr('b', 'sq', 108, 30), pr('c', 'sq', 104, 45)], t(0), t(60))
        expect(picked.map(p => p.id)).toEqual(['b'])
    })
})

describe('friend invite cool-down (B10)', () => {
    const now = new Date('2026-10-21T00:00:00Z')
    it('is zero when never rejected', () => {
        expect(rejectCooldownDaysLeft(null, now)).toBe(0)
    })
    it('counts the remaining days inside 7 days', () => {
        expect(rejectCooldownDaysLeft(new Date(now.getTime() - 24 * 3600 * 1000), now)).toBe(6)
        expect(rejectCooldownDaysLeft(new Date(now.getTime() - 1000), now)).toBe(7)
    })
    it('ends after 7 days', () => {
        expect(rejectCooldownDaysLeft(new Date(now.getTime() - REJECT_COOLDOWN_MS), now)).toBe(0)
        expect(rejectCooldownDaysLeft(new Date(now.getTime() - REJECT_COOLDOWN_MS - 1), now)).toBe(0)
    })
})

describe('challenge streak window (B9)', () => {
    it('takes the longest consecutive run, ignoring duplicates and order', () => {
        expect(longestConsecutiveRun([])).toBe(0)
        expect(longestConsecutiveRun(['2026-10-01'])).toBe(1)
        expect(longestConsecutiveRun(['2026-10-03', '2026-10-01', '2026-10-02', '2026-10-02', '2026-10-05'])).toBe(3)
        expect(longestConsecutiveRun(['2026-10-01', '2026-10-03', '2026-10-05'])).toBe(1)
    })
})

describe('profile url safety (B12, B17)', () => {
    it('accepts only this user own uploaded avatar path', () => {
        expect(isOwnAvatarUrl('/api/avatar/u123.jpg?t=1700000000000', 'u123')).toBe(true)
        expect(isOwnAvatarUrl('/api/avatar/u123.png', 'u123')).toBe(true)
        expect(isOwnAvatarUrl('/api/avatar/u999.jpg', 'u123')).toBe(false)
        expect(isOwnAvatarUrl('https://evil.example/x.png', 'u123')).toBe(false)
        expect(isOwnAvatarUrl('//evil.example/api/avatar/u123.jpg', 'u123')).toBe(false)
        expect(isOwnAvatarUrl(42, 'u123')).toBe(false)
    })

    it('renders only local avatar paths', () => {
        expect(isLocalAvatarUrl('/api/avatar/abc.webp?t=5')).toBe(true)
        expect(isLocalAvatarUrl('https://tracker.example/pixel.png')).toBe(false)
        expect(isLocalAvatarUrl('/api/avatar/../../etc/passwd')).toBe(false)
        expect(isLocalAvatarUrl(null)).toBe(false)
    })

    it('encodes nicknames in links and survives malformed escapes', () => {
        expect(profileHref('a/b?c#d')).toBe('/profile/a%2Fb%3Fc%23d')
        expect(safeDecodeURIComponent('%E4%BD%A0')).toBe('你')
        expect(safeDecodeURIComponent('%E0%A4%A')).toBeNull()
    })
})
