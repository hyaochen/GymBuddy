"use client"

import { useState, useRef, useEffect, Fragment } from "react"
import { Send, BookOpen, AlertCircle, BrainCircuit } from "lucide-react"
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
    let listItems: React.ReactNode[] = []
    let key = 0

    function flushList() {
        if (listItems.length > 0) {
            nodes.push(<ul key={key++} className="list-disc pl-5 space-y-0.5 my-1">{listItems}</ul>)
            listItems = []
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const isLast = i === lines.length - 1

        // Heading
        const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
        if (headingMatch) {
            flushList()
            const level = headingMatch[1].length
            const cls = level === 1 ? "text-base font-bold mt-2 mb-1" : level === 2 ? "text-sm font-semibold mt-2 mb-0.5" : "text-sm font-medium mt-1"
            nodes.push(<p key={key++} className={cls}>{renderInline(headingMatch[2])}</p>)
            continue
        }

        // List item
        const listMatch = line.match(/^[-*•]\s+(.+)/)
        if (listMatch) {
            listItems.push(<li key={key++}>{renderInline(listMatch[1])}</li>)
            continue
        }

        // Numbered list
        const numMatch = line.match(/^\d+\.\s+(.+)/)
        if (numMatch) {
            flushList()
            nodes.push(<p key={key++} className="my-0.5">{renderInline(line)}</p>)
            continue
        }

        // Blank line → paragraph break
        if (line.trim() === "") {
            flushList()
            continue
        }

        // Normal text
        flushList()
        const content = renderInline(line)
        nodes.push(
            <p key={key++} className="my-0.5">
                {content}
                {isLast && streaming && (
                    <span className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-text-bottom animate-pulse" />
                )}
            </p>
        )
    }

    flushList()

    // Append cursor after last node if streaming and last line was a list
    if (streaming && listItems.length === 0 && nodes.length > 0) {
        // cursor already appended above for last normal line
    }

    return <div className="leading-relaxed space-y-0">{nodes}</div>
}

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
}

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
                        <h1 className="text-base font-bold leading-tight">AI 書籍助理</h1>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            核心訓練圖解聖經 · 肌力訓練
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
                            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                            <p className="text-sm text-muted-foreground font-medium">詢問書中的健身知識</p>
                            <p className="text-xs text-muted-foreground mt-1">回答會標注來自哪本書的哪一頁</p>
                        </div>
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
                    回答來自書籍 OCR 內容，僅供參考。
                </p>
            </div>
        </div>
    )
}
