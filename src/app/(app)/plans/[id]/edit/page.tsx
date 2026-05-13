'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Save, Plus, Minus, Check, Trash2, Search, X, GripVertical } from 'lucide-react'
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type PlanExercise = {
    id: string
    orderIndex: number
    defaultSets: number
    defaultRepsMin: number
    defaultRepsMax: number
    restSeconds: number
    defaultWeightKg: number | null
    exercise: { id: string; name: string }
}

type PlanDay = {
    id: string
    dayName: string
    orderIndex: number
    exercises: PlanExercise[]
}

type Plan = {
    id: string
    name: string
    description: string | null
    days: PlanDay[]
}

type DirtyMap = Record<string, Partial<PlanExercise>>

export default function PlanEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [plan, setPlan] = useState<Plan | null>(null)
    const [dirty, setDirty] = useState<DirtyMap>({})
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [planName, setPlanName] = useState('')
    const [deleteMsg, setDeleteMsg] = useState('')
    const [dayNames, setDayNames] = useState<Record<string, string>>({})
    const [addingTo, setAddingTo] = useState<string | null>(null)
    const [searchQ, setSearchQ] = useState('')
    const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        fetch(`/api/plans/${id}`)
            .then(r => r.json())
            .then(d => {
                setPlan(d.plan)
                setPlanName(d.plan.name)
            })
    }, [id])

    const update = useCallback((peId: string, field: keyof PlanExercise, value: number) => {
        setDirty(prev => ({ ...prev, [peId]: { ...prev[peId], [field]: value } }))
    }, [])

    const getVal = (pe: PlanExercise, field: keyof PlanExercise) => {
        return (dirty[pe.id]?.[field] ?? pe[field]) as number
    }

    const saveAll = async () => {
        if (!plan) return
        setSaving(true)
        try {
            // Save plan name if changed
            if (planName !== plan.name) {
                await fetch(`/api/plans/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: planName, description: plan.description, daysPerWeek: plan.days.length }),
                })
            }
            // Save dirty day names
            await Promise.all(
                Object.entries(dayNames).map(([dayId, newName]) =>
                    fetch(`/api/plan-days/${dayId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dayName: newName }),
                    })
                )
            )
            // Save each dirty exercise
            await Promise.all(
                Object.entries(dirty).map(([peId, changes]) =>
                    fetch(`/api/plan-exercises/${peId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(changes),
                    })
                )
            )
            // Update local plan state with saved day names
            if (Object.keys(dayNames).length > 0) {
                setPlan(prev => prev ? {
                    ...prev,
                    days: prev.days.map(d => dayNames[d.id] ? { ...d, dayName: dayNames[d.id] } : d)
                } : prev)
            }
            setDayNames({})
            setDirty({})
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } finally {
            setSaving(false)
        }
    }

    const showDeleted = (msg: string) => {
        setDeleteMsg(msg)
        setTimeout(() => setDeleteMsg(''), 2000)
    }

    const deleteDay = async (dayId: string) => {
        if (!plan) return
        const dayName = plan.days.find(d => d.id === dayId)?.dayName
        const res = await fetch(`/api/plan-days/${dayId}`, { method: 'DELETE' })
        if (res.ok) {
            setPlan({ ...plan, days: plan.days.filter(d => d.id !== dayId) })
            showDeleted(`已刪除「${dayName}」`)
        }
    }

    const deleteExercise = async (dayId: string, peId: string) => {
        if (!plan) return
        const res = await fetch(`/api/plan-exercises/${peId}`, { method: 'DELETE' })
        if (res.ok) {
            setPlan({
                ...plan,
                days: plan.days.map(d =>
                    d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== peId) } : d
                ),
            })
            const newDirty = { ...dirty }
            delete newDirty[peId]
            setDirty(newDirty)
            showDeleted('動作已刪除')
        }
    }

    const searchExercises = async (q: string) => {
        setSearchQ(q)
        if (!q.trim()) { setSearchResults([]); return }
        setSearching(true)
        try {
            const res = await fetch(`/api/exercises?q=${encodeURIComponent(q)}&limit=10`)
            const data = await res.json()
            setSearchResults(data.exercises || [])
        } catch { } finally { setSearching(false) }
    }

    const reorderExercises = useCallback(async (dayId: string, fromId: string, toId: string) => {
        if (fromId === toId) return
        setPlan(prev => {
            if (!prev) return prev
            const next = {
                ...prev,
                days: prev.days.map(d => {
                    if (d.id !== dayId) return d
                    const oldIdx = d.exercises.findIndex(e => e.id === fromId)
                    const newIdx = d.exercises.findIndex(e => e.id === toId)
                    if (oldIdx < 0 || newIdx < 0) return d
                    const reordered = arrayMove(d.exercises, oldIdx, newIdx).map((e, i) => ({ ...e, orderIndex: i }))
                    return { ...d, exercises: reordered }
                }),
            }
            const day = next.days.find(d => d.id === dayId)
            if (day) {
                const exerciseIds = day.exercises.map(e => e.id)
                fetch(`/api/plan-days/${dayId}/reorder`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ exerciseIds }),
                }).catch(() => {})
            }
            return next
        })
    }, [])

    const addExercise = async (dayId: string, exercise: { id: string; name: string }) => {
        if (!plan) return
        const res = await fetch('/api/plan-exercises', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dayId, exerciseId: exercise.id }),
        })
        if (res.ok) {
            const data = await res.json()
            setPlan({
                ...plan,
                days: plan.days.map(d =>
                    d.id !== dayId ? d : {
                        ...d,
                        exercises: [...d.exercises, {
                            id: data.exercise.id,
                            orderIndex: data.exercise.orderIndex,
                            defaultSets: data.exercise.defaultSets,
                            defaultRepsMin: data.exercise.defaultRepsMin,
                            defaultRepsMax: data.exercise.defaultRepsMax,
                            restSeconds: data.exercise.restSeconds,
                            defaultWeightKg: data.exercise.defaultWeightKg,
                            exercise: { id: exercise.id, name: exercise.name },
                        }],
                    }
                ),
            })
            setAddingTo(null)
            setSearchQ('')
            setSearchResults([])
            showDeleted('動作已新增')
        }
    }

    if (!plan) return <div className="text-center py-20 text-muted-foreground">載入中...</div>

    const hasDirty = planName !== plan.name || Object.keys(dirty).length > 0 || Object.keys(dayNames).length > 0

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3 sticky top-0 bg-background/90 backdrop-blur py-2 z-10">
                <Link href={`/plans/${id}`} className="text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <input
                    value={planName}
                    onChange={e => setPlanName(e.target.value)}
                    className="flex-1 text-lg font-bold bg-transparent border-b border-transparent focus:border-primary outline-none"
                />
                <button
                    onClick={saveAll}
                    disabled={saving || !hasDirty}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        saved ? 'bg-green-600 text-white' :
                        hasDirty ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saved ? '已儲存' : saving ? '儲存中...' : '儲存'}
                </button>
            </div>

            {deleteMsg && (
                <div className="bg-green-500/15 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 text-center">
                    {deleteMsg}
                </div>
            )}

            {/* Days */}
            {plan.days.map(day => (
                <div key={day.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between gap-2">
                        <input
                            value={dayNames[day.id] ?? day.dayName}
                            onChange={e => {
                                const val = e.target.value
                                setDayNames(prev => {
                                    if (val === day.dayName) { const next = { ...prev }; delete next[day.id]; return next }
                                    return { ...prev, [day.id]: val }
                                })
                            }}
                            className="font-semibold text-sm bg-transparent flex-1 outline-none border-b border-transparent focus:border-primary"
                        />
                        <button
                            onClick={() => { if (confirm(`確定刪除「${day.dayName}」？此操作無法復原。`)) deleteDay(day.id) }}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <DayExerciseList
                        day={day}
                        dirty={dirty}
                        getVal={getVal}
                        update={update}
                        deleteExercise={deleteExercise}
                        reorderExercises={reorderExercises}
                    />
                    {/* Add exercise */}
                    {addingTo === day.id ? (
                        <div className="px-4 py-3 border-t border-border space-y-2">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <input
                                    autoFocus
                                    value={searchQ}
                                    onChange={e => searchExercises(e.target.value)}
                                    placeholder="搜尋動作名稱..."
                                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                                />
                                <button onClick={() => { setAddingTo(null); setSearchQ(''); setSearchResults([]) }} className="text-muted-foreground hover:text-foreground p-1">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {searching && <p className="text-xs text-muted-foreground">搜尋中...</p>}
                            {searchResults.length > 0 && (
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {searchResults.map(ex => (
                                        <button
                                            key={ex.id}
                                            onClick={() => addExercise(day.id, ex)}
                                            className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors truncate"
                                        >
                                            {ex.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => { setAddingTo(day.id); setSearchQ(''); setSearchResults([]) }}
                            className="w-full px-4 py-2.5 border-t border-border text-sm text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Plus className="h-4 w-4" /> 新增動作
                        </button>
                    )}
                </div>
            ))}

            {/* Add day */}
            <button
                onClick={async () => {
                    const res = await fetch('/api/plan-days', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ planId: id }),
                    })
                    if (res.ok) {
                        const data = await res.json()
                        setPlan(prev => prev ? {
                            ...prev,
                            days: [...prev.days, { ...data.day, exercises: [] }],
                        } : prev)
                        showDeleted('訓練日已新增')
                    }
                }}
                className="w-full py-3 rounded-xl border border-dashed border-border text-sm text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
            >
                <Plus className="h-4 w-4" /> 新增訓練日
            </button>
        </div>
    )
}

type DayExerciseListProps = {
    day: PlanDay
    dirty: DirtyMap
    getVal: (pe: PlanExercise, field: keyof PlanExercise) => number
    update: (peId: string, field: keyof PlanExercise, value: number) => void
    deleteExercise: (dayId: string, peId: string) => void
    reorderExercises: (dayId: string, fromId: string, toId: string) => void
}

function DayExerciseList({ day, dirty, getVal, update, deleteExercise, reorderExercises }: DayExerciseListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e
        if (!over || active.id === over.id) return
        reorderExercises(day.id, String(active.id), String(over.id))
    }

    return (
        <div className="divide-y divide-border">
            {day.exercises.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">尚無動作</div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={day.exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    {day.exercises.map((pe, idx) => (
                        <SortableExerciseRow
                            key={pe.id}
                            pe={pe}
                            idx={idx}
                            dayId={day.id}
                            isDirty={!!dirty[pe.id]}
                            getVal={getVal}
                            update={update}
                            deleteExercise={deleteExercise}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    )
}

type SortableExerciseRowProps = {
    pe: PlanExercise
    idx: number
    dayId: string
    isDirty: boolean
    getVal: (pe: PlanExercise, field: keyof PlanExercise) => number
    update: (peId: string, field: keyof PlanExercise, value: number) => void
    deleteExercise: (dayId: string, peId: string) => void
}

function SortableExerciseRow({ pe, idx, dayId, isDirty, getVal, update, deleteExercise }: SortableExerciseRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pe.id })
    const sets = getVal(pe, 'defaultSets')
    const repsMin = getVal(pe, 'defaultRepsMin')
    const repsMax = getVal(pe, 'defaultRepsMax')
    const rest = getVal(pe, 'restSeconds')
    const weight = getVal(pe, 'defaultWeightKg')

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 10 : 'auto',
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`px-4 py-3 space-y-2 ${isDirty ? 'bg-primary/5' : ''} ${isDragging ? 'bg-muted/30' : ''}`}
        >
            <div className="flex items-center gap-2">
                <button
                    {...attributes}
                    {...listeners}
                    aria-label="拖拉排序"
                    className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 -ml-1"
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                <span className="text-sm font-medium flex-1 leading-snug">
                    {pe.exercise.name.split(' ')[0]}
                </span>
                {isDirty && <span className="text-xs text-primary">●</span>}
                <button
                    onClick={() => { if (confirm('確定刪除此動作？')) deleteExercise(dayId, pe.id) }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pl-7">
                {/* Sets */}
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">組數</label>
                    <div className="flex items-center gap-2">
                        <button onClick={() => update(pe.id, 'defaultSets', Math.max(1, sets - 1))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"><Minus className="h-3 w-3" /></button>
                        <span className="w-6 text-center text-sm font-medium">{sets}</span>
                        <button onClick={() => update(pe.id, 'defaultSets', Math.min(10, sets + 1))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"><Plus className="h-3 w-3" /></button>
                    </div>
                </div>

                {/* Weight */}
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">重量 (kg)</label>
                    <div className="flex items-center gap-1">
                        <button onClick={() => update(pe.id, 'defaultWeightKg', Math.max(0, weight - 5))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">-5</button>
                        <button onClick={() => update(pe.id, 'defaultWeightKg', Math.max(0, weight - 2.5))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">-2.5</button>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={weight}
                            step={0.1}
                            min={0}
                            onChange={e => update(pe.id, 'defaultWeightKg', parseFloat(e.target.value) || 0)}
                            className="w-16 text-center text-sm font-medium bg-muted rounded-md py-1 outline-none focus:ring-1 focus:ring-primary tabular-nums"
                            title="可直接輸入精確重量（0.1 kg 精度）"
                        />
                        <button onClick={() => update(pe.id, 'defaultWeightKg', weight + 2.5)} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">+2.5</button>
                        <button onClick={() => update(pe.id, 'defaultWeightKg', weight + 5)} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">+5</button>
                    </div>
                </div>

                {/* Reps */}
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">次數範圍</label>
                    <div className="flex items-center gap-1 text-sm">
                        <button onClick={() => update(pe.id, 'defaultRepsMin', Math.max(1, repsMin - 1))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"><Minus className="h-3 w-3" /></button>
                        <span className="w-5 text-center font-medium">{repsMin}</span>
                        <span className="text-muted-foreground">–</span>
                        <span className="w-5 text-center font-medium">{repsMax}</span>
                        <button onClick={() => update(pe.id, 'defaultRepsMax', Math.min(30, repsMax + 1))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"><Plus className="h-3 w-3" /></button>
                    </div>
                </div>

                {/* Rest */}
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">休息 (秒)</label>
                    <div className="flex items-center gap-1">
                        <button onClick={() => update(pe.id, 'restSeconds', Math.max(30, rest - 15))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs hover:bg-muted/80">-15</button>
                        <span className="w-10 text-center text-sm font-medium">{rest}s</span>
                        <button onClick={() => update(pe.id, 'restSeconds', Math.min(300, rest + 15))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs hover:bg-muted/80">+15</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
