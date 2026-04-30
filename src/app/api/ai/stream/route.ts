import { NextRequest } from 'next/server'
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

function sseEvent(data: Record<string, unknown>): string {
    return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) {
        return new Response('Unauthorized', { status: 401 })
    }

    if (await aiLimiter.isBlocked(user.id)) {
        return new Response('AI 使用次數已達上限，請稍後再試（每小時 30 次）', { status: 429 })
    }
    await aiLimiter.record(user.id)

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

    const q = sanitizeInput(question)
    const classification = classifyQuery(q)

    const sseHeaders = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    }

    // ── Direct: DB only, send instant answer as SSE ─────────────────────────
    if (classification.type === 'direct') {
        try {
            const t0 = Date.now()
            const answer = await getDirectAnswer(user.id, q)
            const elapsed = (Date.now() - t0) / 1000

            const stream = new ReadableStream({
                start(controller) {
                    const enc = new TextEncoder()
                    controller.enqueue(enc.encode(sseEvent({
                        queryType: classification.type,
                        queryLabel: classification.label,
                    })))
                    controller.enqueue(enc.encode(sseEvent({ token: answer })))
                    controller.enqueue(enc.encode(sseEvent({ done: true, elapsed_seconds: elapsed })))
                    controller.close()
                },
            })

            return new Response(stream, { headers: sseHeaders })
        } catch (e) {
            const msg = e instanceof Error ? e.message : '未知錯誤'
            return new Response(
                sseEvent({ error: `查詢失敗：${msg}` }),
                { headers: sseHeaders }
            )
        }
    }

    // ── Analysis / Recommendation: DB context + Ollama streaming ────────────
    if (classification.type === 'analysis' || classification.type === 'recommendation') {
        try {
            const t0 = Date.now()
            const dbContext = classification.type === 'analysis'
                ? await getAnalysisContext(user.id, q)
                : await getRecommendationContext(user.id)

            const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildOllamaPayload(dbContext, q, true)),
                signal: AbortSignal.timeout(120_000),
            })

            if (!ollamaRes.ok || !ollamaRes.body) {
                return new Response('AI service error', { status: 502 })
            }

            const ollamaBody = ollamaRes.body
            const stream = new ReadableStream({
                async start(controller) {
                    const enc = new TextEncoder()
                    const decoder = new TextDecoder()

                    // Send classification info first
                    controller.enqueue(enc.encode(sseEvent({
                        queryType: classification.type,
                        queryLabel: classification.label,
                    })))

                    const reader = ollamaBody.getReader()
                    let buffer = ''

                    try {
                        while (true) {
                            const { done, value } = await reader.read()
                            if (done) break

                            buffer += decoder.decode(value, { stream: true })
                            const lines = buffer.split('\n')
                            buffer = lines.pop() ?? ''

                            for (const line of lines) {
                                if (!line.trim()) continue
                                try {
                                    const parsed = JSON.parse(line)
                                    if (parsed.message?.content) {
                                        controller.enqueue(enc.encode(sseEvent({ token: parsed.message.content })))
                                    }
                                    if (parsed.done) {
                                        const elapsed = (Date.now() - t0) / 1000
                                        controller.enqueue(enc.encode(sseEvent({ done: true, elapsed_seconds: elapsed })))
                                    }
                                } catch {
                                    // skip malformed lines
                                }
                            }
                        }
                    } catch (e) {
                        const msg = e instanceof Error ? e.message : 'stream error'
                        controller.enqueue(enc.encode(sseEvent({ error: msg })))
                    } finally {
                        controller.close()
                    }
                },
            })

            return new Response(stream, { headers: sseHeaders })
        } catch (e) {
            const msg = e instanceof Error ? e.message : '未知錯誤'
            return new Response(`連線失敗：${msg}`, { status: 502 })
        }
    }

    // ── Book-knowledge: proxy existing RAG stream ───────────────────────────
    try {
        const ragRes = await fetch(`${RAG_API_URL}/query/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: q,
                book_filter: bookFilter || null,
                top_k: top_k ?? 6,
            }),
            signal: AbortSignal.timeout(120_000),
        })

        if (!ragRes.ok || !ragRes.body) {
            return new Response('AI service error', { status: 502 })
        }

        // Wrap original stream to inject classification info
        const ragBody = ragRes.body
        const stream = new ReadableStream({
            async start(controller) {
                const enc = new TextEncoder()

                // Send classification first
                controller.enqueue(enc.encode(sseEvent({
                    queryType: classification.type,
                    queryLabel: classification.label,
                })))

                const reader = ragBody.getReader()
                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break
                        controller.enqueue(value)
                    }
                } catch {
                    // stream ended
                } finally {
                    controller.close()
                }
            },
        })

        return new Response(stream, { headers: sseHeaders })
    } catch (e) {
        const msg = e instanceof Error ? e.message : '未知錯誤'
        return new Response(`連線失敗：${msg}`, { status: 502 })
    }
}
