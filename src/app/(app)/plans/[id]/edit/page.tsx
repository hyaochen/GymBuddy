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
import { toast } from '@/components/ui/use-toast'

type PlanExercise = {
    id: string
    orderIndex: number
    defaultSets: number
    defaultRepsMin: number
    defaultRepsMax: number
    restSeconds: number
    defaultWeightKg: number | null
    defaultDurationMin: number | null
    defaultDurationMax: number | null
    exercise: { id: string; name: string; isTimeBased?: boolean }
}

// 限時動作沒設秒數時的預設範圍（與計畫詳情頁顯示一致）
const DEFAULT_DURATION_MIN = 20
const DEFAULT_DURATION_MAX = 30

const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}

// API 的 Decimal 欄位（defaultWeightKg）會以字串送來，載入時一律轉成 number
const normalizePlanExercise = (e: PlanExercise): PlanExercise => ({
    ...e,
    defaultSets: toNum(e.defaultSets) ?? 3,
    defaultRepsMin: toNum(e.defaultRepsMin) ?? 8,
    defaultRepsMax: toNum(e.defaultRepsMax) ?? 12,
    restSeconds: toNum(e.restSeconds) ?? 90,
    defaultWeightKg: toNum(e.defaultWeightKg),
    defaultDurationMin: toNum(e.defaultDurationMin),
    defaultDurationMax: toNum(e.defaultDurationMax),
})

const normalizePlan = (p: Plan): Plan => ({
    ...p,
    days: p.days.map(d => ({ ...d, exercises: d.exercises.map(normalizePlanExercise) })),
})

