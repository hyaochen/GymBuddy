export type TrainingMethod =
    | 'PROGRESSIVE_OVERLOAD'
    | 'MAINTAIN'
    | 'DELOAD'
    | 'REVERSE_PYRAMID'

export type SetSuggestion = {
    setNumber: number
    suggestedWeightKg: number
    suggestedRepsMin: number
    suggestedRepsMax: number
}

export type OverloadSuggestion = {
    exerciseId: string
    exerciseName: string
    method: TrainingMethod
    reasoning: string
    suggestedSets: SetSuggestion[]
}

type SessionSetData = {
    setNumber: number
    repsPerformed: number
    weightKg: number | string
}

type PlanExerciseDefaults = {
    defaultSets: number
    defaultRepsMin: number
    defaultRepsMax: number
    defaultWeightKg: number | string | null
}

function roundWeight(kg: number): number {
    return Math.round(kg * 4) / 4
}

function buildUniformSets(
    sets: number,
    weightKg: number,
    repsMin: number,
    repsMax: number,
): SetSuggestion[] {
    return Array.from({ length: sets }, (_, i) => ({
        setNumber: i + 1,
        suggestedWeightKg: weightKg,
        suggestedRepsMin: repsMin,
        suggestedRepsMax: repsMax,
    }))
}

export function generateOverloadSuggestion(
    exerciseId: string,
    exerciseName: string,
    planDefaults: PlanExerciseDefaults,
    lastSessionSets: SessionSetData[],
): OverloadSuggestion {
    const targetSets = planDefaults.defaultSets
    const targetRepsMin = planDefaults.defaultRepsMin
    const targetRepsMax = planDefaults.defaultRepsMax
    const defaultWeight = planDefaults.defaultWeightKg ? Number(planDefaults.defaultWeightKg) : 20

    if (lastSessionSets.length === 0) {
        return {
            exerciseId,
            exerciseName,
            method: 'PROGRESSIVE_OVERLOAD',
            reasoning: '首次訓練，使用計畫預設重量開始',
            suggestedSets: buildUniformSets(targetSets, defaultWeight, targetRepsMin, targetRepsMax),
        }
    }

    // Working weight = heaviest set, so warm-up or pyramid sets don't drag the baseline down.
    const currentWeight = Math.max(...lastSessionSets.map(s => Number(s.weightKg) || 0))
    const completedSets = lastSessionSets.filter(s => s.repsPerformed >= targetRepsMin)
    const allSetsCompleted = completedSets.length >= targetSets
    const anySetFailed = completedSets.length < lastSessionSets.length
    const avgReps = lastSessionSets.reduce((sum, s) => sum + s.repsPerformed, 0) / lastSessionSets.length

    if (allSetsCompleted && avgReps >= targetRepsMax) {
        const increment = currentWeight >= 40 ? 2.5 : currentWeight >= 20 ? 2.5 : 1.25
        const newWeight = roundWeight(currentWeight + increment)
        return {
            exerciseId,
            exerciseName,
            method: 'PROGRESSIVE_OVERLOAD',
            reasoning: `上次完成所有 ${targetSets} 組，平均次數 ${avgReps.toFixed(1)} 達到目標！建議增加 ${increment}kg`,
            suggestedSets: buildUniformSets(targetSets, newWeight, targetRepsMin, targetRepsMax),
        }
    }

    if (allSetsCompleted && avgReps >= targetRepsMin) {
        return {
            exerciseId,
            exerciseName,
            method: 'MAINTAIN',
            reasoning: `完成所有 ${targetSets} 組，平均次數 ${avgReps.toFixed(1)}。繼續使用相同重量，目標達到 ${targetRepsMax} 下`,
            suggestedSets: buildUniformSets(targetSets, currentWeight, targetRepsMin, targetRepsMax),
        }
    }

    // Stopping early (fewer sets, every logged set on target) is not a failure: keep the weight.
    if (!anySetFailed) {
        return {
            exerciseId,
            exerciseName,
            method: 'MAINTAIN',
            reasoning: `上次完成 ${completedSets.length}/${targetSets} 組且每組都達標，維持相同重量，先把組數做滿`,
            suggestedSets: buildUniformSets(targetSets, currentWeight, targetRepsMin, targetRepsMax),
        }
    }

    const deloadWeight = roundWeight(currentWeight * 0.925)
    return {
        exerciseId,
        exerciseName,
        method: 'DELOAD',
        reasoning: `上次只完成 ${completedSets.length}/${targetSets} 組。建議重量減輕至 ${deloadWeight}kg，先鞏固動作品質`,
        suggestedSets: buildUniformSets(targetSets, deloadWeight, targetRepsMin, targetRepsMax),
    }
}

export type NextWeightSuggestion = {
    weightKg: number
    /** Change vs. the weight used last time (negative = deload). */
    deltaKg: number
    method: TrainingMethod
}

/**
 * Default weight for the next session of a (non time-based) exercise, derived
 * from the last completed session's sets. Returns null when there is no usable
 * history (or the last weight was 0, e.g. bodyweight), so the plan default stays.
 */
export function suggestNextWeight(
    planDefaults: PlanExerciseDefaults,
    lastSessionSets: SessionSetData[],
): NextWeightSuggestion | null {
    if (lastSessionSets.length === 0) return null
    const lastWeight = Math.max(...lastSessionSets.map(s => Number(s.weightKg) || 0))
    if (lastWeight <= 0) return null
    const result = generateOverloadSuggestion('', '', planDefaults, lastSessionSets)
    const weightKg = result.suggestedSets[0]?.suggestedWeightKg
    if (weightKg === undefined) return null
    return {
        weightKg,
        deltaKg: Math.round((weightKg - lastWeight) * 100) / 100,
        method: result.method,
    }
}
