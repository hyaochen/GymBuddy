"use client"

import { useEffect, useRef, useState } from "react"
import { Users, Check, Target, TrendingUp, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { addTaipeiDays, parseTaipeiDateInput, taipeiDateKey } from "@/lib/timezone"
import { toast } from "@/components/ui/use-toast"

export const CHALLENGE_TYPE_LABELS: Record<string, string> = {
    STREAK: "連續訓練天數",
    TOTAL_SESSIONS: "訓練次數",
    WEIGHT_PR: "重量目標",
    VOLUME: "總訓練量",
}

export const CHALLENGE_TYPE_UNITS: Record<string, string> = {
    STREAK: "天",
    TOTAL_SESSIONS: "次",
    WEIGHT_PR: "kg",
    VOLUME: "kg",
}

/** How progress is counted; matches computeChallengeProgress in src/lib/badges.ts. */
const CHALLENGE_TYPE_RULES: Record<string, string> = {
    STREAK: "計算挑戰期間內最長的連續訓練天數",
    TOTAL_SESSIONS: "計算挑戰期間內完成的訓練次數",
    WEIGHT_PR: "計算挑戰期間內該動作的最大單組重量（不含限時組）",
    VOLUME: "計算挑戰期間內的總訓練量（不含限時組）",
}

export interface ChallengeData {
    id: string
    title: string
    description: string | null
    type: string
    targetValue: number
    startDate: string
    endDate: string
    exerciseId: string | null
    isPublic?: boolean
    exercise: { id: string; name: string } | null
    creator: { id: string; name: string }
    participants: { userId: string; currentValue: number; completed: boolean; user: { name: string } }[]
    participantCount: number
    isJoined: boolean
    myProgress: { currentValue: number; completed: boolean } | null
}

type Phase = "active" | "upcoming" | "ended"

function challengePhase(c: { startDate: string; endDate: string }, now = Date.now()): Phase {
    if (new Date(c.endDate).getTime() < now) return "ended"
    if (new Date(c.startDate).getTime() > now) return "upcoming"
    return "active"
}

function phaseLabel(c: { startDate: string; endDate: string }): string {
    const now = Date.now()
    const phase = challengePhase(c, now)
    if (phase === "ended") return "已結束"
    if (phase === "upcoming") {
        const days = Math.ceil((new Date(c.startDate).getTime() - now) / 86400000)
        return days <= 1 ? "明天開始" : `${days} 天後開始`
    }
    const days = Math.ceil((new Date(c.endDate).getTime() - now) / 86400000)
    return days <= 1 ? "剩餘 1 天" : `剩餘 ${days} 天`
}

// ─── Grouped list ───────────────────────────────────────────────────────────

export function ChallengeGroups({ challenges, onJoin }: { challenges: ChallengeData[]; onJoin: (id: string) => void }) {
    const now = Date.now()
    const groups: { key: Phase; title: string; items: ChallengeData[] }[] = [
        { key: "active", title: "進行中", items: challenges.filter(c => challengePhase(c, now) === "active") },
        { key: "upcoming", title: "即將開始", items: challenges.filter(c => challengePhase(c, now) === "upcoming") },
        { key: "ended", title: "已結束（最近 30 天）", items: challenges.filter(c => challengePhase(c, now) === "ended") },
    ]
    return (
        <>
            {groups.filter(g => g.items.length > 0).map(g => (
                <div key={g.key} className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground">{g.title} ({g.items.length})</h3>
                    {g.items.map(c => (
                        <ChallengeCard key={c.id} challenge={c} onJoin={() => onJoin(c.id)} />
                    ))}
                </div>
            ))}
        </>
    )
}

// ─── Challenge Card ─────────────────────────────────────────────────────────

function ChallengeCard({ challenge: c, onJoin }: { challenge: ChallengeData; onJoin: () => void }) {
    const phase = challengePhase(c)
    const isEnded = phase === "ended"

    return (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold">{c.title}</h3>
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2",
                    phase === "active" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                )}>
                    {phaseLabel(c)}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    {CHALLENGE_TYPE_LABELS[c.type] || c.type}
                </span>
                <span className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    目標 {c.targetValue} {CHALLENGE_TYPE_UNITS[c.type]}
                </span>
                <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c.participantCount} 人
                </span>
                {c.isPublic === false && <span className="rounded-full bg-secondary px-2 py-0.5">僅好友</span>}
            </div>

            <p className="text-[11px] text-muted-foreground">
                {taipeiDateKey(new Date(c.startDate))} 至 {taipeiDateKey(new Date(c.endDate))}，{CHALLENGE_TYPE_RULES[c.type] ?? ""}
            </p>

            {c.exercise && (
                <div className="text-xs text-muted-foreground">
                    動作：<span className="text-foreground font-medium">{c.exercise.name}</span>
                </div>
            )}

            {/* Participants progress */}
            {c.participants.length > 0 && (
                <div className="space-y-1.5">
                    {c.participants.slice(0, 5).map(p => {
                        const pct = Math.min(100, (p.currentValue / c.targetValue) * 100)
                        return (
                            <div key={p.userId} className="flex items-center gap-2">
                                <span className="text-xs w-20 truncate font-medium">
                                    {p.completed && <Check className="mr-0.5 inline h-3 w-3 text-green-400" aria-label="已完成" />}{p.user.name}
                                </span>
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all",
                                            p.completed ? "bg-green-500" : "bg-primary"
                                        )}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                                    {p.currentValue}/{c.targetValue}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* My progress highlight */}
            {c.isJoined && c.myProgress && (
                <div className="bg-primary/10 rounded-lg p-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium">你的進度</span>
                    <span className="text-sm font-bold text-primary tabular-nums">
                        {c.myProgress.currentValue} / {c.targetValue} {CHALLENGE_TYPE_UNITS[c.type]}
                        {c.myProgress.completed && <Check className="ml-1 inline h-3.5 w-3.5" aria-label="已完成" />}
                    </span>
                </div>
            )}

            {/* Join button */}
            {!c.isJoined && !isEnded && (
                <button
                    onClick={onJoin}
                    className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <ArrowRight className="h-4 w-4" />
                    加入挑戰
                </button>
            )}
        </div>
    )
}

// ─── Create Challenge Form ──────────────────────────────────────────────────

const HAS_CJK = /[一-鿿]/

export function CreateChallengeForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [type, setType] = useState("TOTAL_SESSIONS")
    const [targetValue, setTargetValue] = useState("")
    const [startDate, setStartDate] = useState(taipeiDateKey(new Date()))
    const [endDate, setEndDate] = useState("")
    const [isPublic, setIsPublic] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [exerciseId, setExerciseId] = useState("")
    const [exercises, setExercises] = useState<{ id: string; name: string }[]>([])
    const [error, setError] = useState("")
    const exercisesRequested = useRef(false)

    // Default end date: 30 days from now
    useEffect(() => {
        setEndDate(taipeiDateKey(addTaipeiDays(new Date(), 30)))
    }, [])

    // Fetch exercises when WEIGHT_PR is selected (timed exercises have no meaningful kg target)
    useEffect(() => {
        if (type !== "WEIGHT_PR" || exercisesRequested.current) return
        exercisesRequested.current = true
        fetch("/api/exercises?limit=500")
            .then(r => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
            .then(data => {
                const list = (data.exercises || [])
                    .filter((e: { isTimeBased?: boolean }) => !e.isTimeBased)
                    .map((e: { id: string; name: string }) => ({ id: e.id, name: e.name }))
                setExercises(list)
            })
            .catch(() => {
                exercisesRequested.current = false
                toast({ variant: "destructive", title: "無法載入動作清單", description: "請切換類型重試" })
            })
    }, [type])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return

        const target = Number(targetValue)
        if (!title.trim() || !targetValue) {
            setError("請填寫標題和目標值")
            return
        }
        if (!Number.isInteger(target) || target <= 0) {
            setError("目標值必須是大於 0 的整數")
            return
        }
        if (type === "WEIGHT_PR" && !exerciseId) {
            setError("重量目標挑戰需選擇動作")
            return
        }
        if (!startDate || !endDate) {
            setError("請選擇開始與結束日期")
            return
        }
        let start: Date
        let end: Date
        try {
            start = parseTaipeiDateInput(startDate)
            end = parseTaipeiDateInput(endDate)
        } catch {
            setError("日期格式不正確")
            return
        }
        if (end <= start) {
            setError("結束日期必須在開始日期之後")
            return
        }

        setSubmitting(true)
        setError("")
        try {
            const res = await fetch("/api/challenges", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description || null,
                    type,
                    targetValue: target,
                    exerciseId: type === "WEIGHT_PR" ? exerciseId : undefined,
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    isPublic,
                }),
            })

            if (res.ok) {
                toast({ variant: "success", title: "挑戰已建立" })
                onCreated()
            } else {
                const data = await res.json().catch(() => ({}))
                const message = typeof data.error === "string" && HAS_CJK.test(data.error) ? data.error : "建立失敗，請檢查欄位後再試"
                setError(message)
                toast({ variant: "destructive", title: "建立失敗", description: message })
            }
        } catch {
            setError("網路錯誤，請稍後再試")
            toast({ variant: "destructive", title: "建立失敗", description: "網路錯誤，請稍後再試" })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold">建立新挑戰</h3>

            <div>
                <label className="text-xs text-muted-foreground block mb-1">挑戰名稱</label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="例：30天深蹲挑戰"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            <div>
                <label className="text-xs text-muted-foreground block mb-1">說明（選填）</label>
                <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="挑戰說明..."
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">挑戰類型</label>
                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="TOTAL_SESSIONS">訓練次數</option>
                        <option value="STREAK">連續天數</option>
                        <option value="VOLUME">總訓練量 (kg)</option>
                        <option value="WEIGHT_PR">重量目標 (kg)</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                        目標值 ({CHALLENGE_TYPE_UNITS[type]})
                    </label>
                    <input
                        type="number"
                        min={1}
                        step={1}
                        value={targetValue}
                        onChange={e => setTargetValue(e.target.value)}
                        placeholder="例：30"
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>
            <p className="text-[11px] text-muted-foreground">{CHALLENGE_TYPE_RULES[type]}</p>

            {type === "WEIGHT_PR" && (
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">目標動作</label>
                    <select
                        value={exerciseId}
                        onChange={e => setExerciseId(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="">選擇動作...</option>
                        {exercises.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">開始日期</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">結束日期（含當天）</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            <div>
                <label className="text-xs text-muted-foreground block mb-1">可見範圍</label>
                <select
                    value={isPublic ? "public" : "friends"}
                    onChange={e => setIsPublic(e.target.value === "public")}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    <option value="public">公開（所有人可見、可加入）</option>
                    <option value="friends">僅好友（只有你的好友看得到）</option>
                </select>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 bg-secondary text-foreground rounded-xl py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                    取消
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {submitting ? "建立中..." : "建立"}
                </button>
            </div>
        </form>
    )
}
