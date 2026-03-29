import { describe, it, expect } from 'vitest'
import { epley1rm, formatWeight, formatDuration, formatRestSeconds } from '../lib/utils'

describe('epley1rm', () => {
    it('1 rep → 直接回傳重量', () => {
        expect(epley1rm(100, 1)).toBe(100)
    })

    it('標準計算：100kg x 5 reps', () => {
        // 100 * (1 + 5/30) = 100 * 1.1667 = 116.67 → round to 0.25 = 116.75
        expect(epley1rm(100, 5)).toBe(116.75)
    })

    it('輕重量：20kg x 10 reps', () => {
        // 20 * (1 + 10/30) = 20 * 1.333 = 26.67 → round to 0.25 = 26.75
        expect(epley1rm(20, 10)).toBe(26.75)
    })

    it('高次數：60kg x 15 reps', () => {
        // 60 * (1 + 15/30) = 60 * 1.5 = 90 → round = 90
        expect(epley1rm(60, 15)).toBe(90)
    })

    it('結果四捨五入到 0.25kg', () => {
        // 50 * (1 + 3/30) = 50 * 1.1 = 55 → 55
        expect(epley1rm(50, 3)).toBe(55)
        // 確認是 0.25 的倍數
        const result = epley1rm(37, 7)
        expect(result * 4 % 1).toBe(0) // 乘 4 後應為整數
    })

    // ─── 邊界情況 ───
    it('0 reps → 回傳重量本身（公式 weight * 1 = weight）', () => {
        // 100 * (1 + 0/30) = 100
        expect(epley1rm(100, 0)).toBe(100)
    })

    it('0 weight → 回傳 0', () => {
        expect(epley1rm(0, 10)).toBe(0)
    })

    it('負數 reps → 不會 crash（但結果無意義）', () => {
        // 100 * (1 + (-5)/30) = 100 * 0.833 = 83.33 → 83.25
        expect(() => epley1rm(100, -5)).not.toThrow()
    })

    it('極高次數：30 reps → weight * 2', () => {
        // 50 * (1 + 30/30) = 50 * 2 = 100
        expect(epley1rm(50, 30)).toBe(100)
    })
})

describe('formatWeight', () => {
    it('整數不顯示小數', () => {
        expect(formatWeight(40)).toBe('40')
    })

    it('小數顯示一位', () => {
        expect(formatWeight(42.5)).toBe('42.5')
    })

    it('字串輸入也能處理', () => {
        expect(formatWeight('35.5')).toBe('35.5')
        expect(formatWeight('40')).toBe('40')
    })

    it('0', () => {
        expect(formatWeight(0)).toBe('0')
    })
})

describe('formatDuration', () => {
    it('純分鐘', () => {
        expect(formatDuration(45)).toBe('45 分鐘')
    })

    it('整小時', () => {
        expect(formatDuration(60)).toBe('1 小時')
        expect(formatDuration(120)).toBe('2 小時')
    })

    it('小時+分鐘', () => {
        expect(formatDuration(90)).toBe('1 小時 30 分鐘')
    })

    it('0 分鐘', () => {
        expect(formatDuration(0)).toBe('0 分鐘')
    })
})

describe('formatRestSeconds', () => {
    it('純秒', () => {
        expect(formatRestSeconds(30)).toBe('30秒')
    })

    it('整分鐘', () => {
        expect(formatRestSeconds(60)).toBe('1分鐘')
        expect(formatRestSeconds(120)).toBe('2分鐘')
    })

    it('分+秒', () => {
        expect(formatRestSeconds(90)).toBe('1分30秒')
    })

    it('0 秒', () => {
        expect(formatRestSeconds(0)).toBe('0秒')
    })
})
