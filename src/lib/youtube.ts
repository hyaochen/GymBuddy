// YouTube helpers: parse a video id out of the URL shapes people paste,
// and build the embed / watch / app-scheme URLs from it.

const ID_RE = /^[A-Za-z0-9_-]{11}$/

export function parseYouTubeId(input: string | null | undefined): string | null {
    if (!input) return null
    const raw = input.trim()
    if (ID_RE.test(raw)) return raw

    let url: URL
    try {
        url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    } catch {
        return null
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
    let candidate: string | null = null

    if (host === 'youtu.be') {
        candidate = url.pathname.split('/')[1] ?? null
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
        const parts = url.pathname.split('/').filter(Boolean)
        if (parts[0] === 'watch') candidate = url.searchParams.get('v')
        else if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') candidate = parts[1] ?? null
    }

    return candidate && ID_RE.test(candidate) ? candidate : null
}

export function youtubeEmbedUrl(id: string): string {
    return `https://www.youtube.com/embed/${id}?playsinline=1`
}

export function youtubeWatchUrl(id: string): string {
    return `https://www.youtube.com/watch?v=${id}`
}

// iOS custom scheme that opens the YouTube app directly
export function youtubeAppUrl(id: string): string {
    return `youtube://www.youtube.com/watch?v=${id}`
}

// 75 -> "1 分 15 秒", 1200 -> "20 分", 45 -> "45 秒"
export function formatDuration(totalSeconds: number): string {
    const s = Math.max(0, Math.round(totalSeconds))
    if (s < 60) return `${s} 秒`
    const m = Math.floor(s / 60)
    const rest = s % 60
    return rest === 0 ? `${m} 分` : `${m} 分 ${rest} 秒`
}

// 75 -> "1:15", 1200 -> "20:00", 45 -> "45" (stopwatch face; plain seconds under a minute)
export function formatClock(totalSeconds: number): string {
    const s = Math.max(0, Math.round(totalSeconds))
    if (s < 60) return String(s)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
}
