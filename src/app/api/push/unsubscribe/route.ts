import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/push/unsubscribe
// Body: { endpoint: string }
//
// Called by sw.js's `pushsubscriptionchange` handler when the browser rotates
// the subscription but cannot resubscribe (e.g. iOS Safari does not surface
// `applicationServerKey` on `event.oldSubscription`). Removing the zombie row
// here stops the server from repeatedly hitting 410 Gone via the alternative
// cleanup path inside push-scheduler.ts.
//
// Auth-scoped: only deletes a row when its userId matches the caller's session,
// so a leaked endpoint cannot be used to wipe someone else's subscription.
export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await req.json().catch(() => ({}))
    if (typeof endpoint !== 'string' || !endpoint) {
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }

    const result = await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: user.id },
    })
    return NextResponse.json({ ok: true, deleted: result.count })
}
