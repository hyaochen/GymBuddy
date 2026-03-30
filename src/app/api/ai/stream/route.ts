import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

const RAG_API_URL = process.env.RAG_API_URL || 'http://rag-api:8080'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) {
        return new Response('Unauthorized', { status: 401 })
    }

    let body: { question?: string; bookFilter?: string; top_k?: number }
    try {
        body = await req.json()
    } catch {
        return new Response('Invalid JSON', { status: 400 })
    }

    const { question, bookFilter, top_k } = body
    if (!question?.trim()) {
        return new Response('請輸入問題', { status: 400 })
    }

    try {
        const ragRes = await fetch(`${RAG_API_URL}/query/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: question.trim(),
                book_filter: bookFilter || null,
                top_k: top_k ?? 6,
            }),
            signal: AbortSignal.timeout(120_000),
        })

        if (!ragRes.ok || !ragRes.body) {
            return new Response('AI service error', { status: 502 })
        }

        // 直接 proxy SSE stream，不緩衝
        return new Response(ragRes.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : '未知錯誤'
        return new Response(`連線失敗：${msg}`, { status: 502 })
    }
}
