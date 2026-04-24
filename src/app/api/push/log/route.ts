import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPushLog } from '@/lib/push-scheduler'

export const runtime = 'nodejs'

// GET /api/push/log — view server-side push notification log
export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    return NextResponse.json({ log: getPushLog(user.id) })
}
