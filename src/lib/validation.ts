import { NextResponse } from 'next/server'
import { z } from 'zod'

export const cuidSchema = z.string().min(8).max(64).regex(/^[a-z0-9]+$/i)

export async function parseJsonBody<T>(
    req: Request,
    schema: z.ZodType<T>,
): Promise<{ data: T } | { response: NextResponse }> {
    let json: unknown
    try {
        json = await req.json()
    } catch {
        return { response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    }

    const parsed = schema.safeParse(json)
    if (!parsed.success) {
        return {
            response: NextResponse.json(
                { error: 'Invalid request body', issues: parsed.error.issues.map(i => i.message) },
                { status: 400 },
            ),
        }
    }

    return { data: parsed.data }
}

export function parseRouteId(id: string): string | null {
    const parsed = cuidSchema.safeParse(id)
    return parsed.success ? parsed.data : null
}

/** 與 parseJsonBody 相同，但失敗訊息為給使用者看的中文（取第一個 issue）。 */
export async function parseJsonBodyZh<T>(
    req: Request,
    schema: z.ZodType<T>,
): Promise<{ data: T } | { response: NextResponse }> {
    let json: unknown
    try {
        json = await req.json()
    } catch {
        return { response: NextResponse.json({ error: '請求內容格式錯誤' }, { status: 400 }) }
    }
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
        return {
            response: NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? '輸入資料不正確' },
                { status: 400 },
            ),
        }
    }
    return { data: parsed.data }
}

// ─── 訓練計畫 ────────────────────────────────────────────────────────────────

const intIn = (label: string, min: number, max: number) =>
    z.number({ message: `${label}必須是數字` })
        .int(`${label}必須是整數`)
        .min(min, `${label}不可小於 ${min}`)
        .max(max, `${label}不可大於 ${max}`)

export const planNameSchema = z.string({ message: '請輸入計畫名稱' }).trim()
    .min(1, '請輸入計畫名稱').max(60, '計畫名稱最多 60 字')
export const planDescriptionSchema = z.string().max(500, '計畫描述最多 500 字').nullish()
export const dayNameSchema = z.string({ message: '請輸入訓練日名稱' }).trim()
    .min(1, '請輸入訓練日名稱').max(40, '訓練日名稱最多 40 字')

export const setsSchema = intIn('組數', 1, 20)
export const repsSchema = (label: string) => intIn(label, 1, 100)
export const weightSchema = z.number({ message: '重量必須是數字' })
    .min(0, '重量不可小於 0').max(1000, '重量不可大於 1000 kg')
export const restSchema = intIn('休息秒數', 0, 600)
export const durationSchema = (label: string) => intIn(label, 1, 3600)

const planExerciseFields = {
    defaultSets: setsSchema,
    defaultRepsMin: repsSchema('次數下限'),
    defaultRepsMax: repsSchema('次數上限'),
    defaultWeightKg: weightSchema.nullable(),
    defaultDurationMin: durationSchema('秒數下限').nullable(),
    defaultDurationMax: durationSchema('秒數上限').nullable(),
    restSeconds: restSchema,
    notes: z.string().max(500, '備註最多 500 字').nullable(),
}

/** 次數 / 秒數的 min <= max 檢查（兩者都有值才檢查）。 */
export function checkRanges(v: {
    defaultRepsMin?: number | null
    defaultRepsMax?: number | null
    defaultDurationMin?: number | null
    defaultDurationMax?: number | null
}): string | null {
    if (v.defaultRepsMin != null && v.defaultRepsMax != null && v.defaultRepsMin > v.defaultRepsMax) {
        return '次數下限不可大於上限'
    }
    if (v.defaultDurationMin != null && v.defaultDurationMax != null && v.defaultDurationMin > v.defaultDurationMax) {
        return '秒數下限不可大於上限'
    }
    return null
}

const withRanges = <T extends z.ZodTypeAny>(s: T) =>
    s.superRefine((v, ctx) => {
        const msg = checkRanges(v as Parameters<typeof checkRanges>[0])
        if (msg) ctx.addIssue({ code: 'custom', message: msg })
    })

const planExerciseCreateSchema = withRanges(z.object({
    exerciseId: z.string().min(1, '缺少動作'),
    orderIndex: z.number().int().min(0).optional(),
    defaultSets: planExerciseFields.defaultSets.optional(),
    defaultRepsMin: planExerciseFields.defaultRepsMin.optional(),
    defaultRepsMax: planExerciseFields.defaultRepsMax.optional(),
    defaultWeightKg: planExerciseFields.defaultWeightKg.optional(),
    defaultDurationMin: planExerciseFields.defaultDurationMin.optional(),
    defaultDurationMax: planExerciseFields.defaultDurationMax.optional(),
    restSeconds: planExerciseFields.restSeconds.optional(),
    notes: planExerciseFields.notes.optional(),
}))

export const createPlanSchema = z.object({
    name: planNameSchema,
    description: planDescriptionSchema,
    daysPerWeek: intIn('每週天數', 1, 14).optional(),
    days: z.array(z.object({
        dayName: dayNameSchema,
        dayOfWeek: z.number().int().min(0).max(7).optional(),
        orderIndex: z.number().int().min(0).optional(),
        exercises: z.array(planExerciseCreateSchema).max(50, '每個訓練日最多 50 個動作').optional(),
    })).max(14, '訓練日最多 14 天').optional(),
})

export const updatePlanSchema = z.object({
    name: planNameSchema.optional(),
    description: planDescriptionSchema,
    daysPerWeek: intIn('每週天數', 1, 14).optional(),
})

export const createPlanDaySchema = z.object({
    planId: z.string().min(1, '缺少計畫'),
    dayName: dayNameSchema.optional(),
})

export const updatePlanDaySchema = z.object({
    dayName: dayNameSchema.optional(),
    dayOfWeek: z.number().int().min(0).max(7).nullable().optional(),
})

export const createPlanExerciseSchema = withRanges(z.object({
    dayId: z.string().min(1, '缺少訓練日'),
    exerciseId: z.string().min(1, '缺少動作'),
    defaultSets: planExerciseFields.defaultSets.optional(),
    defaultRepsMin: planExerciseFields.defaultRepsMin.optional(),
    defaultRepsMax: planExerciseFields.defaultRepsMax.optional(),
    defaultWeightKg: planExerciseFields.defaultWeightKg.optional(),
    defaultDurationMin: planExerciseFields.defaultDurationMin.optional(),
    defaultDurationMax: planExerciseFields.defaultDurationMax.optional(),
    restSeconds: planExerciseFields.restSeconds.optional(),
}))

export const updatePlanExerciseSchema = withRanges(z.object({
    defaultSets: planExerciseFields.defaultSets.optional(),
    defaultRepsMin: planExerciseFields.defaultRepsMin.optional(),
    defaultRepsMax: planExerciseFields.defaultRepsMax.optional(),
    defaultWeightKg: planExerciseFields.defaultWeightKg.optional(),
    defaultDurationMin: planExerciseFields.defaultDurationMin.optional(),
    defaultDurationMax: planExerciseFields.defaultDurationMax.optional(),
    restSeconds: planExerciseFields.restSeconds.optional(),
}))
