'use client'

import { useEffect, useState } from 'react'
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'

type MuscleData = {
    muscle: string
    thisWeek: number
    lastWeek: number
}

const MUSCLE_LABELS: Record<string, string> = {
    Chest: '胸',
    Back: '背',
    Shoulders: '肩',
    Biceps: '二頭',
    Triceps: '三頭',
    Core: '核心',
    Quads: '股四頭',
    Hamstrings: '腿後',
}

export default function MuscleRadar() {
    const [data, setData] = useState<MuscleData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/analytics/muscle-balance')
            .then(r => r.json())
            .then(res => setData(res.data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="h-64 bg-secondary/50 rounded-lg animate-pulse" />
            </div>
        )
    }

    const hasData = data.some(d => d.thisWeek > 0 || d.lastWeek > 0)

    if (!hasData) {
        return (
            <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                <h3 className="text-sm font-semibold">肌群平衡</h3>
                <div className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">尚無本週訓練資料</p>
                </div>
            </div>
        )
    }

    // Normalize for display
    const maxVal = Math.max(...data.map(d => Math.max(d.thisWeek, d.lastWeek)), 1)
    const displayData = data.map(d => ({
        muscle: MUSCLE_LABELS[d.muscle] || d.muscle,
        本週: Math.round((d.thisWeek / maxVal) * 100),
        上週: Math.round((d.lastWeek / maxVal) * 100),
        rawThisWeek: d.thisWeek,
        rawLastWeek: d.lastWeek,
    }))

    return (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold">肌群平衡</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={displayData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                            dataKey="muscle"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Radar
                            name="本週"
                            dataKey="本週"
                            stroke="hsl(16 100% 55%)"
                            fill="hsl(16 100% 55%)"
                            fillOpacity={0.25}
                            strokeWidth={2}
                        />
                        <Radar
                            name="上週"
                            dataKey="上週"
                            stroke="hsl(var(--chart-3))"
                            fill="hsl(var(--chart-3))"
                            fillOpacity={0.1}
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(value: number, name: string, props: { payload: { rawThisWeek: number; rawLastWeek: number } }) => {
                                const raw = name === '本週' ? props.payload.rawThisWeek : props.payload.rawLastWeek
                                return [`${raw.toLocaleString()} kg`, name]
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
