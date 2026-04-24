import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sendPushNow, getSubscriptionForUser } from '@/lib/push-scheduler'
import { createRateLimiter } from '@/lib/rate-limiter'
import webpush from 'web-push'

export const runtime = 'nodejs'

// 5 test pushes per user per minute — prevents device self-DoS + VAPID burn.
const pushTestLimiter = createRateLimiter({ maxAttempts: 5, windowMs: 60 * 1000 })

// GET /api/push/test  — send a push notification immediately and return result
// Also runs a raw webpush.sendNotification() to compare error codes
export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (pushTestLimiter.isBlocked(user.id)) {
        return NextResponse.json(
            { error: '測試推播過於頻繁，請稍後再試' },
            { status: 429 }
        )
    }
    pushTestLimiter.record(user.id)

    // Primary: our 1-hour JWT approach
    const result = await sendPushNow(user.id, '✅ 推播測試成功！', '伺服器端 Web Push 運作正常')

    // If we have a subscription, also test with raw web-push (12-hour JWT)
    // to help diagnose if the issue is key-mismatch vs expiry
    let rawResult: { status: number; body: string } | null = null
    const sub = await getSubscriptionForUser(user.id)
    if (sub) {
        try {
            await webpush.sendNotification(sub, JSON.stringify({
                title: 'raw test', body: 'raw', tag: 'rest-end',
            }))
            rawResult = { status: 201, body: 'success' }
        } catch (err: unknown) {
            const e = err as { statusCode?: number; body?: string }
            rawResult = { status: e.statusCode ?? 0, body: e.body ?? String(err) }
        }
    }

    return NextResponse.json({ ...result, rawResult })
}
