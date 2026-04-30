import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { classifyQuery } from '@/lib/query-router'
import { getDirectAnswer, getAnalysisContext, getRecommendationContext } from '@/lib/training-context'
import {
    RAG_API_URL,
    OLLAMA_URL,
    aiLimiter,
    sanitizeInput,
    buildOllamaPayload,
} from '@/lib/ai-common'

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // AI rate limiting
    if (await aiLimiter.isBlocked(user.id)) {
        return NextResponse.json({ error: 'AI 使用次數已達上限，請稍後再試（每小時 30 次）' }, { status: 429 })
    }
    await aiLimiter.record(user.id)

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

    const q = sanitizeInput(question)
    const classification = classifyQuery(q)

    try {
        // ── Direct: DB only, no LLM ─────────────────────────────────────────
        if (classification.type === 'direct') {
            const answer = await getDirectAnswer(user.id, q)
            return NextResponse.json({
                answer,
                queryType: classification.type,
                queryLabel: classification.label,
            })
        }

        // ── Analysis / Recommendation: DB context + Ollama ──────────────────
        if (classification.type === 'analysis' || classification.type === 'recommendation') {
            const dbContext = classification.type === 'analysis'
                ? await getAnalysisContext(user.id, q)
                : await getRecommendationContext(user.id)

            const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildOllamaPayload(dbContext, q, false)),
                signal: AbortSignal.timeout(90_000),
            })

            if (!ollamaRes.ok) {
                const err = await ollamaRes.text()
                return NextResponse.json(
                    { error: `AI 服務錯誤：${err}` },
                    { status: 502 }
                )
            }

            const data = await ollamaRes.json()
            return NextResponse.json({
                answer: data.message?.content ?? '',
                queryType: classification.type,
                queryLabel: classification.label,
            })
        }

        // ── Book-knowledge: existing RAG API ────────────────────────────────
        const ragRes = await fetch(`${RAG_API_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: q,
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

        const ragData = await ragRes.json()
        return NextResponse.json({
            ...ragData,
            queryType: classification.type,
            queryLabel: classification.label,
        })
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
