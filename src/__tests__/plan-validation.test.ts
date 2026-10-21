import { describe, it, expect } from 'vitest'
import {
    createPlanSchema,
    updatePlanExerciseSchema,
    createPlanExerciseSchema,
    checkRanges,
} from '@/lib/validation'

const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
    r.error?.issues[0]?.message

describe('createPlanSchema', () => {
    it('接受合法計畫', () => {
        const r = createPlanSchema.safeParse({
            name: '推拉腿',
            days: [{ dayName: 'Push', exercises: [{ exerciseId: 'abc', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, defaultWeightKg: 20 }] }],
        })
        expect(r.success).toBe(true)
    })
    it('空白名稱被拒', () => {
        expect(createPlanSchema.safeParse({ name: '   ' }).success).toBe(false)
    })
    it('NaN 重量被拒而不是默默變 0', () => {
        const r = createPlanSchema.safeParse({
            name: 'x',
            days: [{ dayName: 'd', exercises: [{ exerciseId: 'a', defaultWeightKg: NaN }] }],
        })
        expect(r.success).toBe(false)
    })
    it('次數下限大於上限被拒', () => {
        const r = createPlanSchema.safeParse({
            name: 'x',
            days: [{ dayName: 'd', exercises: [{ exerciseId: 'a', defaultRepsMin: 12, defaultRepsMax: 8 }] }],
        })
        expect(r.success).toBe(false)
        expect(msg(r)).toBe('次數下限不可大於上限')
    })
})

describe('updatePlanExerciseSchema', () => {
    it('組數 1-20', () => {
        expect(updatePlanExerciseSchema.safeParse({ defaultSets: 0 }).success).toBe(false)
        expect(updatePlanExerciseSchema.safeParse({ defaultSets: 21 }).success).toBe(false)
        expect(updatePlanExerciseSchema.safeParse({ defaultSets: 20 }).success).toBe(true)
    })
    it('重量 0-1000', () => {
        expect(updatePlanExerciseSchema.safeParse({ defaultWeightKg: -1 }).success).toBe(false)
        expect(updatePlanExerciseSchema.safeParse({ defaultWeightKg: 1001 }).success).toBe(false)
        expect(updatePlanExerciseSchema.safeParse({ defaultWeightKg: 1000 }).success).toBe(true)
    })
    it('休息 0-600 秒', () => {
        expect(updatePlanExerciseSchema.safeParse({ restSeconds: 601 }).success).toBe(false)
        expect(updatePlanExerciseSchema.safeParse({ restSeconds: 0 }).success).toBe(true)
    })
    it('秒數 1-3600 且 min<=max', () => {
        expect(updatePlanExerciseSchema.safeParse({ defaultDurationMin: 0 }).success).toBe(false)
        expect(updatePlanExerciseSchema.safeParse({ defaultDurationMax: 3601 }).success).toBe(false)
        expect(updatePlanExerciseSchema.safeParse({ defaultDurationMin: 40, defaultDurationMax: 30 }).success).toBe(false)
        expect(updatePlanExerciseSchema.safeParse({ defaultDurationMin: 20, defaultDurationMax: 30 }).success).toBe(true)
    })
    it('字串數字被拒', () => {
        expect(updatePlanExerciseSchema.safeParse({ defaultWeightKg: '20' }).success).toBe(false)
    })
})

describe('createPlanExerciseSchema', () => {
    it('缺 dayId 被拒', () => {
        expect(createPlanExerciseSchema.safeParse({ exerciseId: 'a' }).success).toBe(false)
    })
    it('可帶秒數範圍', () => {
        expect(createPlanExerciseSchema.safeParse({ dayId: 'd', exerciseId: 'a', defaultDurationMin: 20, defaultDurationMax: 40 }).success).toBe(true)
    })
})

describe('checkRanges', () => {
    it('null 不檢查', () => {
        expect(checkRanges({ defaultDurationMin: null, defaultDurationMax: 10 })).toBeNull()
    })
})
