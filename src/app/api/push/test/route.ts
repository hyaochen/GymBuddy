import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { schedulePush } from '@/lib/push-scheduler'

export const runtime = 'nodejs'

// GET /api/push/test  — schedule a test notification 10 seconds from now
export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const endTime = Date.now() + 10_000 // 10 seconds
    schedulePush(user.id, endTime, '✅ 推播測試成功！', '伺服器端 Web Push 運作正常')
    return NextResponse.json({ ok: true, fireAt: new Date(endTime).toISOString() })
}
