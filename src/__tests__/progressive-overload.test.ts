import { describe, it, expect } from 'vitest'
import { generateOverloadSuggestion } from '../lib/progressive-overload'

const defaultPlan = {
    defaultSets: 3,
    defaultRepsMin: 8,
    defaultRepsMax: 12,
    defaultWeightKg: 40,
}

describe('generateOverloadSuggestion', () => {
    // ─── First Session (no history) ───
    describe('首次訓練', () => {
        it('空歷史 → 使用計畫預設重量', () => {
            const result = generateOverloadSuggestion('ex1', '臥推', defaultPlan, [])
            expect(result.method).toBe('PROGRESSIVE_OVERLOAD')
            expect(result.suggestedSets).toHaveLength(3)
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(40)
            expect(result.reasoning).toContain('首次訓練')
        })

        it('無預設重量 → fallback 20kg', () => {
            const plan = { ...defaultPlan, defaultWeightKg: null }
            const result = generateOverloadSuggestion('ex1', '臥推', plan, [])
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(20)
        })

        it('預設重量為字串 → 正確轉換為數字', () => {
            const plan = { ...defaultPlan, defaultWeightKg: '35.5' }
            const result = generateOverloadSuggestion('ex1', '臥推', plan, [])
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(35.5)
        })
    })

    // ─── Progressive Overload (all sets completed, avg reps ≥ max) ───
    describe('漸進超負荷（加重）', () => {
        it('全部完成且平均次數 ≥ max → 加重 2.5kg（≥20kg）', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 12, weightKg: 40 },
                { setNumber: 2, repsPerformed: 12, weightKg: 40 },
                { setNumber: 3, repsPerformed: 12, weightKg: 40 },
            ]
            const result = generateOverloadSuggestion('ex1', '臥推', defaultPlan, sets)
            expect(result.method).toBe('PROGRESSIVE_OVERLOAD')
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(42.5)
        })

        it('輕重量（<20kg）→ 加重 1.25kg', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 12, weightKg: 15 },
                { setNumber: 2, repsPerformed: 12, weightKg: 15 },
                { setNumber: 3, repsPerformed: 12, weightKg: 15 },
            ]
            const result = generateOverloadSuggestion('ex1', '側平舉', defaultPlan, sets)
            expect(result.method).toBe('PROGRESSIVE_OVERLOAD')
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(16.25)
        })

        it('weightKg 為字串 → 正確轉換', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 12, weightKg: '40' as any },
                { setNumber: 2, repsPerformed: 12, weightKg: '40' as any },
                { setNumber: 3, repsPerformed: 12, weightKg: '40' as any },
            ]
            const result = generateOverloadSuggestion('ex1', '臥推', defaultPlan, sets)
            expect(result.method).toBe('PROGRESSIVE_OVERLOAD')
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(42.5)
        })

        it('超過平均次數也觸發加重', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 15, weightKg: 40 },
                { setNumber: 2, repsPerformed: 14, weightKg: 40 },
                { setNumber: 3, repsPerformed: 13, weightKg: 40 },
            ]
            const result = generateOverloadSuggestion('ex1', '臥推', defaultPlan, sets)
            expect(result.method).toBe('PROGRESSIVE_OVERLOAD')
        })
    })

    // ─── Maintain (all sets completed, avg reps between min and max) ───
    describe('維持重量', () => {
        it('完成全部組但平均次數在 min~max 之間 → 維持', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 10, weightKg: 40 },
                { setNumber: 2, repsPerformed: 9, weightKg: 40 },
                { setNumber: 3, repsPerformed: 8, weightKg: 40 },
            ]
            const result = generateOverloadSuggestion('ex1', '臥推', defaultPlan, sets)
            expect(result.method).toBe('MAINTAIN')
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(40)
            expect(result.reasoning).toContain('相同重量')
        })

        it('剛好等於 min → 維持', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 8, weightKg: 40 },
                { setNumber: 2, repsPerformed: 8, weightKg: 40 },
                { setNumber: 3, repsPerformed: 8, weightKg: 40 },
            ]
            const result = generateOverloadSuggestion('ex1', '臥推', defaultPlan, sets)
            expect(result.method).toBe('MAINTAIN')
        })
    })

    // ─── Deload (incomplete sets) ───
    describe('減重（Deload）', () => {
        it('未完成所有組 → 減重 7.5%', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 8, weightKg: 40 },
                { setNumber: 2, repsPerformed: 5, weightKg: 40 },
                { setNumber: 3, repsPerformed: 3, weightKg: 40 },
            ]
            const result = generateOverloadSuggestion('ex1', '臥推', defaultPlan, sets)
            expect(result.method).toBe('DELOAD')
            // 40 * 0.925 = 37 → roundWeight(37) = 37
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(37)
            expect(result.reasoning).toContain('減輕')
        })

        it('全部都沒達到 min → deload', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 5, weightKg: 100 },
                { setNumber: 2, repsPerformed: 4, weightKg: 100 },
                { setNumber: 3, repsPerformed: 3, weightKg: 100 },
            ]
            const result = generateOverloadSuggestion('ex1', '深蹲', defaultPlan, sets)
            expect(result.method).toBe('DELOAD')
            // 100 * 0.925 = 92.5 → roundWeight(92.5) = 92.5
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(92.5)
        })

        it('deload 重量正確四捨五入到 0.25kg', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 5, weightKg: 33 },
                { setNumber: 2, repsPerformed: 4, weightKg: 33 },
                { setNumber: 3, repsPerformed: 3, weightKg: 33 },
            ]
            const result = generateOverloadSuggestion('ex1', '臥推', defaultPlan, sets)
            // 33 * 0.925 = 30.525 → roundWeight → Math.round(30.525 * 4) / 4 = Math.round(122.1) / 4 = 122/4 = 30.5
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(30.5)
        })
    })

    // ─── Edge Cases ───
    describe('邊界情況', () => {
        it('只有 1 組歷史（少於計畫要求的 3 組）', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 12, weightKg: 40 },
            ]
            const result = generateOverloadSuggestion('ex1', '臥推', defaultPlan, sets)
            // 1 completed set < 3 target sets → deload
            expect(result.method).toBe('DELOAD')
        })

        it('weightKg 為 0', () => {
            const sets = [
                { setNumber: 1, repsPerformed: 12, weightKg: 0 },
                { setNumber: 2, repsPerformed: 12, weightKg: 0 },
                { setNumber: 3, repsPerformed: 12, weightKg: 0 },
            ]
            const result = generateOverloadSuggestion('ex1', '自重訓練', defaultPlan, sets)
            expect(result.method).toBe('PROGRESSIVE_OVERLOAD')
            // 0 + 1.25 = 1.25
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(1.25)
        })

        it('suggested sets 數量 = plan defaultSets', () => {
            const plan5 = { ...defaultPlan, defaultSets: 5 }
            const result = generateOverloadSuggestion('ex1', '臥推', plan5, [])
            expect(result.suggestedSets).toHaveLength(5)
        })

        it('reps rep range 為 1-1（力量型）', () => {
            const plan = { ...defaultPlan, defaultRepsMin: 1, defaultRepsMax: 1, defaultWeightKg: 100 }
            const sets = [
                { setNumber: 1, repsPerformed: 1, weightKg: 100 },
                { setNumber: 2, repsPerformed: 1, weightKg: 100 },
                { setNumber: 3, repsPerformed: 1, weightKg: 100 },
            ]
            const result = generateOverloadSuggestion('ex1', '硬舉', plan, sets)
            expect(result.method).toBe('PROGRESSIVE_OVERLOAD')
            expect(result.suggestedSets[0].suggestedWeightKg).toBe(102.5)
        })
    })
})
