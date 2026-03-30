import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

const RAG_API_URL = process.env.RAG_API_URL || 'http://rag-api:8080'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { question?: string; bookFilter?: string; top_k?: number }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { question, bookFilter, top_k } = body
    if (!question?.trim()) {
        return NextResponse.json({ error: '請輸入問題' }, { status: 400 })
    }

    try {
        const ragRes = await fetch(`${RAG_API_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: question.trim(),
                book_filter: bookFilter || null,
                top_k: top_k ?? 4,
            }),
            signal: AbortSignal.timeout(90_000),
        })

        if (!ragRes.ok) {
            const err = await ragRes.text()
            return NextResponse.json(
                { error: `AI 服務錯誤：${err}` },
                { status: 502 }
            )
        }

        const data = await ragRes.json()
        return NextResponse.json(data)
    } catch (e) {
        const msg = e instanceof Error ? e.message : '未知錯誤'
        if (msg.includes('timeout') || msg.includes('abort')) {
            return NextResponse.json({ error: 'AI 回答超時，請再試一次' }, { status: 504 })
        }
        return NextResponse.json({ error: `連線失敗：${msg}` }, { status: 502 })
    }
}

export async function GET() {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const res = await fetch(`${RAG_API_URL}/health`, {
            signal: AbortSignal.timeout(5_000),
        })
        const data = await res.json()
        return NextResponse.json(data)
    } catch {
        return NextResponse.json({ status: 'unavailable' }, { status: 503 })
    }
}
