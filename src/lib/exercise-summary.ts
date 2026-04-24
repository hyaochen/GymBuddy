import prisma from '@/lib/prisma'
import { epley1rm } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

/**
 * Recalculates and upserts the UserExerciseSummary for a given user + exercise.
 * Called after session completion.
 */
export async function updateExerciseSummary(userId: string, exerciseId: string) {
    // Get all completed session sets for this user + exercise
    const sessionExercises = await prisma.sessionExercise.findMany({
        where: {
            exerciseId,
            session: {
                userId,
                completedAt: { not: null },
            },
        },
        include: {
            sets: true,
            session: { select: { startedAt: true } },
        },
    })

    if (sessionExercises.length === 0) return

    let maxWeight = 0
    let maxWeightDate = new Date()
    let maxVolume = 0
    let maxVolumeDate = new Date()
    let best1rm = 0
    let lastUsedAt = new Date(0)

    const sessionIds = new Set<string>()

    for (const se of sessionExercises) {
        sessionIds.add(se.sessionId)

        if (se.session.startedAt > lastUsedAt) {
            lastUsedAt = se.session.startedAt
        }

        for (const set of se.sets) {
            const w = Number(set.weightKg)
            const r = set.repsPerformed
            const setVolume = w * r

            // Max weight
            if (w > maxWeight) {
                maxWeight = w
                maxWeightDate = se.session.startedAt
            }

            // Max single-set volume
            if (setVolume > maxVolume) {
                maxVolume = setVolume
                maxVolumeDate = se.session.startedAt
            }

            // Best estimated 1RM
            const e1rm = epley1rm(w, r)
            if (e1rm > best1rm) {
                best1rm = e1rm
            }
        }
    }

    await prisma.userExerciseSummary.upsert({
        where: {
            userId_exerciseId: { userId, exerciseId },
        },
        create: {
            userId,
            exerciseId,
            maxWeight,
            maxWeightDate,
            maxVolume,
            maxVolumeDate,
            estimated1rm: best1rm,
            totalSessions: sessionIds.size,
            lastUsedAt,
        },
        update: {
            maxWeight,
            maxWeightDate,
            maxVolume,
            maxVolumeDate,
            estimated1rm: best1rm,
            totalSessions: sessionIds.size,
            lastUsedAt,
        },
    })
}

/**
 * Rebuilds PersonalRecord rows for user+exercise from remaining session sets.
 * Call after set delete/edit so stale PRs (whose backing set was removed) are
 * cleared and replaced with the actual progression derived from current data.
 * Time-based sets (durationSeconds != null) are excluded — no weight PR.
 */
export async function recomputePersonalRecords(userId: string, exerciseId: string) {
    const sets = await prisma.sessionSet.findMany({
        where: {
            sessionExerciseId: { not: undefined },
            sessionExercise: { exerciseId, session: { userId, completedAt: { not: null } } },
            durationSeconds: null,
        },
        select: {
            weightKg: true,
            repsPerformed: true,
            completedAt: true,
        },
        orderBy: { completedAt: 'asc' },
    })

    const newRecords: Prisma.PersonalRecordCreateManyInput[] = []
    let running1rm = 0
    for (const s of sets) {
        if (!s.completedAt) continue
        const w = Number(s.weightKg)
        const r = s.repsPerformed
        const e1rm = epley1rm(w, r)
        if (e1rm > running1rm) {
            running1rm = e1rm
            newRecords.push({
                userId,
                exerciseId,
                weightKg: w,
                reps: r,
                estimated1rm: e1rm,
                achievedAt: s.completedAt,
            })
        }
    }

    await prisma.$transaction([
        prisma.personalRecord.deleteMany({ where: { userId, exerciseId } }),
        ...(newRecords.length > 0
            ? [prisma.personalRecord.createMany({ data: newRecords })]
            : []),
    ])
}

/**
 * Backfill all UserExerciseSummary for all users.
 * Run as a one-time script.
 */
export async function backfillAllSummaries() {
    const pairs = await prisma.sessionExercise.findMany({
        where: {
            session: { completedAt: { not: null } },
        },
        select: {
            exerciseId: true,
            session: { select: { userId: true } },
        },
        distinct: ['exerciseId', 'sessionId'],
    })

    const uniquePairs = new Map<string, { userId: string; exerciseId: string }>()
    for (const p of pairs) {
        const key = `${p.session.userId}:${p.exerciseId}`
        if (!uniquePairs.has(key)) {
            uniquePairs.set(key, { userId: p.session.userId, exerciseId: p.exerciseId })
        }
    }

    let count = 0
    for (const { userId, exerciseId } of uniquePairs.values()) {
        await updateExerciseSummary(userId, exerciseId)
        count++
    }

    return count
}
