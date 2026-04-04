/**
 * In-memory rate limiter.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 })
 *   if (limiter.isBlocked(key)) { ... }
 *   limiter.record(key)
 *   limiter.reset(key)
 */

interface RateLimitEntry {
    count: number
    firstAttempt: number
}

interface RateLimiterOptions {
    /** Maximum attempts within the window before blocking */
    maxAttempts: number
    /** Time window in milliseconds */
    windowMs: number
}

export interface RateLimiter {
    /** Check if the key is currently blocked */
    isBlocked(key: string): boolean
    /** Record an attempt for the key */
    record(key: string): void
    /** Reset (clear) attempts for the key (e.g. on successful login) */
    reset(key: string): void
    /** Get remaining seconds until unblocked (0 if not blocked) */
    remainingSeconds(key: string): number
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
    const { maxAttempts, windowMs } = options
    const store = new Map<string, RateLimitEntry>()

    // Periodically clean up expired entries to prevent memory leak
    const CLEANUP_INTERVAL = 10 * 60 * 1000 // 10 minutes
    setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of store) {
            if (now - entry.firstAttempt > windowMs) {
                store.delete(key)
            }
        }
    }, CLEANUP_INTERVAL).unref()

    function getEntry(key: string): RateLimitEntry | null {
        const entry = store.get(key)
        if (!entry) return null
        // Window expired — clear it
        if (Date.now() - entry.firstAttempt > windowMs) {
            store.delete(key)
            return null
        }
        return entry
    }

    return {
        isBlocked(key: string): boolean {
            const entry = getEntry(key)
            return !!entry && entry.count >= maxAttempts
        },

        record(key: string): void {
            const entry = getEntry(key)
            if (entry) {
                entry.count++
            } else {
                store.set(key, { count: 1, firstAttempt: Date.now() })
            }
        },

        reset(key: string): void {
            store.delete(key)
        },

        remainingSeconds(key: string): number {
            const entry = getEntry(key)
            if (!entry || entry.count < maxAttempts) return 0
            const elapsed = Date.now() - entry.firstAttempt
            return Math.max(0, Math.ceil((windowMs - elapsed) / 1000))
        },
    }
}
