import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { checkSocialBadge } from '@/lib/badges'
import { sharePlanAsTemplate } from '@/lib/share-template'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { planId, name, description, difficulty, targetMuscles } = body

    if (!planId || typeof planId !== 'string') {
        return NextResponse.json({ error: '請選擇要分享的計畫' }, { status: 400 })
    }
    if (typeof name === 'string' && name.length > 60) {
        return NextResponse.json({ error: '模板名稱最多 60 字' }, { status: 400 })
    }
    if (typeof description === 'string' && description.length > 500) {
        return NextResponse.json({ error: '說明最多 500 字' }, { status: 400 })
    }

    // 與 server action 共用同一份邏輯：同作者同名稱重複分享時更新既有模板
    const result = await sharePlanAsTemplate({
        userId: user.id,
        planId,
        name: typeof name === 'string' ? name : undefined,
        description: typeof description === 'string' ? description : undefined,
        difficulty,
        targetMuscles: Array.isArray(targetMuscles) && targetMuscles.every(m => typeof m === 'string')
            ? targetMuscles
            : undefined,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    // Badge: template shared（只在首次建立時給）
    const badge = result.created ? await checkSocialBadge(user.id, 'template_shared') : null

    return NextResponse.json({ template: result.template, updated: !result.created, newBadge: badge }, { status: result.created ? 201 : 200 })
}
