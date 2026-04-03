'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Dumbbell, Calendar, Trophy } from 'lucide-react'

type EquipmentItem = {
    id: string
    name: string
    category: string
    sessionCount: number
    maxWeight: number
    lastUsed: string
    exerciseCount: number
    exercises: string[]
}

const CATEGORY_LABELS: Record<string, string> = {
    FREE_WEIGHTS: '自由重量',
    MACHINES: '機械',
    CABLES: '纜繩',
    CARDIO: '有氧',
    BODYWEIGHT: '徒手',
    STATIONS: '站台',
}

function exName(raw: string) {
    return raw.includes(' / ') ? raw.split(' / ')[1] : raw
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

function EquipmentCard({ item }: { item: EquipmentItem }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full p-3 flex items-center gap-3 text-left"
            >
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[item.category] || item.category} · {item.exerciseCount} 動作
                    </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="text-xs font-medium text-primary">{item.maxWeight} kg PR</p>
                    <p className="text-xs text-muted-foreground">{item.sessionCount} 次使用</p>
                </div>
                <div className="flex-shrink-0 text-muted-foreground">
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>

            {expanded && (
                <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3 text-yellow-400" />
                            PR: {item.maxWeight} kg
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            最近: {formatDate(item.lastUsed)}
                        </span>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">相關動作：</p>
                        <div className="flex flex-wrap gap-1.5">
                            {item.exercises.map(ex => (
                                <span key={ex} className="text-xs bg-secondary text-secondary-foreground rounded-lg px-2 py-0.5">
                                    {exName(ex)}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function EquipmentStats() {
    const [data, setData] = useState<EquipmentItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetch('/api/analytics/equipment')
            .then(r => r.json())
            .then(res => setData(res.data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="h-40 bg-secondary/50 rounded-lg animate-pulse" />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                <h3 className="text-sm font-semibold">器材統計</h3>
                <div className="h-24 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">尚無器材使用記錄</p>
                </div>
            </div>
        )
    }

    const filtered = search
        ? data.filter(d =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            (CATEGORY_LABELS[d.category] || '').includes(search)
        )
        : data

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold flex-shrink-0">器材統計</h3>
                <input
                    type="text"
                    placeholder="搜尋器材..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="text-xs bg-secondary text-foreground rounded-lg px-3 py-1.5 border border-border focus:outline-none focus:border-primary w-36"
                />
            </div>
            <div className="space-y-2">
                {filtered.map(item => (
                    <EquipmentCard key={item.id} item={item} />
                ))}
                {filtered.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-6">找不到符合的器材</p>
                )}
            </div>
        </div>
    )
}
