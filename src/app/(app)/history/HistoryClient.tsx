'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Calendar, Clock, ClipboardList, Dumbbell, TrendingUp, ChevronDown, ChevronUp, Trash2, Pencil, Check, X } from 'lucide-react'
import { sumSetsVolume, exName as extractExName } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

// ─── Types ───────────────────────────────────────────────────────────────────

type SetRecord = {
    id: string
    setNumber: number
    repsPerformed: number
    weightKg: string
    durationSeconds: number | null
}

type ExerciseRecord = {
    id: string
    exercise: { id: string; name: string }
    sets: SetRecord[]
}

type SessionSummary = {
    id: string
    startedAt: string
    completedAt: string | null
    durationMin: number | null
    plan: { name: string } | null
    day: { dayName: string } | null
    exercises: ExerciseRecord[]
}

type HistoryStats = {
    completedCount: number
    totalSets: number
    totalVolume: number
}

const PAGE_SIZE = 30

async function errorOf(res: Response, fallback: string) {
    try {
        const d = await res.json()
        if (typeof d?.error === 'string' && d.error) return d.error
    } catch { }
    return fallback
}

type ChartPoint = {
    date: string
    totalVolume: number
    totalSets: number
    durationMin: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}
function formatDateFull(iso: string) {
    return new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}
function calcVolume(session: SessionSummary) {
    return Math.round(
        session.exercises.reduce((s, e) => s + sumSetsVolume(e.sets), 0)
    )
}
function calcSets(session: SessionSummary) {
    return session.exercises.reduce((s, e) => s + e.sets.length, 0)
}
function exName(raw: string) {
    return extractExName(raw)
}

// ─── Inline Set Editor ───────────────────────────────────────────────────────

