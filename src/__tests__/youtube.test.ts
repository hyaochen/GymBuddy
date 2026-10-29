import { describe, it, expect } from 'vitest'
import { parseYouTubeId, youtubeEmbedUrl, youtubeWatchUrl, youtubeAppUrl, formatDuration, formatClock } from '@/lib/youtube'

describe('parseYouTubeId', () => {
    const id = 'ghwNOgmYsz0'
    it('parses watch URLs', () => {
        expect(parseYouTubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id)
        expect(parseYouTubeId(`https://youtube.com/watch?feature=share&v=${id}&t=30`)).toBe(id)
        expect(parseYouTubeId(`https://m.youtube.com/watch?v=${id}`)).toBe(id)
    })
    it('parses youtu.be short links', () => {
        expect(parseYouTubeId(`https://youtu.be/${id}`)).toBe(id)
        expect(parseYouTubeId(`https://youtu.be/${id}?si=abc`)).toBe(id)
    })
    it('parses embed, shorts and live URLs', () => {
        expect(parseYouTubeId(`https://www.youtube.com/embed/${id}?playsinline=1`)).toBe(id)
        expect(parseYouTubeId(`https://www.youtube-nocookie.com/embed/${id}`)).toBe(id)
        expect(parseYouTubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id)
        expect(parseYouTubeId(`https://www.youtube.com/live/${id}`)).toBe(id)
    })
    it('accepts ids with dash and underscore, and a bare id', () => {
        expect(parseYouTubeId('https://www.youtube.com/watch?v=7rp7DGEAJ-s')).toBe('7rp7DGEAJ-s')
        expect(parseYouTubeId('https://youtu.be/6J_lz8ii6a8')).toBe('6J_lz8ii6a8')
        expect(parseYouTubeId(id)).toBe(id)
    })
    it('accepts a URL without scheme', () => {
        expect(parseYouTubeId(`youtu.be/${id}`)).toBe(id)
    })
    it('rejects non-YouTube and malformed input', () => {
        expect(parseYouTubeId(null)).toBeNull()
        expect(parseYouTubeId('')).toBeNull()
        expect(parseYouTubeId('https://vimeo.com/123456789')).toBeNull()
        expect(parseYouTubeId('https://evil.com/watch?v=ghwNOgmYsz0')).toBeNull()
        expect(parseYouTubeId('https://www.youtube.com/watch?v=short')).toBeNull()
        expect(parseYouTubeId('https://www.youtube.com/watch')).toBeNull()
        expect(parseYouTubeId('https://www.youtube.com/embed/"><script>')).toBeNull()
    })
})

describe('url builders', () => {
    it('builds embed / watch / app urls', () => {
        expect(youtubeEmbedUrl('abcdefghijk')).toBe('https://www.youtube.com/embed/abcdefghijk?playsinline=1')
        expect(youtubeWatchUrl('abcdefghijk')).toBe('https://www.youtube.com/watch?v=abcdefghijk')
        expect(youtubeAppUrl('abcdefghijk')).toBe('youtube://www.youtube.com/watch?v=abcdefghijk')
    })
})

describe('formatDuration', () => {
    it('formats seconds and minutes', () => {
        expect(formatDuration(45)).toBe('45 秒')
        expect(formatDuration(1200)).toBe('20 分')
        expect(formatDuration(75)).toBe('1 分 15 秒')
        expect(formatDuration(3750)).toBe('62 分 30 秒')
    })
})

describe('formatClock', () => {
    it('formats stopwatch face', () => {
        expect(formatClock(45)).toBe('45')
        expect(formatClock(1200)).toBe('20:00')
        expect(formatClock(75)).toBe('1:15')
    })
})
