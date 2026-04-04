/**
 * Training Context Builder — queries PostgreSQL via Prisma and builds
 * context strings for the AI to consume.
 */

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date): string {
    return d.toISOString().slice(0, 10)
}

function decNum(v: Prisma.Decimal | number): number {
    return typeof v === 'number' ? v : Number(v)
}

/** Fuzzy-match an exercise name (contains, case-insensitive) */
async function findExerciseByName(keyword: string) {
    // Try exact match first
    let ex = await prisma.exercise.findFirst({
        where: { name: { equals: keyword, mode: 'insensitive' } },
    })
    if (ex) return ex

    // Fallback to contains
    ex = await prisma.exercise.findFirst({
        where: { name: { contains: keyword, mode: 'insensitive' } },
    })
    return ex
}

/** Extract exercise-related keywords from a question */
function extractExerciseKeyword(question: string): string | null {
    // Common exercise name patterns — strip question words
    const cleaned = question
        .replace(/的?(PR|pr|1rm|1RM|e1rm|紀錄|最高|最重|最大|進步|趨勢|變化|多少|幾次|幾組)/g, '')
        .replace(/[我你他的是嗎？?了呢吧]\s*/g, '')
        .trim()
    return cleaned || null
}

// ── Direct Answer ────────────────────────────────────────────────────────────

export async function getDirectAnswer(userId: string, question: string): Promise<string> {
    const q = question.trim()

    // ── PR lookup ────────────────────────────────────────────────────────────
    if (/PR|pr|1rm|1RM|e1rm|最高|最重|最大|紀錄/.test(q)) {
        const keyword = extractExerciseKeyword(q)

        // If no specific exercise, return top PRs
        if (!keyword) {
            const prs = await prisma.personalRecord.findMany({
                where: { userId },
                orderBy: { estimated1rm: 'desc' },
                take: 10,
                include: { exercise: { select: { name: true } } },
            })
            if (prs.length === 0) return '目前還沒有個人紀錄。開始訓練來建立你的第一筆 PR！'

            const lines = prs.map(
                (pr) =>
                    `- **${pr.exercise.name}**: ${decNum(pr.weightKg)}kg x ${pr.reps} 次（E1RM ${decNum(pr.estimated1rm)}kg，${fmt(pr.achievedAt)}）`
            )
            return `你的 Top ${prs.length} 個人紀錄：\n${lines.join('\n')}`
        }

        // Specific exercise PR
        const exercise = await findExerciseByName(keyword)
        if (!exercise) return `找不到「${keyword}」這個動作。試試用動作的完整名稱？`

        const pr = await prisma.personalRecord.findFirst({
            where: { userId, exerciseId: exercise.id },
            orderBy: { estimated1rm: 'desc' },
        })
        if (!pr) return `你還沒有「${exercise.name}」的個人紀錄。`

        return `你的 **${exercise.name}** PR 是 **${decNum(pr.weightKg)}kg x ${pr.reps} 次**（E1RM ${decNum(pr.estimated1rm)}kg，${fmt(pr.achievedAt)}）`
    }

    // ── Training frequency ──────────────────────────────────────────────────
    if (/頻率|幾次|多久/.test(q)) {
        const fourWeeksAgo = new Date()
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

        const sessions = await prisma.workoutSession.findMany({
            where: {
                userId,
                startedAt: { gte: fourWeeksAgo },
                completedAt: { not: null },
            },
            orderBy: { startedAt: 'desc' },
            select: { startedAt: true, durationMin: true },
        })

        if (sessions.length === 0) return '過去 4 週沒有完成的訓練紀錄。'

        const perWeek = (sessions.length / 4).toFixed(1)
        const avgDur = sessions.reduce((s, se) => s + (se.durationMin ?? 0), 0) / sessions.length
        const lastDate = fmt(sessions[0].startedAt)

        return `過去 4 週你完成了 **${sessions.length} 次訓練**（平均每週 ${perWeek} 次）。平均每次 ${Math.round(avgDur)} 分鐘。最近一次：${lastDate}。`
    }

    // ── Last session / recent ───────────────────────────────────────────────
    if (/上次|最近一次|最後/.test(q)) {
        const session = await prisma.workoutSession.findFirst({
            where: { userId, completedAt: { not: null } },
            orderBy: { startedAt: 'desc' },
            include: {
                exercises: {
                    include: {
                        exercise: { select: { name: true } },
                        sets: { orderBy: { setNumber: 'asc' } },
                    },
                    orderBy: { orderIndex: 'asc' },
                },
            },
        })
        if (!session) return '還沒有完成的訓練紀錄。'

        const lines = session.exercises.map((se) => {
            const setStr = se.sets
                .map((s) => `${decNum(s.weightKg)}kg x${s.repsPerformed}`)
                .join(', ')
            return `- **${se.exercise.name}**: ${setStr}`
        })

        return `最近一次訓練（${fmt(session.startedAt)}，${session.durationMin ?? '?'} 分鐘）：\n${lines.join('\n')}`
    }

    // ── Fallback: general stats ─────────────────────────────────────────────
    const totalSessions = await prisma.workoutSession.count({
        where: { userId, completedAt: { not: null } },
    })
    const totalPRs = await prisma.personalRecord.count({ where: { userId } })
    const summaries = await prisma.userExerciseSummary.findMany({
        where: { userId },
        orderBy: { lastUsedAt: 'desc' },
        take: 5,
        include: { exercise: { select: { name: true } } },
    })

    const exList = summaries.map(
        (s) => `${s.exercise.name}（最重 ${decNum(s.maxWeight)}kg, E1RM ${decNum(s.estimated1rm)}kg）`
    ).join('、')

    return `你總共完成了 **${totalSessions} 次訓練**，累積 **${totalPRs} 個 PR**。最近練的動作：${exList || '無'}。`
}