const readError = async (res: Response, fallback: string) => {
    try {
        const d = await res.json()
        if (typeof d?.error === 'string' && d.error) return d.error
    } catch { }
    return fallback
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
    const [orderDirty, setOrderDirty] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [planName, setPlanName] = useState('')
    const [deleteMsg, setDeleteMsg] = useState('')
    const [loadError, setLoadError] = useState('')
    const [busy, setBusy] = useState<string | null>(null)
    const [dayNames, setDayNames] = useState<Record<string, string>>({})
    const [addingTo, setAddingTo] = useState<string | null>(null)
    const [searchQ, setSearchQ] = useState('')
    const [searchResults, setSearchResults] = useState<{ id: string; name: string; isTimeBased?: boolean }[]>([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch(`/api/plans/${id}`)
            .then(async r => {
                if (!r.ok) throw new Error(await readError(r, r.status === 404 ? '找不到這個計畫' : '載入計畫失敗'))
                return r.json()
            })
            .then(d => {
                if (cancelled) return
                const p = normalizePlan(d.plan as Plan)
                setPlan(p)
                setPlanName(p.name)
            })
            .catch(e => {
                if (!cancelled) setLoadError(e instanceof Error ? e.message : '載入計畫失敗')
            })
        return () => { cancelled = true }
    }, [id])

    const hasUnsaved = !!plan && (
        planName !== plan.name ||
        Object.keys(dirty).length > 0 ||
        Object.keys(dayNames).length > 0 ||
        orderDirty.size > 0
    )

    useEffect(() => {
        if (!hasUnsaved) return
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [hasUnsaved])

    const update = useCallback((peId: string, field: keyof PlanExercise, value: number) => {
        setDirty(prev => ({ ...prev, [peId]: { ...prev[peId], [field]: value } }))
    }, [])

    const getVal = (pe: PlanExercise, field: keyof PlanExercise) => {
        const raw = dirty[pe.id]?.[field] ?? pe[field]
        const n = toNum(raw)
        if (n !== null) return n
        if (field === 'defaultDurationMin') return DEFAULT_DURATION_MIN
        if (field === 'defaultDurationMax') return DEFAULT_DURATION_MAX
        return 0
    }

    const showError = (msg: string) => {
        toast({ title: msg, variant: 'destructive' })
    }

    const saveAll = async () => {
        if (!plan) return
        const trimmedName = planName.trim()
        if (!trimmedName) {
            showError('計畫名稱不可為空')
            return
        }
        setSaving(true)
        const ensureOk = async (res: Response) => {
            if (!res.ok) throw new Error(await readError(res, `${res.status} ${res.statusText}`))
            return res
        }
        try {
            if (trimmedName !== plan.name) {
                await ensureOk(await fetch(`/api/plans/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: trimmedName, description: plan.description, daysPerWeek: Math.max(1, plan.days.length) }),
                }))
            }
            await Promise.all(
                Object.entries(dayNames).map(([dayId, newName]) =>
                    fetch(`/api/plan-days/${dayId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dayName: newName }),
                    }).then(ensureOk)
                )
            )
            await Promise.all(
                Object.entries(dirty).map(([peId, changes]) =>
                    fetch(`/api/plan-exercises/${peId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(changes),
                    }).then(ensureOk)
                )
            )
            if (orderDirty.size > 0) {
                await Promise.all(
                    Array.from(orderDirty).map(dayId => {
                        const day = plan.days.find(d => d.id === dayId)
                        if (!day) return Promise.resolve(null)
                        return fetch(`/api/plan-days/${dayId}/reorder`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ exerciseIds: day.exercises.map(e => e.id) }),
                        }).then(ensureOk)
                    })
                )
            }
            // 把已存的修改合併回 plan（含名稱），再清掉 dirty，畫面才不會跳回舊值
            setPlan(prev => prev ? {
                ...prev,
                name: trimmedName,
                days: prev.days.map(d => ({
                    ...d,
                    dayName: dayNames[d.id] ?? d.dayName,
                    exercises: d.exercises.map(e => dirty[e.id] ? { ...e, ...dirty[e.id] } : e),
                })),
            } : prev)
            setPlanName(trimmedName)
            setDayNames({})
            setDirty({})
            setOrderDirty(new Set())
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            showError(`儲存失敗：${msg}`)
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
        if (busy) return
        const dayName = plan.days.find(d => d.id === dayId)?.dayName
        setBusy(`day:${dayId}`)
        try {
            const res = await fetch(`/api/plan-days/${dayId}`, { method: 'DELETE' })
            if (!res.ok) {
                showError(await readError(res, '刪除訓練日失敗，請重試'))
                return
            }
            setPlan(prev => prev ? { ...prev, days: prev.days.filter(d => d.id !== dayId) } : prev)
            showDeleted(`已刪除「${dayName}」`)
        } catch {
            showError('刪除訓練日失敗，請檢查網路後重試')
        } finally {
            setBusy(null)
        }
    }

    const deleteExercise = async (dayId: string, peId: string) => {
        if (!plan) return
        if (busy) return
        setBusy(`ex:${peId}`)
        try {
            const res = await fetch(`/api/plan-exercises/${peId}`, { method: 'DELETE' })
            if (!res.ok) {
                showError(await readError(res, '刪除動作失敗，請重試'))
                return
            }
            setPlan(prev => prev ? {
                ...prev,
                days: prev.days.map(d =>
                    d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== peId) } : d
                ),
            } : prev)
            setDirty(prev => {
                const next = { ...prev }
                delete next[peId]
                return next
            })
            showDeleted('動作已刪除')
        } catch {
            showError('刪除動作失敗，請檢查網路後重試')
        } finally {
            setBusy(null)
        }
    }

    const searchExercises = async (q: string) => {
        setSearchQ(q)
        if (!q.trim()) { setSearchResults([]); return }
        setSearching(true)
        try {
            const res = await fetch(`/api/exercises?q=${encodeURIComponent(q)}&limit=10`)
            if (!res.ok) throw new Error('search failed')
            const data = await res.json()
            setSearchResults(data.exercises || [])
        } catch {
            showError('搜尋動作失敗，請重試')
        } finally { setSearching(false) }
    }

    const reorderExercises = useCallback((dayId: string, fromId: string, toId: string) => {
        if (fromId === toId) return
        let changed = false
        setPlan(prev => {
            if (!prev) return prev
            return {
                ...prev,
                days: prev.days.map(d => {
                    if (d.id !== dayId) return d
                    const oldIdx = d.exercises.findIndex(e => e.id === fromId)
                    const newIdx = d.exercises.findIndex(e => e.id === toId)
                    if (oldIdx < 0 || newIdx < 0) return d
                    changed = true
                    const reordered = arrayMove(d.exercises, oldIdx, newIdx).map((e, i) => ({ ...e, orderIndex: i }))
                    return { ...d, exercises: reordered }
                }),
            }
        })
        if (changed) {
            setOrderDirty(prev => {
                if (prev.has(dayId)) return prev
                const next = new Set(prev)
                next.add(dayId)
                return next
            })
        }
    }, [])

    const addExercise = async (dayId: string, exercise: { id: string; name: string; isTimeBased?: boolean }) => {
        if (!plan || busy) return
        setBusy(`add:${dayId}`)
        try {
            const res = await fetch('/api/plan-exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dayId,
                    exerciseId: exercise.id,
                    ...(exercise.isTimeBased && {
                        defaultDurationMin: DEFAULT_DURATION_MIN,
                        defaultDurationMax: DEFAULT_DURATION_MAX,
                    }),
                }),
            })
            if (!res.ok) {
                showError(await readError(res, '新增動作失敗，請重試'))
                return
            }
            const data = await res.json()
            const added = normalizePlanExercise({
                id: data.exercise.id,
                orderIndex: data.exercise.orderIndex,
                defaultSets: data.exercise.defaultSets,
                defaultRepsMin: data.exercise.defaultRepsMin,
                defaultRepsMax: data.exercise.defaultRepsMax,
                restSeconds: data.exercise.restSeconds,
                defaultWeightKg: data.exercise.defaultWeightKg,
                defaultDurationMin: data.exercise.defaultDurationMin,
                defaultDurationMax: data.exercise.defaultDurationMax,
                exercise: {
                    id: exercise.id,
                    name: exercise.name,
                    isTimeBased: data.exercise.exercise?.isTimeBased ?? exercise.isTimeBased,
                },
            })
            setPlan(prev => prev ? {
                ...prev,
                days: prev.days.map(d => d.id !== dayId ? d : { ...d, exercises: [...d.exercises, added] }),
            } : prev)
            setAddingTo(null)
            setSearchQ('')
            setSearchResults([])
            showDeleted('動作已新增')
        } catch {
            showError('新增動作失敗，請檢查網路後重試')
        } finally {
            setBusy(null)
        }
    }

    const addDay = async () => {
        if (busy) return
        setBusy('addDay')
        try {
            const res = await fetch('/api/plan-days', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: id }),
            })
            if (!res.ok) {
                showError(await readError(res, '新增訓練日失敗，請重試'))
                return
            }
            const data = await res.json()
            setPlan(prev => prev ? {
                ...prev,
                days: [...prev.days, { ...data.day, exercises: [] }],
            } : prev)
            showDeleted('訓練日已新增')
        } catch {
            showError('新增訓練日失敗，請檢查網路後重試')
        } finally {
            setBusy(null)
        }
    }

    if (loadError) {
        return (
            <div className="text-center py-20 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Link href="/plans" className="text-sm text-primary hover:underline">返回計畫列表</Link>
            </div>
        )
    }
    if (!plan) return <div className="text-center py-20 text-muted-foreground">載入中...</div>

    const hasDirty = hasUnsaved

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
                        {orderDirty.has(day.id) && (
                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">順序未存</span>
                        )}
                        <button
                            onClick={() => { if (confirm(`確定刪除「${day.dayName}」？此操作無法復原。`)) deleteDay(day.id) }}
                            disabled={busy !== null}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-50"
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
                        busy={busy !== null}
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
                                            disabled={busy !== null}
                                            className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors truncate disabled:opacity-50"
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
                onClick={addDay}
                disabled={busy !== null}
                className="w-full py-3 rounded-xl border border-dashed border-border text-sm text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
                <Plus className="h-4 w-4" /> {busy === 'addDay' ? '新增中...' : '新增訓練日'}
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
    busy: boolean
    reorderExercises: (dayId: string, fromId: string, toId: string) => void
}

function DayExerciseList({ day, dirty, getVal, update, deleteExercise, busy, reorderExercises }: DayExerciseListProps) {
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
                            busy={busy}
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
    busy: boolean
}

function SortableExerciseRow({ pe, idx, dayId, isDirty, getVal, update, deleteExercise, busy }: SortableExerciseRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pe.id })
    const sets = getVal(pe, 'defaultSets')
    const repsMin = getVal(pe, 'defaultRepsMin')
    const repsMax = getVal(pe, 'defaultRepsMax')
    const rest = getVal(pe, 'restSeconds')
    const weight = getVal(pe, 'defaultWeightKg')
    const isTimed = !!pe.exercise.isTimeBased
    const durMin = getVal(pe, 'defaultDurationMin')
    const durMax = getVal(pe, 'defaultDurationMax')

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
                    disabled={busy}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-50"
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
                        <button onClick={() => update(pe.id, 'defaultSets', Math.min(20, sets + 1))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"><Plus className="h-3 w-3" /></button>
                    </div>
                </div>

                {/* 限時動作顯示秒數範圍，取代次數與重量 */}
                {isTimed ? (
                <div className="space-y-1 col-span-2">
                    <label className="text-xs text-muted-foreground">秒數範圍</label>
                    <div className="flex items-center gap-1 text-sm">
                        <button onClick={() => update(pe.id, 'defaultDurationMin', Math.max(1, durMin - 5))} aria-label="下限減 5 秒" className="w-8 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">-5</button>
                        <span className="w-9 text-center font-medium">{durMin}s</span>
                        <button onClick={() => update(pe.id, 'defaultDurationMin', Math.min(durMax, durMin + 5))} aria-label="下限加 5 秒" className="w-8 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">+5</button>
                        <span className="text-muted-foreground">–</span>
                        <button onClick={() => update(pe.id, 'defaultDurationMax', Math.max(durMin, durMax - 5))} aria-label="上限減 5 秒" className="w-8 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">-5</button>
                        <span className="w-9 text-center font-medium">{durMax}s</span>
                        <button onClick={() => update(pe.id, 'defaultDurationMax', Math.min(3600, durMax + 5))} aria-label="上限加 5 秒" className="w-8 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">+5</button>
                    </div>
                </div>
                ) : (
                    <>
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
                            onChange={e => update(pe.id, 'defaultWeightKg', Math.min(1000, Math.max(0, parseFloat(e.target.value) || 0)))}
                            className="w-16 text-center text-sm font-medium bg-muted rounded-md py-1 outline-none focus:ring-1 focus:ring-primary tabular-nums"
                            title="可直接輸入精確重量（0.1 kg 精度）"
                        />
                        <button onClick={() => update(pe.id, 'defaultWeightKg', Math.min(1000, weight + 2.5))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">+2.5</button>
                        <button onClick={() => update(pe.id, 'defaultWeightKg', Math.min(1000, weight + 5))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] hover:bg-muted/80">+5</button>
                    </div>
                </div>

                {/* Reps（次數範圍：上下限都可加減，維持 min <= max） */}
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">次數範圍</label>
                    <div className="flex items-center gap-1 text-sm">
                        <button onClick={() => update(pe.id, 'defaultRepsMin', Math.max(1, repsMin - 1))} aria-label="下限減 1" className="w-6 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"><Minus className="h-3 w-3" /></button>
                        <span className="w-5 text-center font-medium">{repsMin}</span>
                        <button onClick={() => update(pe.id, 'defaultRepsMin', Math.min(repsMax, repsMin + 1))} aria-label="下限加 1" className="w-6 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"><Plus className="h-3 w-3" /></button>
                        <span className="text-muted-foreground">–</span>
                        <button onClick={() => update(pe.id, 'defaultRepsMax', Math.max(repsMin, repsMax - 1))} aria-label="上限減 1" className="w-6 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"><Minus className="h-3 w-3" /></button>
                        <span className="w-5 text-center font-medium">{repsMax}</span>
                        <button onClick={() => update(pe.id, 'defaultRepsMax', Math.min(100, repsMax + 1))} aria-label="上限加 1" className="w-6 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"><Plus className="h-3 w-3" /></button>
                    </div>
                </div>
                    </>
                )}

                {/* Rest */}
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">休息 (秒)</label>
                    <div className="flex items-center gap-1">
                        <button onClick={() => update(pe.id, 'restSeconds', Math.max(0, rest - 15))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs hover:bg-muted/80">-15</button>
                        <span className="w-10 text-center text-sm font-medium">{rest}s</span>
                        <button onClick={() => update(pe.id, 'restSeconds', Math.min(600, rest + 15))} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs hover:bg-muted/80">+15</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
