import { describe, it, expect } from 'vitest'
import {
    compareSessionExercises,
    hideReplacedExercises,
    resolveSubstituteDefaults,
    computeSessionDurationMin,
    isNewPersonalRecord,
    formatWeightSuggestion,
    describeSetSaveFailure,
    summarizeSession,
    LEAD_IN_MS,
} from '../lib/session-logic'
import { planPushRecovery } from '../lib/push-recovery'
import { suggestNextWeight } from '../lib/progressive-overload'

const ex = (id: string, exerciseId: string, orderIndex: number, setCount = 0, substituteForId: string | null = null) => ({
    id, exerciseId, orderIndex, substituteForId, sets: Array.from({ length: setCount }, () => ({})),
})

describe('hideReplacedExercises', () => {
    it('隱藏已被替代且沒有任何 set 的原動作，替代者留在原位置', () => {
        const list = [ex('c', 'E3', 2), ex('a', 'E1', 0), ex('b', 'E2', 1), ex('b2', 'E9', 1, 0, 'b')]
        expect(hideReplacedExercises(list).map(e => e.id)).toEqual(['a', 'b2', 'c'])
    })

    it('原動作已有 set 時兩者都保留，且原動作在替代者前面', () => {
        const list = [ex('b2', 'E9', 1, 0, 'b'), ex('b', 'E2', 1, 2)]
        expect(hideReplacedExercises(list).map(e => e.id)).toEqual(['b', 'b2'])
    })

    it('連續替代：中間沒有 set 的都被隱藏', () => {
        const list = [ex('a', 'E1', 0), ex('a2', 'E2', 0, 0, 'a'), ex('a3', 'E3', 0, 1, 'a2')]
        expect(hideReplacedExercises(list).map(e => e.id)).toEqual(['a3'])
    })

    it('沒有替代時不改變內容', () => {
        const list = [ex('a', 'E1', 0), ex('b', 'E2', 1)]
        expect(hideReplacedExercises(list)).toHaveLength(2)
    })

    it('orderIndex 相同時以 id 當次排序', () => {
        expect(compareSessionExercises({ orderIndex: 1, id: 'a' }, { orderIndex: 1, id: 'b' })).toBeLessThan(0)
        expect(compareSessionExercises({ orderIndex: 2, id: 'a' }, { orderIndex: 1, id: 'b' })).toBeGreaterThan(0)
    })
})

describe('resolveSubstituteDefaults', () => {
    const defaults = { E1: { sets: 4 }, E2: { sets: 5 } }

    it('替代者沿用原動作的 defaults', () => {
        const out = resolveSubstituteDefaults([ex('a', 'E1', 0), ex('a2', 'E9', 0, 0, 'a')], defaults)
        expect(out.E9).toEqual({ sets: 4 })
    })

    it('沿 substituteFor 鏈往上找', () => {
        const out = resolveSubstituteDefaults(
            [ex('a', 'E1', 0), ex('a2', 'E8', 0, 0, 'a'), ex('a3', 'E9', 0, 0, 'a2')],
            defaults,
        )
        expect(out.E9).toEqual({ sets: 4 })
    })

    it('不覆蓋替代動作自己已有的 defaults', () => {
        const out = resolveSubstituteDefaults([ex('a', 'E1', 0), ex('a2', 'E2', 0, 0, 'a')], defaults)
        expect(out.E2).toEqual({ sets: 5 })
    })
})

describe('computeSessionDurationMin', () => {
    const t = (min: number) => new Date(Date.UTC(2026, 9, 21, 10, 0, 0) + min * 60000)

    it('沒有 set 為 0', () => {
        expect(computeSessionDurationMin(t(0), [])).toBe(0)
    })

    it('第一組到最後一組，加上首組前緩衝', () => {
        // started 10:00, first set 10:05, last set 10:50 -> 10:03 .. 10:50 = 47
        expect(computeSessionDurationMin(t(0), [t(5), t(30), t(50)])).toBe(47)
        expect(LEAD_IN_MS).toBe(120000)
    })

    it('緩衝不會早於 startedAt', () => {
        expect(computeSessionDurationMin(t(0), [t(1), t(11)])).toBe(11)
    })

    it('隔天才完成不會灌水：只看 set 時間', () => {
        const nextDay = new Date(t(0).getTime() + 24 * 3600 * 1000)
        expect(computeSessionDurationMin(t(0), [t(5), t(45)])).toBe(42)
        expect(computeSessionDurationMin(t(0), [t(5), t(45)])).toBeLessThan(
            Math.round((nextDay.getTime() - t(0).getTime()) / 60000),
        )
    })
})

