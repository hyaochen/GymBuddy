'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Calendar, Clock, Dumbbell, TrendingUp, ChevronDown, ChevronUp, Trash2, Pencil, Check, X } from 'lucide-react'
import { sumSetsVolume, exName as extractExName } from '@/lib/utils'

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
    onUpdate: (id: string, reps: number, weight: number, durationSeconds?: number | null) => Promise<void>
    onDelete: (id: string) => Promise<void>
}) {
    const isTimeBased = !!set.durationSeconds
    const [editing, setEditing] = useState(false)
    const [reps, setReps] = useState(set.repsPerformed)
    const [weight, setWeight] = useState(Number(set.weightKg))
    const [dur, setDur] = useState(set.durationSeconds ?? 0)
    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)
        if (isTimeBased) {
            await onUpdate(set.id, 1, 0, dur)
        } else {
            await onUpdate(set.id, reps, weight)
        }
        setSaving(false)
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
        await fetch(`/api/sessions/${session.id}`, { method: 'DELETE' })
        onDelete(session.id)
    }

    const handleUpdateSet = async (setId: string, reps: number, weight: number, durationSeconds?: number | null) => {
        const payload: Record<string, unknown> = { repsPerformed: reps, weightKg: weight }
        if (durationSeconds !== undefined) payload.durationSeconds = durationSeconds
        await fetch(`/api/sessions/sets/${setId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
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
    }

    const handleDeleteSet = async (setId: string) => {
        await fetch(`/api/sessions/sets/${setId}`, { method: 'DELETE' })
        setLocalExercises(prev => prev.map(ex => ({
            ...ex,
            sets: ex.sets.filter(s => s.id !== setId),
        })).filter(ex => ex.sets.length > 0 || !expanded))
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
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)
    const [activeMetric, setActiveMetric] = useState<'totalVolume' | 'totalSets' | 'durationMin'>('totalVolume')

    const load = useCallback(() => {
        setLoading(true)
        Promise.all([
            fetch(`/api/history/charts?days=${days}`).then(r => r.json()),
            fetch('/api/history?limit=30').then(r => r.json()),
        ])
            .then(([charts, hist]) => {
                setChartData(charts.chartData ?? [])
                setSessions(hist.sessions ?? [])
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [days])

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

            {/* Stats */}
            {completedSessions.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <p className="text-xl font-bold tabular-nums">{completedSessions.length}</p>
                        <p className="text-xs text-muted-foreground">完成次數</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <p className="text-xl font-bold tabular-nums">
                            {completedSessions.reduce((s, sess) => s + calcSets(sess), 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">總組數</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <p className="text-xl font-bold tabular-nums">
                            {(() => {
                                const v = completedSessions.reduce((s, sess) => s + calcVolume(sess), 0)
                                return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                            })()}
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
                                onDelete={id => setSessions(prev => prev.filter(s => s.id !== id))}
                                onRefresh={load}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed sessions */}
            <div>
                <h2 className="font-semibold text-sm mb-3">已完成記錄
                    <span className="text-muted-foreground font-normal text-xs ml-1">（點擊展開 / 長按可編輯）</span>
                </h2>
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="bg-card rounded-xl border border-border h-20 animate-pulse" />)}
                    </div>
                ) : completedSessions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-muted-foreground text-sm">尚無完成的訓練記錄</p>
                        <Link href="/session" className="text-primary text-sm mt-2 block">開始第一次訓練 →</Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {completedSessions.map(sess => (
                            <SessionCard
                                key={sess.id}
                                session={sess}
                                onDelete={id => setSessions(prev => prev.filter(s => s.id !== id))}
                                onRefresh={load}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
