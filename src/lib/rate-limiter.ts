import prisma from '@/lib/prisma'

interface RateLimiterOptions {
    namespace?: string
    maxAttempts: number
    windowMs: number
}

export interface RateLimiter {
    isBlocked(key: string): Promise<boolean>
    record(key: string): Promise<void>
    reset(key: string): Promise<void>
    remainingSeconds(key: string): Promise<number>
}

function scopedKey(options: RateLimiterOptions, key: string): string {
    const namespace = options.namespace ?? `${options.maxAttempts}:${options.windowMs}`
    return `${namespace}:${key}`
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
    async function activeEntry(key: string) {
        const now = new Date()
        const entry = await prisma.rateLimitBucket.findUnique({ where: { key } })
        if (!entry) return null
        if (entry.expiresAt <= now) {
            await prisma.rateLimitBucket.delete({ where: { key } }).catch(() => undefined)
            return null
        }
        return entry
    }

    return {
        async isBlocked(key: string): Promise<boolean> {
            const entry = await activeEntry(scopedKey(options, key))
            return !!entry && entry.count >= options.maxAttempts
        },

        async record(key: string): Promise<void> {
            const scoped = scopedKey(options, key)
            const now = new Date()
            const expiresAt = new Date(now.getTime() + options.windowMs)

            await prisma.$executeRaw`
                INSERT INTO rate_limit_buckets ("key", "count", "windowStartedAt", "expiresAt", "updatedAt")
                VALUES (${scoped}, 1, ${now}, ${expiresAt}, ${now})
                ON CONFLICT ("key") DO UPDATE SET
                    "count" = CASE
                        WHEN rate_limit_buckets."expiresAt" <= ${now} THEN 1
                        ELSE rate_limit_buckets."count" + 1
                    END,
                    "windowStartedAt" = CASE
                        WHEN rate_limit_buckets."expiresAt" <= ${now} THEN ${now}
                        ELSE rate_limit_buckets."windowStartedAt"
                    END,
                    "expiresAt" = CASE
                        WHEN rate_limit_buckets."expiresAt" <= ${now} THEN ${expiresAt}
                        ELSE rate_limit_buckets."expiresAt"
                    END,
                    "updatedAt" = ${now}
            `
        },

        async reset(key: string): Promise<void> {
            await prisma.rateLimitBucket.delete({ where: { key: scopedKey(options, key) } }).catch(() => undefined)
        },

        async remainingSeconds(key: string): Promise<number> {
            const entry = await activeEntry(scopedKey(options, key))
            if (!entry || entry.count < options.maxAttempts) return 0
            return Math.max(0, Math.ceil((entry.expiresAt.getTime() - Date.now()) / 1000))
        },
    }
}