describe('isNewPersonalRecord', () => {
    const base = { isTimeBased: false, weightKg: 100, reps: 5, historicalBest1rm: 110, sessionBest1rm: 0 }

    it('高於歷史最佳 1RM 為 PR', () => {
        expect(isNewPersonalRecord(base)).toBe(true) // 100 x5 -> 116.75
    })

    it('沒有超過歷史最佳不是 PR', () => {
        expect(isNewPersonalRecord({ ...base, historicalBest1rm: 120 })).toBe(false)
    })

    it('同一場訓練前面組已打破就不重複宣告', () => {
        expect(isNewPersonalRecord({ ...base, sessionBest1rm: 116.75 })).toBe(false)
        expect(isNewPersonalRecord({ ...base, weightKg: 105, sessionBest1rm: 116.75 })).toBe(true)
    })

    it('限時動作與 0 重量不算', () => {
        expect(isNewPersonalRecord({ ...base, isTimeBased: true })).toBe(false)
        expect(isNewPersonalRecord({ ...base, weightKg: 0 })).toBe(false)
    })

    it('從沒做過這個動作時第一組不宣告 PR', () => {
        expect(isNewPersonalRecord({ ...base, historicalBest1rm: null })).toBe(false)
    })
})

describe('suggestNextWeight', () => {
    const plan = { defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, defaultWeightKg: 20 }
    const sets = (weight: number, reps: number[]) =>
        reps.map((r, i) => ({ setNumber: i + 1, repsPerformed: r, weightKg: weight }))

    it('全部做完且達上限次數：建議加重', () => {
        const s = suggestNextWeight(plan, sets(40, [12, 12, 12]))
        expect(s).toMatchObject({ weightKg: 42.5, deltaKg: 2.5, method: 'PROGRESSIVE_OVERLOAD' })
    })

    it('做完但沒到上限：維持', () => {
        const s = suggestNextWeight(plan, sets(40, [10, 9, 9]))
        expect(s).toMatchObject({ weightKg: 40, deltaKg: 0, method: 'MAINTAIN' })
    })

    it('沒做完：減重（delta 為負）', () => {
        const s = suggestNextWeight(plan, sets(40, [8, 6]))
        expect(s?.method).toBe('DELOAD')
        expect(s!.deltaKg).toBeLessThan(0)
    })

    it('沒有歷史或上次重量為 0（徒手）時不建議', () => {
        expect(suggestNextWeight(plan, [])).toBeNull()
        expect(suggestNextWeight(plan, sets(0, [12, 12, 12]))).toBeNull()
    })
})

describe('formatWeightSuggestion / describeSetSaveFailure', () => {
    it('標示加重、維持、減重', () => {
        expect(formatWeightSuggestion(2.5)).toBe('建議 +2.5 kg')
        expect(formatWeightSuggestion(0)).toBe('建議維持')
        expect(formatWeightSuggestion(-3)).toBe('建議 -3 kg')
    })

    it('401 提示重新登入，409 提示已結束', () => {
        expect(describeSetSaveFailure(401).title).toContain('登入')
        expect(describeSetSaveFailure(409).title).toContain('結束')
        expect(describeSetSaveFailure(500).description).toContain('保留')
    })
})

describe('planPushRecovery', () => {
    const now = Date.UTC(2026, 9, 21, 12, 0, 0)
    const job = (id: string, offsetMs: number) => ({ id, userId: 'u', tag: `t-${id}`, fireAt: new Date(now + offsetMs) })

    it('未到期的重新排程，delay 為剩餘時間', () => {
        const { rearm, expireIds } = planPushRecovery([job('a', 30_000)], now)
        expect(expireIds).toEqual([])
        expect(rearm).toEqual([{ userId: 'u', tag: 't-a', delayMs: 30_000 }])
    })

    it('剛過期（2 分鐘內）立刻補送，delay 為 0', () => {
        const { rearm } = planPushRecovery([job('b', -60_000)], now)
        expect(rearm[0].delayMs).toBe(0)
    })

    it('過期超過 2 分鐘標記為過期不送', () => {
        const { rearm, expireIds } = planPushRecovery([job('c', -3 * 60_000), job('d', 5_000)], now)
        expect(expireIds).toEqual(['c'])
        expect(rearm.map(r => r.tag)).toEqual(['t-d'])
    })
})

describe('summarizeSession', () => {
    const se = (id: string, exerciseId: string, name: string, isTimeBased: boolean, sets: Array<[number, number, number, number | null]>) => ({
        id, exerciseId, substituteForId: null, exercise: { name, isTimeBased },
        sets: sets.map(([setNumber, repsPerformed, weightKg, durationSeconds]) => ({ setNumber, repsPerformed, weightKg, durationSeconds })),
    })
    const plan = { E1: { defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, defaultWeightKg: 20 } }

    it('算出組數、總量，限時動作不計量也不給建議', () => {
        const out = summarizeSession(
            [se('a', 'E1', '臥推', false, [[1, 10, 40, null], [2, 10, 40, null], [3, 10, 40, null]]), se('b', 'E2', '棒式', true, [[1, 1, 0, 45]])],
            plan,
            42,
        )
        expect(out.durationMin).toBe(42)
        expect(out.totalSets).toBe(4)
        expect(out.totalVolume).toBe(1200)
        expect(out.suggestions).toHaveLength(1)
    })

    it('沒有任何 set 時回傳 0', () => {
        const out = summarizeSession([se('a', 'E1', '臥推', false, [])], plan, 0)
        expect(out.totalSets).toBe(0)
        expect(out.suggestions).toEqual([])
    })
})
