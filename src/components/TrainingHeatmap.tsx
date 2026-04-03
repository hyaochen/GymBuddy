'use client'

import { useEffect, useState } from 'react'
import { Flame, Trophy } from 'lucide-react'

type HeatmapDay = { date: string; volume: number }
type HeatmapData = {
    days: HeatmapDay[]
    currentStreak: number
    longestStreak: number
}

function getIntensityClass(volume: number, max: number): string {
    if (volume === 0) return 'bg-secondary/40'
    const ratio = volume / max
    if (ratio < 0.25) return 'bg-primary/25'
    if (ratio < 0.5) return 'bg-primary/45'
    if (ratio < 0.75) return 'bg-primary/70'
    return 'bg-primary'
}

export default function TrainingHeatmap({ compact = false }: { compact?: boolean }) {
    const [data, setData] = useState<HeatmapData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/analytics/heatmap')
            .then(r => r.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="h-28 bg-secondary/50 rounded-lg animate-pulse" />
            </div>
        )
    }

    if (!data) return null

    const maxVolume = Math.max(...data.days.map(d => d.volume), 1)

    // Organize days into a grid: 7 rows (Sun-Sat) x 13 columns (weeks)
    // We need to figure out what day of the week the first day falls on
    const firstDate = new Date(data.days[0].date + 'T00:00:00')
    const firstDow = firstDate.getDay()

    // Build grid
    const grid: (HeatmapDay | null)[][] = Array.from({ length: 7 }, () => [])
    let col = 0
    let row = firstDow

    // Fill leading nulls
    for (let i = 0; i < firstDow; i++) {
        grid[i].push(null)
    }

    for (const day of data.days) {
        if (row >= 7) {
            row = 0
            col++
        }
        while (grid[row].length < col) {
            grid[row].push(null)
        }
        grid[row].push(day)
        row++
    }

    // Pad remaining
    const maxCols = Math.max(...grid.map(r => r.length))
    for (const r of grid) {
        while (r.length < maxCols) {
            r.push(null)
        }
    }

    const dayLabels = ['日', '一', '二', '三', '四', '五', '六']

    return (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            {/* Streak info */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">訓練熱度</h3>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs">
                        <Flame className="h-3.5 w-3.5 text-orange-400" />
                        <span className="text-muted-foreground">連續</span>
                        <span className="font-bold text-foreground">{data.currentStreak}</span>
                        <span className="text-muted-foreground">天</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                        <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                        <span className="text-muted-foreground">最長</span>
                        <span className="font-bold text-foreground">{data.longestStreak}</span>
                        <span className="text-muted-foreground">天</span>
                    </div>
                </div>
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-0.5 overflow-x-auto">
                {/* Day labels */}
                {!compact && (
                    <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0">
                        {dayLabels.map((label, i) => (
                            <div key={i} className="h-3 w-4 text-[9px] text-muted-foreground flex items-center">
                                {i % 2 === 1 ? label : ''}
                            </div>
                        ))}
                    </div>
                )}
                {/* Columns (weeks) */}
                {Array.from({ length: maxCols }, (_, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-0.5">
                        {grid.map((rowArr, rowIdx) => {
                            const cell = rowArr[colIdx]
                            if (!cell) {
                                return <div key={rowIdx} className="w-3 h-3 rounded-[2px]" />
                            }
                            return (
                                <div
                                    key={rowIdx}
                                    className={`w-3 h-3 rounded-[2px] ${getIntensityClass(cell.volume, maxVolume)} transition-colors`}
                                    title={`${cell.date}: ${cell.volume > 0 ? `${cell.volume.toLocaleString()} kg` : '休息日'}`}
                                />
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                <span>少</span>
                <div className="w-3 h-3 rounded-[2px] bg-secondary/40" />
                <div className="w-3 h-3 rounded-[2px] bg-primary/25" />
                <div className="w-3 h-3 rounded-[2px] bg-primary/45" />
                <div className="w-3 h-3 rounded-[2px] bg-primary/70" />
                <div className="w-3 h-3 rounded-[2px] bg-primary" />
                <span>多</span>
            </div>
        </div>
    )
}