// ── Analysis Context ─────────────────────────────────────────────────────────

export async function getAnalysisContext(userId: string, question: string): Promise<string> {
    const eightWeeksAgo = new Date()
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

    const parts: string[] = []

    // 1. Weekly session counts
    const sessions = await prisma.workoutSession.findMany({
        where: { userId, startedAt: { gte: eightWeeksAgo }, completedAt: { not: null } },
        orderBy: { startedAt: 'asc' },
        select: { startedAt: true, durationMin: true },
    })

    const weekMap = new Map<string, number>()
    for (const s of sessions) {
        const week = getISOWeek(s.startedAt)
        weekMap.set(week, (weekMap.get(week) ?? 0) + 1)
    }
    parts.push(`【近 8 週訓練頻率】\n${[...weekMap.entries()].map(([w, c]) => `${w}: ${c} 次`).join('\n')}`)

    // 2. Exercise-specific trend if keyword found
    const keyword = extractExerciseKeyword(question)
    if (keyword) {
        const exercise = await findExerciseByName(keyword)
        if (exercise) {
            const setData = await prisma.sessionSet.findMany({
                where: {
                    sessionExercise: {
                        exerciseId: exercise.id,
                        session: { userId, startedAt: { gte: eightWeeksAgo } },
                    },
                },
                orderBy: { completedAt: 'asc' },
                select: { weightKg: true, repsPerformed: true, completedAt: true },
            })
            if (setData.length > 0) {
                const lines = setData.map(
                    (s) => `${fmt(s.completedAt)}: ${decNum(s.weightKg)}kg x${s.repsPerformed}`
                )
                // Limit to ~20 entries to stay within token budget
                const trimmed = lines.length > 20
                    ? [...lines.slice(0, 10), `...（略 ${lines.length - 20} 筆）`, ...lines.slice(-10)]
                    : lines
                parts.push(`【${exercise.name} 近 8 週數據】\n${trimmed.join('\n')}`)
            }
        }
    }

    // 3. PR history
    const prs = await prisma.personalRecord.findMany({
        where: { userId, achievedAt: { gte: eightWeeksAgo } },
        orderBy: { achievedAt: 'desc' },
        take: 10,
        include: { exercise: { select: { name: true } } },
    })
    if (prs.length > 0) {
        parts.push(
            `【近 8 週新 PR】\n${prs.map((p) => `${fmt(p.achievedAt)} ${p.exercise.name}: ${decNum(p.weightKg)}kg x${p.reps}（E1RM ${decNum(p.estimated1rm)}kg）`).join('\n')}`
        )
    }

    return parts.join('\n\n')
}

