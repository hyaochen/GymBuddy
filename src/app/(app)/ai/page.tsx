"use client"

import { useState, useRef, useEffect, Fragment } from "react"
import { Send, BookOpen, AlertCircle, BrainCircuit, Database, TrendingUp, Lightbulb, Search } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Minimal Markdown renderer ────────────────────────────────────────────────
// Handles: **bold**, *italic*, `code`, ## headings, - / * lists, blank-line paragraphs

function renderInline(text: string): React.ReactNode[] {
    // Split on **bold**, *italic*, `code` patterns
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
            return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith("*") && part.endsWith("*"))
            return <em key={i}>{part.slice(1, -1)}</em>
        if (part.startsWith("`") && part.endsWith("`"))
            return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
        return <Fragment key={i}>{part}</Fragment>
    })
}

function MarkdownContent({ text, streaming }: { text: string; streaming?: boolean }) {
    const lines = text.split("\n")
    const nodes: React.ReactNode[] = []
    let ulItems: React.ReactNode[] = []
    let olItems: React.ReactNode[] = []
    let key = 0

    function flushUl() {
        if (ulItems.length > 0) {
            nodes.push(<ul key={key++} className="list-disc pl-5 space-y-1 my-2">{ulItems}</ul>)
            ulItems = []
        }
    }

    function flushOl() {
        if (olItems.length > 0) {
            nodes.push(<ol key={key++} className="list-decimal pl-5 space-y-1 my-2">{olItems}</ol>)
            olItems = []
        }
    }

    function flushAll() { flushUl(); flushOl() }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const isLast = i === lines.length - 1

        // Heading (1-6 levels)
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
        if (headingMatch) {
            flushAll()
            const level = Math.min(headingMatch[1].length, 4)
            const cls = level === 1
                ? "text-base font-bold mt-3 mb-1.5"
                : level === 2
                ? "text-[15px] font-semibold mt-2.5 mb-1"
                : level === 3
                ? "text-sm font-semibold mt-2 mb-0.5"
                : "text-sm font-medium mt-1.5 mb-0.5 text-primary/90"
            nodes.push(<p key={key++} className={cls}>{renderInline(headingMatch[2])}</p>)
            continue
        }

        // Unordered list item (supports indented sub-items)
        const ulMatch = line.match(/^(\s*)[-*•]\s+(.+)/)
        if (ulMatch) {
            flushOl()
            const indent = ulMatch[1].length > 0
            ulItems.push(
                <li key={key++} className={indent ? "ml-4" : ""}>
                    {renderInline(ulMatch[2])}
                </li>
            )
            continue
        }

        // Numbered list item
        const olMatch = line.match(/^(\s*)\d+[.)]\s+(.+)/)
        if (olMatch) {
            flushUl()
            const indent = olMatch[1].length > 0
            olItems.push(
                <li key={key++} className={indent ? "ml-4" : ""}>
                    {renderInline(olMatch[2])}
                </li>
            )
            continue
        }

        // Blank line → paragraph break
        if (line.trim() === "") {
            flushAll()
            continue
        }

        // Normal text
        flushAll()
        const content = renderInline(line)
        nodes.push(
            <p key={key++} className="my-0.5 leading-relaxed">
                {content}
                {isLast && streaming && (
                    <span className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-text-bottom animate-pulse" />
                )}
            </p>
        )
    }

    flushAll()

    return <div className="space-y-0.5">{nodes}</div>
}

// ── Query type badge config ──────────────────────────────────────────────────

type QueryType = 'direct' | 'analysis' | 'recommendation' | 'book-knowledge'

