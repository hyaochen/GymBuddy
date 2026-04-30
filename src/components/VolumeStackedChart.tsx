'use client'

import { useEffect, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const MUSCLE_COLORS: Record<string, string> = {
    Chest: 'hsl(16 100% 55%)',      // primary orange
    Back: 'hsl(197 37% 50%)',        // chart-3 blue
    Shoulders: 'hsl(280 65% 60%)',   // chart-4 purple
    Arms: 'hsl(43 74% 66%)',         // chart-5 gold
    Legs: 'hsl(160 60% 45%)',        // chart-2 green
    Core: 'hsl(340 75% 55%)',        // pink
}

const MUSCLE_LABELS: Record<string, string> = {
    Chest: '胸',
    Back: '背',
    Shoulders: '肩',
    Arms: '手臂',
    Legs: '腿',
    Core: '核心',
}

export default function VolumeStackedChart({ userId }: { userId?: string } = {}) {
    const [data, setData] = useState<Record<string, string | number>[]>([])
    const [muscleGroups, setMuscleGroups] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const url = userId ? `/api/analytics/volume-weekly?userId=${userId}` : '/api/analytics/volume-weekly'
        fetch(url)
            .then(r => r.json())
            .then(res => {
                setData(res.data || [])
                setMuscleGroups(res.muscleGroups || [])
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="h-56 bg-secondary/50 rounded-lg animate-pulse" />
            </div>
        )
    }

    const hasData = data.some(d => muscleGroups.some(mg => (d[mg] as number) > 0))

    if (!hasData) {
        return (
            <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                <h3 className="text-sm font-semibold">每週訓練量分佈</h3>
                <div className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">尚無資料</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold">每週訓練量分佈</h3>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="week"
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
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
                            formatter={((value: number | undefined, name: string | undefined) => {
                                const v = value ?? 0
                                const n = name ?? ''
                                return [`${v.toLocaleString()} kg`, MUSCLE_LABELS[n] || n]
                            }) as never}
                        />
                        <Legend
                            formatter={(value: string) => MUSCLE_LABELS[value] || value}
                            wrapperStyle={{ fontSize: '11px' }}
                        />
                        {muscleGroups.map(mg => (
                            <Bar
                                key={mg}
                                dataKey={mg}
                                stackId="volume"
                                fill={MUSCLE_COLORS[mg] || 'hsl(var(--muted))'}
                                radius={mg === muscleGroups[muscleGroups.length - 1] ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