// ── Recommendation Context ───────────────────────────────────────────────────

export async function getRecommendationContext(userId: string): Promise<string> {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const eightWeeksAgo = new Date()
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

    const parts: string[] = []

    // 1. Recent 2 weeks detail
    const recentSessions = await prisma.workoutSession.findMany({
        where: { userId, startedAt: { gte: twoWeeksAgo }, completedAt: { not: null } },
        orderBy: { startedAt: 'desc' },
        include: {
            exercises: {
                include: {
                    exercise: { select: { name: true } },
                    sets: { orderBy: { setNumber: 'asc' } },
                },
                orderBy: { orderIndex: 'asc' },
            },
        },
    })

    if (recentSessions.length > 0) {
        const sessionLines = recentSessions.map((s) => {
            const exLines = s.exercises.map((se) => {
                const bestSet = se.sets.reduce(
                    (best, cur) =>
                        decNum(cur.weightKg) * cur.repsPerformed > decNum(best.weightKg) * best.repsPerformed
                            ? cur
                            : best,
                    se.sets[0]
                )
                return bestSet
                    ? `  - ${se.exercise.name}: 最佳組 ${decNum(bestSet.weightKg)}kg x${bestSet.repsPerformed}（共 ${se.sets.length} 組）`
                    : `  - ${se.exercise.name}: ${se.sets.length} 組`
            })
            return `${fmt(s.startedAt)}（${s.durationMin ?? '?'}min）：\n${exLines.join('\n')}`
        })
        parts.push(`【近 2 週訓練詳情】\n${sessionLines.join('\n')}`)
    } else {
        parts.push('【近 2 週訓練詳情】無訓練紀錄')
    }

    // 2. 8-week summary
    const summaries = await prisma.userExerciseSummary.findMany({
        where: { userId },
        orderBy: { totalSessions: 'desc' },
        include: { exercise: { select: { name: true } } },
    })
    if (summaries.length > 0) {
        const lines = summaries.map(
            (s) =>
                `- ${s.exercise.name}: 最重 ${decNum(s.maxWeight)}kg, E1RM ${decNum(s.estimated1rm)}kg, 練過 ${s.totalSessions} 次, 最近 ${fmt(s.lastUsedAt)}`
        )
        parts.push(`【動作總覽】\n${lines.join('\n')}`)
    }

    // 3. Muscle balance — weekly volume by muscle group
    const muscleVolume = await prisma.$queryRaw<
        { muscleGroup: string; bodyRegion: string; totalVolume: number }[]
    >`
        SELECT
            mg.name       AS "muscleGroup",
            mg."bodyRegion" AS "bodyRegion",
            COALESCE(SUM(CASE WHEN ss."durationSeconds" IS NULL THEN ss."weightKg" * ss."repsPerformed" ELSE 0 END), 0)::float AS "totalVolume"
        FROM session_sets ss
        JOIN session_exercises se ON se.id = ss."sessionExerciseId"
        JOIN workout_sessions ws ON ws.id = se."sessionId"
        JOIN exercise_muscles em ON em."exerciseId" = se."exerciseId"
        JOIN muscle_groups mg    ON mg.id = em."muscleGroupId"
        WHERE ws."userId" = ${userId}
          AND ws."startedAt" >= ${eightWeeksAgo}
          AND ws."completedAt" IS NOT NULL
          AND em."isPrimary" = true
        GROUP BY mg.name, mg."bodyRegion"
        ORDER BY "totalVolume" DESC
    `

    if (muscleVolume.length > 0) {
        const lines = muscleVolume.map(
            (mv) => `- ${mv.muscleGroup}（${mv.bodyRegion}）: ${Math.round(mv.totalVolume)} kg 總量`
        )
        parts.push(`【肌群訓練量（近 8 週，主要肌群）】\n${lines.join('\n')}`)
    }

    return parts.join('\n\n')
}

// ── Utility ──────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): string {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const yearStart = new Date(d.getFullYear(), 0, 4)
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
