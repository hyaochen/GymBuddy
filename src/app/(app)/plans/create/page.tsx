"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus, Trash2, Search } from "lucide-react"

type ExerciseItem = {
    id: string
    name: string
    gifUrl?: string | null
}

type PlanDayExercise = {
    exerciseId: string
    exerciseName: string
    defaultSets: number
    defaultRepsMin: number
    defaultRepsMax: number
    defaultWeightKg?: number
    restSeconds: number
}

type PlanDay = {
    id: string
    dayName: string
    exercises: PlanDayExercise[]
}

export default function CreatePlanPage() {
    const router = useRouter()
    const [planName, setPlanName] = useState('')
    const [description, setDescription] = useState('')
    const [days, setDays] = useState<PlanDay[]>([
        { id: '1', dayName: 'Push Day', exercises: [] },
    ])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<ExerciseItem[]>([])
    const [activeDayId, setActiveDayId] = useState<string | null>(null)
    const [searching, setSearching] = useState(false)

    const addDay = () => {
        const names = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body', 'Rest']
        const nextName = names[days.length % names.length]
        setDays(prev => [...prev, { id: Date.now().toString(), dayName: nextName, exercises: [] }])
    }

    const removeDay = (dayId: string) => {
        setDays(prev => prev.filter(d => d.id !== dayId))
    }

    const updateDayName = (dayId: string, name: string) => {
        setDays(prev => prev.map(d => d.id === dayId ? { ...d, dayName: name } : d))
    }

    const searchExercises = async (q: string) => {
        if (!q.trim()) { setSearchResults([]); return }
        setSearching(true)
        try {
            const res = await fetch(`/api/exercises?q=${encodeURIComponent(q)}&limit=10`)
            const data = await res.json()
            setSearchResults(data.exercises || [])
        } catch { } finally {
            setSearching(false)
        }
    }

    const addExerciseToDay = (dayId: string, exercise: ExerciseItem) => {
        setDays(prev => prev.map(d => {
            if (d.id !== dayId) return d
            if (d.exercises.find(e => e.exerciseId === exercise.id)) return d
            return {
                ...d,
                exercises: [...d.exercises, {
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                    defaultSets: 3,
                    defaultRepsMin: 8,
                    defaultRepsMax: 12,
                    restSeconds: 90,
                }],
            }
        }))
        setSearchResults([])
        setSearchQuery('')
    }

    const removeExercise = (dayId: string, exerciseId: string) => {
        setDays(prev => prev.map(d =>
            d.id !== dayId ? d : { ...d, exercises: d.exercises.filter(e => e.exerciseId !== exerciseId) }
        ))
    }

    const updateExercise = (dayId: string, exerciseId: string, field: string, value: number) => {
        setDays(prev => prev.map(d =>
            d.id !== dayId ? d : {
                ...d,
                exercises: d.exercises.map(e =>
                    e.exerciseId !== exerciseId ? e : { ...e, [field]: value }
                ),
            }
        ))
    }

    const handleSubmit = async () => {
        if (!planName.trim()) return alert('請輸入計畫名稱')
        setLoading(true)
        try {
            const res = await fetch('/api/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: planName,
                    description,
                    daysPerWeek: days.length,
                    days: days.map((d, idx) => ({
                        dayName: d.dayName,
                        orderIndex: idx,
                        exercises: d.exercises.map((e, exIdx) => ({
                            exerciseId: e.exerciseId,
                            orderIndex: exIdx,
                            defaultSets: e.defaultSets,
                            defaultRepsMin: e.defaultRepsMin,
                            defaultRepsMax: e.defaultRepsMax,
                            defaultWeightKg: e.defaultWeightKg,
                            restSeconds: e.restSeconds,
                        })),
                    })),
                }),
            })
            const data = await res.json()
            if (data.plan?.id) {
                router.push(`/plans/${data.plan.id}`)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <Link href="/plans" className="text-muted-foreground">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-lg font-bold">建立訓練計畫</h1>
            </div>

            {/* Plan Info */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div>
                    <label className="block text-sm font-medium mb-1.5">計畫名稱 *</label>
                    <input
                        value={planName}
                        onChange={e => setPlanName(e.target.value)}
                        placeholder="例如：PPL 推拉腿"
                        className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">描述（選填）</label>
                    <input
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="計畫說明..."
                        className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
            </div>

            {/* Days */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold">訓練日</h2>
                    <button onClick={addDay} className="flex items-center gap-1 text-sm text-primary">
                        <Plus className="h-4 w-4" />
                        新增天數
                    </button>
                </div>

                {days.map(day => (
                    <div key={day.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                value={day.dayName}
                                onChange={e => updateDayName(day.id, e.target.value)}
                                className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button onClick={() => removeDay(day.id)} className="text-destructive/60 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Exercises in this day */}
                        {day.exercises.map((ex, idx) => (
                            <div key={ex.exerciseId} className="space-y-2 py-2 border-t border-border first:border-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {idx + 1}. {ex.exerciseName.split(' / ')[1] || ex.exerciseName.split(' ')[0]}
                                        </p>
                                    </div>
                                    <button onClick={() => removeExercise(day.id, ex.exerciseId)} className="text-destructive/60 hover:text-destructive flex-shrink-0">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div>
                                        <label className="text-muted-foreground">組數</label>
                                        <input
                                            type="number"
                                            value={ex.defaultSets}
                                            onChange={e => updateExercise(day.id, ex.exerciseId, 'defaultSets', parseInt(e.target.value))}
                                            className="w-full h-8 px-2 rounded-md bg-background border border-border text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                                            min={1} max={10}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-muted-foreground">最少下</label>
                                        <input
                                            type="number"
                                            value={ex.defaultRepsMin}
                                            onChange={e => updateExercise(day.id, ex.exerciseId, 'defaultRepsMin', parseInt(e.target.value))}
                                            className="w-full h-8 px-2 rounded-md bg-background border border-border text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                                            min={1} max={50}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-muted-foreground">最多下</label>
                                        <input
                                            type="number"
                                            value={ex.defaultRepsMax}
                                            onChange={e => updateExercise(day.id, ex.exerciseId, 'defaultRepsMax', parseInt(e.target.value))}
                                            className="w-full h-8 px-2 rounded-md bg-background border border-border text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                                            min={1} max={50}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-muted-foreground">休息(秒)</label>
                                        <input
                                            type="number"
                                            value={ex.restSeconds}
                                            onChange={e => updateExercise(day.id, ex.exerciseId, 'restSeconds', parseInt(e.target.value))}
                                            className="w-full h-8 px-2 rounded-md bg-background border border-border text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                                            min={15} step={15}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Search to add exercise */}
                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    value={activeDayId === day.id ? searchQuery : ''}
                                    onFocus={() => setActiveDayId(day.id)}
                                    onChange={e => {
                                        setSearchQuery(e.target.value)
                                        searchExercises(e.target.value)
                                    }}
                                    placeholder="新增動作..."
                                    className="w-full h-9 pl-8 pr-3 rounded-lg bg-background border border-dashed border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-solid"
                                />
                            </div>
                            {activeDayId === day.id && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                                    {searchResults.map(ex => (
                                        <button
                                            key={ex.id}
                                            type="button"
                                            onClick={() => { addExerciseToDay(day.id, ex); setActiveDayId(null) }}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-accent border-b border-border last:border-0 truncate"
                                        >
                                            {ex.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={loading || !planName.trim()}
                className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50"
            >
                {loading ? '儲存中...' : '建立計畫'}
            </button>
        </div>
    )
}
