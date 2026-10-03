import { describe, it, expect } from 'vitest'
import { DEFAULT_KUDO, KUDO_KEYS, KUDO_LABELS, normalizeKudoKey } from '@/lib/kudos'

describe('normalizeKudoKey', () => {
    it('accepts every current key unchanged', () => {
        for (const key of KUDO_KEYS) {
            expect(normalizeKudoKey(key)).toBe(key)
        }
    })

    it('maps legacy stored emoji values (written as code points) to keys', () => {
        expect(normalizeKudoKey('\u{1F4AA}')).toBe('flex')
        expect(normalizeKudoKey('\u{1F525}')).toBe('fire')
        expect(normalizeKudoKey('\u{1F44F}')).toBe('clap')
        expect(normalizeKudoKey('\u{1F3C6}')).toBe('trophy')
        expect(normalizeKudoKey('\u{26A1}')).toBe('bolt')
    })

    it('ignores a trailing variation selector on legacy values', () => {
        expect(normalizeKudoKey('\u{26A1}\u{FE0F}')).toBe('bolt')
    })

    it('rejects unknown or non-string input', () => {
        expect(normalizeKudoKey('nope')).toBeNull()
        expect(normalizeKudoKey('')).toBeNull()
        expect(normalizeKudoKey(null)).toBeNull()
        expect(normalizeKudoKey(42)).toBeNull()
    })

    it('has a label and a valid default for every key', () => {
        expect(KUDO_KEYS).toContain(DEFAULT_KUDO)
        for (const key of KUDO_KEYS) {
            expect(KUDO_LABELS[key].length).toBeGreaterThan(0)
        }
    })
})
