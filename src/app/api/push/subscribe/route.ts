import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { removePushSubscription, savePushSubscription } from '@/lib/push-scheduler'

export const runtime = 'nodejs'

// POST /api/push/subscribe
// Body: { subscription: PushSubscriptionJSON, oldEndpoint?: string }
//
// `oldEndpoint` is sent by sw.js's `pushsubscriptionchange` handler when the
// browser rotates the endpoint — we purge the dead row so DB doesn't accumulate
// zombie subscriptions over months of rotation.
export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subscription, oldEndpoint } = await req.json()
    if (!subscription?.endpoint) {
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    if (typeof oldEndpoint === 'string' && oldEndpoint && oldEndpoint !== subscription.endpoint) {
        await removePushSubscription(user.id, oldEndpoint)
    }

    await savePushSubscription(user.id, subscription)
    return NextResponse.json({ ok: true })
}
