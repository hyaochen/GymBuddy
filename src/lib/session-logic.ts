/**
 * Pure helpers for the in-progress workout session flow. Kept free of
 * prisma / next imports so they can be unit-tested directly.
 */
import { epley1rm, sumSetsVolume } from '@/lib/utils'
import { generateOverloadSuggestion, type OverloadSuggestion } from '@/lib/progressive-overload'

type ExerciseLike = {
    id: string
    exerciseId: string
    orderIndex: number
    substituteForId: string | null
    sets: unknown[]
}

/**
 * Stable ordering for session exercises. A substitute is created with the same
 * orderIndex as the exercise it replaces, so `id` (cuid, time-ordered) is the
 * tie-breaker: the original always stays in front of its substitute.
 */
export function compareSessionExercises(a: { orderIndex: number; id: string }, b: { orderIndex: number; id: string }): number {
    if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Drops original exercises that were substituted away and never trained
 * (no sets). If the original already has sets it stays, in front of its
 * substitute, so logged work is never hidden.
 */
export function hideReplacedExercises<T extends ExerciseLike>(exercises: T[]): T[] {
    const replaced = new Set<string>()
    for (const ex of exercises) {
        if (ex.substituteForId) replaced.add(ex.substituteForId)
    }
    return exercises
        .filter(ex => !(replaced.has(ex.id) && ex.sets.length === 0))
        .sort(compareSessionExercises)
}

/**
 * Substitutes inherit the plan defaults (sets / reps / rest) of the exercise
 * they replaced, following the substituteFor chain. Never overwrites an
 * exerciseId that already has its own default.
 */
export function resolveSubstituteDefaults<D>(
    exercises: Array<Pick<ExerciseLike, 'id' | 'exerciseId' | 'substituteForId'>>,
    defaults: Record<string, D>,
): Record<string, D> {
    const byId = new Map(exercises.map(ex => [ex.id, ex]))
    const result = { ...defaults }
    for (const ex of exercises) {
        if (!ex.substituteForId || result[ex.exerciseId]) continue
        let cursor = byId.get(ex.substituteForId)
        let guard = 0
        while (cursor && guard++ < 20) {
            const found = result[cursor.exerciseId]
            if (found) {
                result[ex.exerciseId] = found
                break
            }
            cursor = cursor.substituteForId ? byId.get(cursor.substituteForId) : undefined
        }
    }
    return result
}

/** Time before the first logged set that is counted as part of the workout. */
export const LEAD_IN_MS = 2 * 60 * 1000

/**
 * Training duration in minutes: from just before the first logged set to the
 * last logged set. Not "created session -> pressed finish", which balloons when
 * a session is resumed the next day. No sets -> 0.
 */
export function computeSessionDurationMin(startedAt: Date, setTimes: Date[]): number {
    if (setTimes.length === 0) return 0
    let first = Infinity
    let last = -Infinity
    for (const t of setTimes) {
        const ms = t.getTime()
        if (ms < first) first = ms
        if (ms > last) last = ms
    }
    const start = Math.max(startedAt.getTime(), first - LEAD_IN_MS)
    return Math.max(0, Math.round((last - start) / 60000))
}

/**
 * True when a freshly logged set beats every previous estimated 1RM.
 * `historicalBest1rm` is null when the user has never completed this exercise
 * (the first ever set is not announced as a PR).
 */
export function isNewPersonalRecord(input: {
    isTimeBased: boolean
    weightKg: number
    reps: number
    historicalBest1rm: number | null
    sessionBest1rm: number
}): boolean {
    if (input.isTimeBased || input.weightKg <= 0 || input.reps <= 0) return false
    if (input.historicalBest1rm === null) return false
    const e1rm = epley1rm(input.weightKg, input.reps)
    return e1rm > Math.max(input.historicalBest1rm, input.sessionBest1rm)
}

type SummaryPlanDefaults = {
    defaultSets: number
    defaultRepsMin: number
    defaultRepsMax: number
    defaultWeightKg: number | null
}

type SummarySession = {
    id: string
    exerciseId: string
    substituteForId: string | null
    exercise: { name: string; isTimeBased: boolean }
    sets: Array<{
        setNumber: number
        repsPerformed: number
        weightKg: number | string | { toNumber: () => number }
        durationSeconds: number | null
    }>
}

export type SessionSummary = {
    durationMin: number
    totalSets: number
    totalVolume: number
    suggestions: OverloadSuggestion[]
}

/**
 * Totals + next-time suggestions for a finished session. Deterministic from the
 * stored sets, so the summary can be rebuilt from the DB at any time.
 */
export function summarizeSession(
    exercises: SummarySession[],
    planDefaults: Record<string, SummaryPlanDefaults>,
    durationMin: number,
): SessionSummary {
    const defaults = resolveSubstituteDefaults(
        exercises.map(ex => ({ id: ex.id, exerciseId: ex.exerciseId, substituteForId: ex.substituteForId })),
        planDefaults,
    )
    const suggestions: OverloadSuggestion[] = []
    for (const se of exercises) {
        if (se.sets.length === 0 || se.exercise.isTimeBased) continue
        const planEx = defaults[se.exerciseId] ?? {
            defaultSets: 3,
            defaultRepsMin: 8,
            defaultRepsMax: 12,
            defaultWeightKg: null,
        }
        suggestions.push(generateOverloadSuggestion(
            se.exerciseId,
            se.exercise.name,
            planEx,
            se.sets.map(s => ({
                setNumber: s.setNumber,
                repsPerformed: s.repsPerformed,
                weightKg: Number(s.weightKg),
            })),
        ))
    }
    const totalSets = exercises.reduce((sum, se) => sum + se.sets.length, 0)
    const totalVolume = exercises.reduce((sum, se) => sum + sumSetsVolume(se.sets), 0)
    return { durationMin, totalSets, totalVolume: Math.round(totalVolume), suggestions }
}

/** Short label shown next to the auto-applied weight, e.g. "建議 +2.5 kg". */
export function formatWeightSuggestion(deltaKg: number): string {
    if (deltaKg > 0) return `建議 +${deltaKg} kg`
    if (deltaKg < 0) return `建議 ${deltaKg} kg`
    return '建議維持'
}

/** Maps a failed set-save response to a short toast message. */
export function describeSetSaveFailure(status: number): { title: string; description: string } {
    if (status === 401) return { title: '登入已過期', description: '請重新登入後再繼續，這一組的輸入已保留' }
    if (status === 409) return { title: '這次訓練已經結束', description: '可能已在其他分頁或裝置完成，這一組沒有被儲存' }
    return { title: '這一組沒有儲存', description: '輸入已保留，請再按一次完成這一組' }
}
