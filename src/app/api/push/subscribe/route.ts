import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { savePushSubscription } from '@/lib/push-scheduler'

export const runtime = 'nodejs'

// POST /api/push/subscribe
// Body: { subscription: PushSubscriptionJSON }
export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subscription } = await req.json()
    if (!subscription?.endpoint) {
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    savePushSubscription(user.id, subscription)
    return NextResponse.json({ ok: true })
}