const QUERY_TYPE_CONFIG: Record<QueryType, { label: string; icon: typeof Database; color: string }> = {
    'direct': { label: '直接查詢', icon: Database, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    'analysis': { label: '分析', icon: TrendingUp, color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    'recommendation': { label: '推薦', icon: Lightbulb, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    'book-knowledge': { label: '書籍知識', icon: BookOpen, color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
}

function QueryBadge({ type }: { type: QueryType }) {
    const config = QUERY_TYPE_CONFIG[type]
    if (!config) return null
    const Icon = config.icon
    return (
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 border", config.color)}>
            <Icon className="h-3 w-3" />
            {config.label}
        </span>
    )
}

// ── Types ────────────────────────────────────────────────────────────────────

interface SourceInfo {
    page_number: number
    page_label: string
    book_id: string
    book_name: string
    preview: string
}

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    sources?: SourceInfo[]
    elapsed?: number
    error?: boolean
    streaming?: boolean
    queryType?: QueryType
}

// ── Constants ────────────────────────────────────────────────────────────────

const BOOK_OPTIONS = [
    { value: "", label: "兩本書" },
    { value: "core_strength", label: "核心訓練圖解聖經" },
    { value: "strength_training", label: "肌力訓練" },
]

const SAMPLE_QUESTIONS = [
    "棒式的正確姿勢和常見錯誤？",
    "核心訓練對初學者有哪些動作推薦？",
    "深蹲時如何保護膝蓋和腰椎？",
    "訓練後有哪些適合的伸展放鬆動作？",
]

const QUICK_BUTTONS = [
    { label: "我的 PR", question: "我的 PR 紀錄" },
    { label: "本週訓練量", question: "我這週的訓練頻率和訓練量？" },
    { label: "推薦今天練什麼", question: "根據我最近的訓練，推薦今天練什麼？" },
    { label: "肌群平衡分析", question: "分析我的肌群訓練平衡，有哪些不足？" },
]

// ── Components ───────────────────────────────────────────────────────────────

function ThinkingDots() {
    return (
        <div className="flex items-center gap-1.5 py-0.5">
            <span className="text-sm text-muted-foreground">思考中</span>
            <span className="flex gap-1">
                {[0, 1, 2].map(i => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${i * 0.18}s`, animationDuration: "0.8s" }}
                    />
                ))}
            </span>
        </div>
    )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [bookFilter, setBookFilter] = useState("")
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    async function sendMessage(question: string) {
        const q = question.trim()
        if (!q || loading) return

        const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q }
        const assistantId = crypto.randomUUID()
        const placeholder: Message = { id: assistantId, role: "assistant", content: "", streaming: true }

        setMessages(prev => [...prev, userMsg, placeholder])
        setInput("")
        setLoading(true)

        try {
            const res = await fetch("/api/ai/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q, bookFilter: bookFilter || undefined }),
            })

            if (!res.ok || !res.body) {
                throw new Error(`伺服器錯誤 (${res.status})`)
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const parts = buffer.split("\n\n")
                buffer = parts.pop() ?? ""

                for (const part of parts) {
                    if (!part.startsWith("data: ")) continue
                    let parsed: Record<string, unknown>
                    try { parsed = JSON.parse(part.slice(6)) } catch { continue }

                    if (parsed.error) {
                        setMessages(prev => prev.map(m =>
                            m.id === assistantId
                                ? { ...m, content: String(parsed.error), error: true, streaming: false }
                                : m
                        ))
                        return
                    }

                    // Capture query type from first SSE event
                    if (parsed.queryType) {
                        setMessages(prev => prev.map(m =>
                            m.id === assistantId
                                ? { ...m, queryType: parsed.queryType as QueryType }
                                : m
                        ))
                    }

                    if (parsed.token) {
                        setMessages(prev => prev.map(m =>
                            m.id === assistantId
                                ? { ...m, content: m.content + String(parsed.token) }
                                : m
                        ))
                    }

                    if (parsed.done) {
                        setMessages(prev => prev.map(m =>
                            m.id === assistantId
                                ? {
                                    ...m,
                                    sources: parsed.sources as SourceInfo[],
                                    elapsed: parsed.elapsed_seconds as number,
                                    streaming: false,
                                }
                                : m
                        ))
                    }
                }
            }
        } catch (e) {
            setMessages(prev => prev.map(m =>
                m.id === assistantId
                    ? { ...m, content: e instanceof Error ? e.message : "發生錯誤，請再試一次", error: true, streaming: false }
                    : m
            ))
        } finally {
            setLoading(false)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setInput(e.target.value)
        const el = e.target
        el.style.height = "auto"
        el.style.height = Math.min(el.scrollHeight, 120) + "px"
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                    <div>
                        <h1 className="text-base font-bold leading-tight">AI 健身助理</h1>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            訓練數據分析 · 書籍知識
                        </p>
                    </div>
                </div>
                <select
                    value={bookFilter}
                    onChange={e => setBookFilter(e.target.value)}
                    className="text-xs bg-card border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    {BOOK_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="space-y-4">
                        <div className="text-center py-6">
                            <BrainCircuit className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                            <p className="text-sm text-muted-foreground font-medium">你的 AI 健身助理</p>
                            <p className="text-xs text-muted-foreground mt-1">查詢訓練紀錄、分析進步趨勢、取得訓練建議</p>
                        </div>

                        {/* Quick action buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            {QUICK_BUTTONS.map(btn => (
                                <button
                                    key={btn.label}
                                    onClick={() => sendMessage(btn.question)}
                                    disabled={loading}
                                    className="flex items-center gap-2 text-left text-sm bg-card border border-border rounded-xl px-3 py-2.5 hover:border-primary/50 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <Search className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
                                    <span>{btn.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="pt-2">
                            <p className="text-[11px] text-muted-foreground font-medium mb-2 px-1">或問書本知識：</p>
                            <div className="grid grid-cols-1 gap-2">
                                {SAMPLE_QUESTIONS.map(q => (
                                    <button
                                        key={q}
                                        onClick={() => sendMessage(q)}
                                        disabled={loading}
                                        className="text-left text-sm bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/50 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "max-w-[88%] rounded-2xl px-4 py-3 text-sm",
                            msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : msg.error
                                ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm"
                                : "bg-card border border-border rounded-bl-sm"
                        )}>
                            {/* Query type badge */}
                            {msg.role === "assistant" && msg.queryType && !msg.error && (
                                <div className="mb-2">
                                    <QueryBadge type={msg.queryType} />
                                </div>
                            )}

                            {msg.error && (
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span className="text-xs font-medium">發生錯誤</span>
                                </div>
                            )}

                            {msg.streaming && msg.content === "" && <ThinkingDots />}

                            {msg.content !== "" && (
                                msg.role === "assistant"
                                    ? <MarkdownContent text={msg.content} streaming={msg.streaming} />
                                    : <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            )}

                            {!msg.streaming && msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1.5">
                                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">來源</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {msg.sources.map((src, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary rounded-full px-2.5 py-1" title={src.preview}>
                                                <BookOpen className="h-3 w-3 flex-shrink-0" />
                                                <span className="max-w-[180px] truncate">{src.book_name}</span>
                                                <span className="opacity-70">{src.page_label}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!msg.streaming && msg.elapsed !== undefined && (
                                <p className="text-[11px] text-muted-foreground mt-1.5">{msg.elapsed.toFixed(1)}s</p>
                            )}
                        </div>
                    </div>
                ))}

                <div ref={bottomRef} />
            </div>

            <div className="border-t border-border pt-3">
                <div className="flex gap-2 items-end">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleTextareaInput}
                        onKeyDown={handleKeyDown}
                        placeholder="詢問健身問題… (Enter 送出)"
                        rows={1}
                        className="flex-1 resize-none bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                        style={{ minHeight: "48px", maxHeight: "120px" }}
                    />
                    <button
                        onClick={() => sendMessage(input)}
                        disabled={loading || !input.trim()}
                        className={cn(
                            "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                            loading || !input.trim()
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                        )}
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                    訓練紀錄查詢即時回覆，書籍問答來自 OCR 內容，僅供參考。
                </p>
            </div>
        </div>
    )
}
