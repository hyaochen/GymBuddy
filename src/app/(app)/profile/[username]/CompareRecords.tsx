"use client"

import { useEffect, useState } from "react"
import { Scale, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface PRPoint {
    date: string
    weightKg: number
    reps: number
    estimated1rm: number
}

interface CompareResult {
    exercise: string
    myName: string
    friendName: string
    myData: PRPoint[]
    friendData: PRPoint[]
}

interface ExerciseOption {
    id: string
    name: string
}

function best(points: PRPoint[]): PRPoint | null {
    if (points.length === 0) return null
    return points.reduce((a, b) => (b.estimated1rm > a.estimated1rm ? b : a))
}

function formatPR(p: PRPoint | null): string {
    if (!p) return "近 12 週無紀錄"
    return `${p.weightKg} kg x ${p.reps} (1RM 約 ${p.estimated1rm.toFixed(1)} kg)`
}

/** Compare personal records with a friend (needs both sides to share PRs and weights). */
export default function CompareRecords({ friendName }: { friendName: string }) {
    const [exercises, setExercises] = useState<ExerciseOption[]>([])
    const [exerciseId, setExerciseId] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<CompareResult | null>(null)
    // Explanation shown in place of the result, e.g. the other side has not opened PR sharing.
    const [notice, setNotice] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        fetch("/api/exercises?limit=500")
            .then(r => (r.ok ? r.json() : { exercises: [] }))
            .then(data => {
                if (cancelled) return
                const list = (data.exercises || [])
                    .filter((e: { isTimeBased?: boolean }) => !e.isTimeBased)
                    .map((e: ExerciseOption) => ({ id: e.id, name: e.name }))
                setExercises(list)
            })
            .catch(() => {
                if (!cancelled) toast({ variant: "destructive", title: "無法載入動作清單" })
            })
        return () => { cancelled = true }
    }, [])

    async function loadComparison(id: string) {
        setExerciseId(id)
        setResult(null)
        setNotice(null)
        if (!id) return
        setLoading(true)
        try {
            const res = await fetch(`/api/compare/${encodeURIComponent(friendName)}?exerciseId=${encodeURIComponent(id)}`)
            const data = await res.json().catch(() => ({}))
            if (res.ok) {
                setResult(data)
            } else if (res.status === 403) {
                setNotice(data.error || "目前無法比較，雙方需開放個人最佳紀錄")
            } else {
                toast({ variant: "destructive", title: "比較失敗", description: data.error || "請稍後再試" })
            }
        } catch {
            toast({ variant: "destructive", title: "比較失敗", description: "網路錯誤，請稍後再試" })
        } finally {
            setLoading(false)
        }
    }

    const myBest = result ? best(result.myData) : null
    const friendBest = result ? best(result.friendData) : null

    return (
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">比較紀錄</h2>
            </div>
            <p className="text-xs text-muted-foreground">選擇動作，與 {friendName} 比較近 12 週的個人最佳紀錄</p>

            <select
                value={exerciseId}
                onChange={e => loadComparison(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
                <option value="">選擇動作...</option>
                {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
            </select>

            {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> 比較中...
                </div>
            )}

            {notice && (
                <div className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">{notice}</div>
            )}

            {result && (
                <div className="space-y-2 text-sm">
                    <p className="font-medium">{result.exercise}</p>
                    <div className="grid grid-cols-1 gap-2">
                        <div className="rounded-lg bg-primary/10 px-3 py-2">
                            <p className="text-xs text-muted-foreground">{result.myName}（你）</p>
                            <p className="font-medium tabular-nums">{formatPR(myBest)}</p>
                        </div>
                        <div className="rounded-lg bg-secondary/50 px-3 py-2">
                            <p className="text-xs text-muted-foreground">{result.friendName}</p>
                            <p className="font-medium tabular-nums">{formatPR(friendBest)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
