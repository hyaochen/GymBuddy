import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { schedulePush, cancelPush } from '@/lib/push-scheduler'

export const runtime = 'nodejs'

// POST /api/push/schedule  — schedule a notification at endTime
// Body: { endTime: number (ms timestamp) }
export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endTime } = await req.json()
    if (!endTime || typeof endTime !== 'number') {
        return NextResponse.json({ error: 'Invalid endTime' }, { status: 400 })
    }

    schedulePush(user.id, endTime, '⏱️ 休息結束！', '準備好下一組了嗎？點擊繼續訓練')
    return NextResponse.json({ ok: true })
}

// DELETE /api/push/schedule  — cancel pending notification (skip rest / alarm dismissed)
export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    cancelPush(user.id)
    return NextResponse.json({ ok: true })
}
