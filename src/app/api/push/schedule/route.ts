import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { schedulePush, cancelPush } from '@/lib/push-scheduler'

export const runtime = 'nodejs'

// POST /api/push/schedule  — schedule a notification
// Body: {
//   endTime?: number,       // ms timestamp (legacy, client clock)
//   durationMs?: number,    // preferred: server computes endTime locally to dodge clock drift
//   tag?: string,           // optional unique tag per set (e.g. rest-end-${sessionId}-${setNum})
// }
export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endTime, durationMs, tag } = await req.json()
    if ((!endTime || typeof endTime !== 'number') && (!durationMs || typeof durationMs !== 'number')) {
        return NextResponse.json({ error: 'Invalid endTime or durationMs' }, { status: 400 })
    }

    const resolvedEndTime = typeof endTime === 'number' ? endTime : Date.now() + (durationMs as number)
    schedulePush(
        user.id,
        resolvedEndTime,
        '⏱️ 休息結束！',
        '準備好下一組了嗎？點擊繼續訓練',
        { durationMs: typeof durationMs === 'number' ? durationMs : undefined, tag: typeof tag === 'string' ? tag : undefined },
    )
    return NextResponse.json({ ok: true })
}

// DELETE /api/push/schedule  — cancel pending notification (skip rest / alarm dismissed)
export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    cancelPush(user.id)
    return NextResponse.json({ ok: true })
}