function SetRow({
    set,
    onUpdate,
    onDelete,
}: {
    set: SetRecord
    onUpdate: (id: string, reps: number, weight: number, durationSeconds?: number | null) => Promise<boolean>
    onDelete: (id: string) => Promise<boolean>
}) {
    const isTimeBased = !!set.durationSeconds
    const [editing, setEditing] = useState(false)
    const [reps, setReps] = useState(set.repsPerformed)
    const [weight, setWeight] = useState(Number(set.weightKg))
    const [dur, setDur] = useState(set.durationSeconds ?? 0)
    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)
        const ok = isTimeBased
            ? await onUpdate(set.id, 1, 0, dur)
            : await onUpdate(set.id, reps, weight)
        setSaving(false)
        if (!ok) {
            // 儲存失敗：還原成伺服器上的值
            setReps(set.repsPerformed)
            setWeight(Number(set.weightKg))
            setDur(set.durationSeconds ?? 0)
        }
        setEditing(false)
    }

    const cancel = () => {
        setReps(set.repsPerformed)
        setWeight(Number(set.weightKg))
        setDur(set.durationSeconds ?? 0)
        setEditing(false)
    }

    if (editing) {
        return (
            <div className="flex items-center gap-2 py-1.5">
                <span className="text-xs text-muted-foreground w-10 flex-shrink-0">第 {set.setNumber} 組</span>
                {isTimeBased ? (
                    <>
                        <input
                            type="number"
                            value={dur}
                            onChange={e => setDur(Number(e.target.value))}
                            className="w-20 h-10 rounded-lg bg-secondary text-foreground text-base text-center border border-border focus:outline-none focus:border-primary"
                        />
                        <span className="text-xs text-muted-foreground flex-1">秒</span>
                    </>
                ) : (
                    <>
                        <input
                            type="number"
                            value={weight}
                            onChange={e => setWeight(Number(e.target.value))}
                            className="w-20 h-10 rounded-lg bg-secondary text-foreground text-base text-center border border-border focus:outline-none focus:border-primary"
                            step="0.5"
                        />
                        <span className="text-xs text-muted-foreground">kg ×</span>
                        <input
                            type="number"
                            value={reps}
                            onChange={e => setReps(Number(e.target.value))}
                            className="w-16 h-10 rounded-lg bg-secondary text-foreground text-base text-center border border-border focus:outline-none focus:border-primary"
                        />
                        <span className="text-xs text-muted-foreground flex-1">下</span>
                    </>
                )}
                <button onClick={save} disabled={saving} className="text-green-500 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="儲存">
                    <Check className="h-5 w-5" />
                </button>
                <button onClick={cancel} className="text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="取消">
                    <X className="h-5 w-5" />
                </button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2 py-1.5">
            <span className="text-xs text-muted-foreground w-10 flex-shrink-0">第 {set.setNumber} 組</span>
            <span className="text-sm font-medium flex-1">
                {isTimeBased ? `${set.durationSeconds} 秒` : `${set.repsPerformed} 下 × ${Number(set.weightKg)} kg`}
            </span>
            <button
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                aria-label="編輯此組"
            >
                <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
                onClick={() => { if (confirm('確定刪除此組記錄？')) onDelete(set.id) }}
                className="text-muted-foreground hover:text-destructive min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors"
                aria-label="刪除此組"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
    session,
    onDelete,
    onRefresh,
}: {
    session: SessionSummary
    onDelete: (id: string) => void
    onRefresh: () => void
}) {
    const [expanded, setExpanded] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [localExercises, setLocalExercises] = useState(session.exercises)

    const isPartial = !session.completedAt
    const volume = calcVolume({ ...session, exercises: localExercises })
    const sets = calcSets({ ...session, exercises: localExercises })

    const handleDeleteSession = async () => {
        setDeleting(true)
        try {
            const res = await fetch(`/api/sessions/${session.id}`, { method: 'DELETE' })
            if (!res.ok) {
                toast({ title: await errorOf(res, '刪除訓練記錄失敗，請重試'), variant: 'destructive' })
                setDeleting(false)
                return
            }
        } catch {
            toast({ title: '刪除訓練記錄失敗，請檢查網路後重試', variant: 'destructive' })
            setDeleting(false)
            return
        }
        onDelete(session.id)
    }

    const handleUpdateSet = async (setId: string, reps: number, weight: number, durationSeconds?: number | null) => {
        const payload: Record<string, unknown> = { repsPerformed: reps, weightKg: weight }
        if (durationSeconds !== undefined) payload.durationSeconds = durationSeconds
        try {
            const res = await fetch(`/api/sessions/sets/${setId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                toast({ title: await errorOf(res, '儲存失敗，已還原為原本的記錄'), variant: 'destructive' })
                return false
            }
        } catch {
            toast({ title: '儲存失敗，已還原為原本的記錄', variant: 'destructive' })
            return false
        }
        // Update local state
        setLocalExercises(prev => prev.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => s.id === setId ? {
                ...s,
                repsPerformed: reps,
                weightKg: String(weight),
                ...(durationSeconds !== undefined && { durationSeconds }),
            } : s),
        })))
        onRefresh()
        return true
    }

    const handleDeleteSet = async (setId: string) => {
        try {
            const res = await fetch(`/api/sessions/sets/${setId}`, { method: 'DELETE' })
            if (!res.ok) {
                toast({ title: await errorOf(res, '刪除失敗，請重試'), variant: 'destructive' })
                return false
            }
        } catch {
            toast({ title: '刪除失敗，請檢查網路後重試', variant: 'destructive' })
            return false
        }
        setLocalExercises(prev => prev.map(ex => ({
            ...ex,
            sets: ex.sets.filter(s => s.id !== setId),
        })).filter(ex => ex.sets.length > 0 || !expanded))
        onRefresh()
        return true
    }

    return (
        <div className={`bg-card rounded-xl border ${isPartial ? 'border-yellow-500/40' : 'border-border'} overflow-hidden`}>
            {/* Header row */}
            <div
                className="p-4 flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">
                            {session.day?.dayName || session.plan?.name || '自由訓練'}
                        </p>
                        {isPartial && (
                            <span className="text-xs px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400 font-medium flex-shrink-0">
                                未完成
                            </span>
                        )}
                    </div>
                    {session.plan && session.day && (
                        <p className="text-xs text-muted-foreground truncate">{session.plan.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateFull(session.startedAt)}
                    </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                    {session.durationMin && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="h-3 w-3" />{session.durationMin} 分
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Dumbbell className="h-3 w-3" />{sets} 組
                    </p>
                    {volume > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <TrendingUp className="h-3 w-3" />
                            {volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : volume} kg
                        </p>
                    )}
                </div>
                <div className="flex-shrink-0 text-muted-foreground mt-0.5">
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                    {localExercises.filter(ex => ex.sets.length > 0).map(ex => (
                        <div key={ex.id}>
                            <p className="text-sm font-semibold text-foreground/70 tracking-wide mb-1.5">
                                {exName(ex.exercise.name)}
                            </p>
                            {ex.sets.map(set => (
                                <SetRow
                                    key={set.id}
                                    set={set}
                                    onUpdate={handleUpdateSet}
                                    onDelete={handleDeleteSet}
                                />
                            ))}
                        </div>
                    ))}

                    {/* Delete session */}
                    <div className="pt-2 border-t border-border">
                        {confirmDelete ? (
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-destructive flex-1">確定刪除此訓練記錄？</p>
                                <button
                                    onClick={handleDeleteSession}
                                    disabled={deleting}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50"
                                >
                                    {deleting ? '刪除中...' : '確認刪除'}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground"
                                >
                                    取消
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                刪除此訓練記錄
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
    const [chartData, setChartData] = useState<ChartPoint[]>([])
    const [sessions, setSessions] = useState<SessionSummary[]>([])
    const [stats, setStats] = useState<HistoryStats | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [loadError, setLoadError] = useState(false)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)
    const [activeMetric, setActiveMetric] = useState<'totalVolume' | 'totalSets' | 'durationMin'>('totalVolume')

    const load = useCallback(() => {
        setLoading(true)
        setLoadError(false)
        Promise.all([
            fetch(`/api/history/charts?days=${days}`),
            fetch(`/api/history?limit=${PAGE_SIZE}&stats=1`),
        ])
            .then(async ([chartsRes, histRes]) => {
                if (!chartsRes.ok || !histRes.ok) throw new Error('load failed')
                const [charts, hist] = await Promise.all([chartsRes.json(), histRes.json()])
                setChartData(charts.chartData ?? [])
                setSessions(hist.sessions ?? [])
                setStats(hist.stats ?? null)
                setHasMore(!!hist.hasMore)
            })
            .catch(() => {
                setLoadError(true)
                toast({ title: '載入訓練記錄失敗，請重試', variant: 'destructive' })
            })
            .finally(() => setLoading(false))
    }, [days])

    // 編輯 / 刪除後只重抓圖表與全期彙總，不動已載入的列表
    const refreshSummary = useCallback(() => {
        Promise.all([
            fetch(`/api/history/charts?days=${days}`).then(r => r.ok ? r.json() : null),
            fetch('/api/history?statsOnly=1').then(r => r.ok ? r.json() : null),
        ])
            .then(([charts, hist]) => {
                if (charts) setChartData(charts.chartData ?? [])
                if (hist?.stats) setStats(hist.stats)
            })
            .catch(console.error)
    }, [days])

    const loadMore = async () => {
        if (loadingMore) return
        setLoadingMore(true)
        try {
            const res = await fetch(`/api/history?limit=${PAGE_SIZE}&offset=${sessions.length}`)
            if (!res.ok) throw new Error('load more failed')
            const hist = await res.json()
            setSessions(prev => {
                const seen = new Set(prev.map(x => x.id))
                return [...prev, ...(hist.sessions as SessionSummary[]).filter(x => !seen.has(x.id))]
            })
            setHasMore(!!hist.hasMore)
        } catch {
            toast({ title: '載入更多失敗，請重試', variant: 'destructive' })
        } finally {
            setLoadingMore(false)
        }
    }

    const handleSessionDeleted = (id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id))
        refreshSummary()
    }

    useEffect(() => { load() }, [load])

    const metricLabel = {
        totalVolume: '訓練量 (kg)',
        totalSets: '總組數',
        durationMin: '時長 (分)',
    }

    const formatYAxis = (v: number) => {
        if (activeMetric === 'totalVolume' && v >= 1000) return `${(v / 1000).toFixed(0)}k`
        return String(v)
    }

    const completedSessions = sessions.filter(s => s.completedAt)
    const partialSessions = sessions.filter(s => !s.completedAt)

    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold">訓練記錄</h1>

            {/* Chart */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        {[7, 30, 90].map(d => (
                            <button key={d} onClick={() => setDays(d)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                                {d} 天
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        {(['totalVolume', 'totalSets', 'durationMin'] as const).map(m => (
                            <button key={m} onClick={() => setActiveMetric(m)}
                                className={`px-2 py-1 rounded-lg text-xs transition-colors ${activeMetric === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                {m === 'totalVolume' ? '量' : m === 'totalSets' ? '組' : '時'}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="h-44 flex flex-col items-center justify-center gap-2">
                        <div className="w-full h-full rounded-lg bg-secondary/50 animate-pulse" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-40 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">尚無資料</p>
                    </div>
                ) : (
                    <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(16 100% 55%)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(16 100% 55%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tickFormatter={v => formatDate(v)}
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                <YAxis tickFormatter={formatYAxis}
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                                    labelFormatter={v => formatDate(v)}
                                    formatter={(v) => v == null ? ['', ''] : [
                                        activeMetric === 'totalVolume' ? `${Number(v).toLocaleString()} kg` : `${v} ${activeMetric === 'durationMin' ? '分鐘' : '組'}`,
                                        metricLabel[activeMetric],
                                    ]}
                                />
                                <Area type="monotone" dataKey={activeMetric}
                                    stroke="hsl(16 100% 55%)" strokeWidth={2} fill="url(#grad)"
                                    dot={false} activeDot={{ r: 4, fill: 'hsl(16 100% 55%)' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
                <p className="text-xs text-muted-foreground text-center">{metricLabel[activeMetric]}</p>
            </div>

            {/* Stats（全期彙總，不受列表載入筆數影響） */}
            {stats && stats.completedCount > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <p className="text-xl font-bold tabular-nums">{stats.completedCount}</p>
                        <p className="text-xs text-muted-foreground">完成次數</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <p className="text-xl font-bold tabular-nums">{stats.totalSets}</p>
                        <p className="text-xs text-muted-foreground">總組數</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <p className="text-xl font-bold tabular-nums">
                            {stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(0)}k` : stats.totalVolume}
                        </p>
                        <p className="text-xs text-muted-foreground">kg 總量</p>
                    </div>
                </div>
            )}

            {/* Incomplete sessions */}
            {partialSessions.length > 0 && (
                <div>
                    <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                        未完成的訓練
                    </h2>
                    <div className="space-y-3">
                        {partialSessions.map(sess => (
                            <SessionCard
                                key={sess.id}
                                session={sess}
                                onDelete={handleSessionDeleted}
                                onRefresh={refreshSummary}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed sessions */}
            <div>
                <h2 className="font-semibold text-sm mb-3">已完成記錄
                    <span className="text-muted-foreground font-normal text-xs ml-1">（點擊展開，可編輯或刪除每一組）</span>
                </h2>
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="bg-card rounded-xl border border-border h-20 animate-pulse" />)}
                    </div>
                ) : completedSessions.length === 0 ? (
                    <div className="text-center py-12">
                        <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
                        <p className="text-muted-foreground text-sm">尚無完成的訓練記錄</p>
                        <Link href="/session" className="text-primary text-sm mt-2 block">開始第一次訓練 →</Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {loadError && (
                            <button onClick={load} className="w-full text-sm text-primary py-2">載入失敗，點此重試</button>
                        )}
                        {completedSessions.map(sess => (
                            <SessionCard
                                key={sess.id}
                                session={sess}
                                onDelete={handleSessionDeleted}
                                onRefresh={refreshSummary}
                            />
                        ))}
                    </div>
                )}
                {!loading && hasMore && (
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full mt-3 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium disabled:opacity-50"
                    >
                        {loadingMore ? '載入中...' : '載入更多'}
                    </button>
                )}
            </div>
        </div>
    )
}
