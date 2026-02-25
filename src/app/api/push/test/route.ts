import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sendPushNow, getSubscriptionForUser } from '@/lib/push-scheduler'
import webpush from 'web-push'

export const runtime = 'nodejs'

// GET /api/push/test  — send a push notification immediately and return result
// Also runs a raw webpush.sendNotification() to compare error codes
export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Primary: our 1-hour JWT approach
    const result = await sendPushNow(user.id, '✅ 推播測試成功！', '伺服器端 Web Push 運作正常')

    // If we have a subscription, also test with raw web-push (12-hour JWT)
    // to help diagnose if the issue is key-mismatch vs expiry
    let rawResult: { status: number; body: string } | null = null
    const sub = getSubscriptionForUser(user.id)
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
