'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Home, TrendingUp, TrendingDown, Minus, Trophy, Clock, Dumbbell, BarChart2 } from 'lucide-react'

type OverloadSuggestion = {
    exerciseId: string
    exerciseName: string
    method: 'PROGRESSIVE_OVERLOAD' | 'MAINTAIN' | 'DELOAD'
    reasoning: string
    suggestedSets: Array<{ setNumber: number; suggestedRepsMin: number; suggestedRepsMax: number; suggestedWeightKg: number }>
}

type CompleteSummary = {
    durationMin: number
    totalSets: number
    totalVolume: number
    suggestions: OverloadSuggestion[]
}

type SessionInfo = {
    plan: { name: string } | null
    day: { dayName: string } | null
    startedAt: string
}

export default function SessionCompletePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: sessionId } = use(params)
    const [summary, setSummary] = useState<CompleteSummary | null>(null)
    const [session, setSession] = useState<SessionInfo | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Read suggestions from sessionStorage (written by active session page)
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem(`session-complete-${sessionId}`)
            if (stored) {
                try { setSummary(JSON.parse(stored)) } catch { /* ignore */ }
            }
        }

        // Also fetch session info
        fetch(`/api/sessions/${sessionId}`)
            .then(r => r.json())
            .then(data => {
                if (data.session) {
                    setSession({
                        plan: data.session.plan,
                        day: data.session.day,
                        startedAt: data.session.startedAt,
                    })

                    // If we didn't get summary from sessionStorage (e.g. direct load), try calling complete
                    if (!summary) {
                        fetch(`/api/sessions/${sessionId}/complete`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({}),
                        })
                            .then(r => r.json())
                            .then(d => { if (d.durationMin !== undefined) setSummary(d) })
                            .catch(() => { /* session might already be completed */ })
                    }
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-5xl mb-3 animate-pulse">📊</div>
                    <p className="text-muted-foreground text-sm">計算訓練成效...</p>
                </div>
            </div>
        )
    }

    const methodIcon = (method: OverloadSuggestion['method']) => {
        if (method === 'PROGRESSIVE_OVERLOAD') return <TrendingUp className="h-4 w-4 text-green-400" />
        if (method === 'DELOAD') return <TrendingDown className="h-4 w-4 text-destructive" />
        return <Minus className="h-4 w-4 text-yellow-400" />
    }

    const methodLabel = (method: OverloadSuggestion['method']) => {
        if (method === 'PROGRESSIVE_OVERLOAD') return '增加重量'
        if (method === 'DELOAD') return '降低重量'
        return '維持重量'
    }

    const methodColor = (method: OverloadSuggestion['method']) => {
        if (method === 'PROGRESSIVE_OVERLOAD') return 'text-green-400'
        if (method === 'DELOAD') return 'text-destructive'
        return 'text-yellow-400'
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="text-center space-y-2 py-4">
                <div className="text-5xl">🏆</div>
                <h1 className="text-xl font-bold">訓練完成！</h1>
                {session && (
                    <p className="text-muted-foreground text-sm">
                        {session.plan?.name}
                        {session.day?.dayName && ` · ${session.day.dayName}`}
                    </p>
                )}
            </div>

            {/* Stats row */}
            {summary && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="text-xl font-bold tabular-nums">{summary.durationMin}</p>
                        <p className="text-xs text-muted-foreground">分鐘</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <Dumbbell className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="text-xl font-bold tabular-nums">{summary.totalSets}</p>
                        <p className="text-xs text-muted-foreground">組</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <BarChart2 className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="text-xl font-bold tabular-nums">
                            {summary.totalVolume >= 1000
                                ? `${(summary.totalVolume / 1000).toFixed(1)}k`
                                : summary.totalVolume}
                        </p>
                        <p className="text-xs text-muted-foreground">kg 總量</p>
                    </div>
                </div>
            )}

            {/* Progressive overload suggestions */}
            {summary && summary.suggestions && summary.suggestions.length > 0 && (
                <div className="space-y-3">
                    <h2 className="font-semibold text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        下次訓練建議
                    </h2>
                    {summary.suggestions.map((s, i) => {
                        const name = s.exerciseName.includes(' / ')
                            ? s.exerciseName.split(' / ')[1]
                            : s.exerciseName
                        const nextWeight = s.suggestedSets[0]?.suggestedWeightKg
                        const nextSets = s.suggestedSets
                        return (
                            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">{name}</p>
                                    <div className="flex items-center gap-1">
                                        {methodIcon(s.method)}
                                        <span className={`text-xs font-medium ${methodColor(s.method)}`}>
                                            {methodLabel(s.method)}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{s.reasoning}</p>
                                {nextSets.length > 0 && (
                                    <div className="bg-background rounded-lg p-2 text-xs text-muted-foreground">
                                        建議：{nextSets[0].suggestedWeightKg} kg × {nextSets[0].suggestedRepsMin}–{nextSets[0].suggestedRepsMax} 下 × {nextSets.length} 組
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {!summary && (
                <div className="bg-card rounded-xl border border-border p-6 text-center">
                    <p className="text-muted-foreground text-sm">無法載入訓練建議</p>
                </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-2">
                <Link
                    href="/session"
                    className="flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base"
                >
                    再次訓練
                </Link>
                <Link
                    href="/"
                    className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm"
                >
                    <Home className="h-4 w-4" />
                    返回主頁
                </Link>
            </div>
        </div>
    )
}
