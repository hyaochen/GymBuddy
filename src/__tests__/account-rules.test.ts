import { describe, it, expect } from 'vitest'
import { validateNickname, sanitizeNickname, isEmailIdentifier } from '../lib/account-rules'
import { forwardedClientIp } from '../lib/request-ip'

describe('validateNickname', () => {
    it('合法暱稱通過', () => {
        expect(validateNickname('小明')).toBeNull()
        expect(validateNickname('gym_bro 99')).toBeNull()
    })
    it('長度限制 2-20', () => {
        expect(validateNickname('a')).not.toBeNull()
        expect(validateNickname('a'.repeat(21))).not.toBeNull()
        expect(validateNickname('a'.repeat(20))).toBeNull()
    })
    it('禁用字元與 @', () => {
        for (const bad of ['a/b', 'a?b', 'a#b', 'a%b', 'a\b', 'a@b', 'ab\u0000', 'a\nb']) {
            expect(validateNickname(bad)).not.toBeNull()
        }
    })
    it('只有空白不通過', () => {
        expect(validateNickname('   ')).not.toBeNull()
    })
})

describe('sanitizeNickname', () => {
    it('移除禁用字元並截斷', () => {
        expect(sanitizeNickname('a@b/c', 'fb')).toBe('abc')
        expect(sanitizeNickname('x'.repeat(30), 'fb')).toBe('x'.repeat(20))
    })
    it('清完不合法時用 fallback', () => {
        expect(sanitizeNickname('@', 'user_1234')).toBe('user_1234')
        expect(sanitizeNickname(null, 'user_1234')).toBe('user_1234')
    })
})

describe('isEmailIdentifier', () => {
    it('含 @ 視為 email', () => {
        expect(isEmailIdentifier('a@b.com')).toBe(true)
        expect(isEmailIdentifier('gymbro')).toBe(false)
    })
})

describe('forwardedClientIp', () => {
    it('cf-connecting-ip 優先於偽造的 x-forwarded-for', () => {
        const h = new Headers({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '6.6.6.6, 1.2.3.4' })
        expect(forwardedClientIp(h)).toBe('1.2.3.4')
    })
})
