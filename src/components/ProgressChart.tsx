'use client'

import { useEffect, useState, useCallback } from 'react'
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { ChevronDown } from 'lucide-react'

type ProgressPoint = {
    week: string
    maxWeight: number | null
    totalVolume: number | null
    estimated1rm: number | null
}

type ExerciseOption = {
    id: string
    name: string
}

function exName(raw: string) {
    return raw.includes(' / ') ? raw.split(' / ')[1] : raw
}

export default function ProgressChart({ userId }: { userId?: string } = {}) {
    const [data, setData] = useState<ProgressPoint[]>([])
    const [exercises, setExercises] = useState<ExerciseOption[]>([])
    const [selectedId, setSelectedId] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    const qs = userId ? `&userId=${userId}` : ''

    // Load exercise list first
    useEffect(() => {
        fetch(`/api/analytics/progress?exerciseId=__list__${qs}`)
            .then(r => r.json())
            .then(res => {
                const list = (res.exerciseList || []) as ExerciseOption[]
                setExercises(list)
                if (list.length > 0 && !selectedId) {
                    setSelectedId(list[0].id)
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    const loadProgress = useCallback(() => {
        if (!selectedId) return
        setLoading(true)
        fetch(`/api/analytics/progress?exerciseId=${selectedId}${qs}`)
            .then(r => r.json())
            .then(res => setData(res.data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [selectedId])

    useEffect(() => { loadProgress() }, [loadProgress])

    const selectedName = exercises.find(e => e.id === selectedId)?.name

    return (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold flex-shrink-0">進步曲線</h3>
                {/* Exercise selector */}
                <div className="relative">
                    <button
                        onClick={() => setOpen(v => !v)}
                        className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 max-w-[180px] truncate"
                    >
                        <span className="truncate">{selectedName ? exName(selectedName) : '選擇動作'}</span>
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    </button>
                    {open && (
                        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto w-56">
                            {exercises.map(ex => (
                                <button
                                    key={ex.id}
                                    onClick={() => { setSelectedId(ex.id); setOpen(false) }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors ${
                                        ex.id === selectedId ? 'text-primary font-medium' : 'text-foreground'
                                    }`}
                                >
                                    {exName(ex.name)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="h-56 bg-secondary/50 rounded-lg animate-pulse" />
            ) : data.length === 0 || !data.some(d => d.maxWeight) ? (
                <div className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">
                        {exercises.length === 0 ? '尚無訓練記錄' : '選擇動作以查看進步曲線'}
                    </p>
                </div>
            ) : (
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="week"
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                yAxisId="weight"
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                                unit=" kg"
                            />
                            <YAxis
                                yAxisId="volume"
                                orientation="right"
                                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                                formatter={(value: number | null, name: string) => {
                                    if (value == null) return ['--', name]
                                    if (name === '總訓練量') return [`${value.toLocaleString()} kg`, name]
                                    return [`${value} kg`, name]
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar
                                yAxisId="volume"
                                dataKey="totalVolume"
                                name="總訓練量"
                                fill="hsl(var(--chart-3))"
                                opacity={0.4}
                                radius={[2, 2, 0, 0]}
                            />
                            <Line
                                yAxisId="weight"
                                type="monotone"
                                dataKey="maxWeight"
                                name="最大重量"
                                stroke="hsl(16 100% 55%)"
                                strokeWidth={2}
                                dot={{ r: 3, fill: 'hsl(16 100% 55%)' }}
                                connectNulls
                            />
                            <Line
                                yAxisId="weight"
                                type="monotone"
                                dataKey="estimated1rm"
                                name="預估 1RM"
                                stroke="hsl(var(--chart-4))"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                connectNulls
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}
