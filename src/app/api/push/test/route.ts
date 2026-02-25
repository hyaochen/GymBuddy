import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sendPushNow } from '@/lib/push-scheduler'

export const runtime = 'nodejs'

// GET /api/push/test  — send a push notification immediately and return result
export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await sendPushNow(user.id, '✅ 推播測試成功！', '伺服器端 Web Push 運作正常')
    return NextResponse.json(result)
}
