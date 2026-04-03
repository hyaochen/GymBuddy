import { PrismaClient } from '@prisma/client'

function epley1rm(weight: number, reps: number): number {
    if (reps === 1) return weight
    return Math.round(weight * (1 + reps / 30) * 4) / 4
}

async function main() {
    const prisma = new PrismaClient()

    try {
        console.log('Backfilling UserExerciseSummary...')

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

        console.log(`Found ${uniquePairs.size} unique user-exercise pairs`)

        let count = 0
        for (const { userId, exerciseId } of uniquePairs.values()) {
            const sessionExercises = await prisma.sessionExercise.findMany({
                where: {
                    exerciseId,
                    session: { userId, completedAt: { not: null } },
                },
                include: {
                    sets: true,
                    session: { select: { startedAt: true } },
                },
            })

            if (sessionExercises.length === 0) continue

            let maxWeight = 0
            let maxWeightDate = new Date()
            let maxVolume = 0
            let maxVolumeDate = new Date()
            let best1rm = 0
            let lastUsedAt = new Date(0)
            const sessionIds = new Set<string>()

            for (const se of sessionExercises) {
                sessionIds.add(se.sessionId)
                if (se.session.startedAt > lastUsedAt) lastUsedAt = se.session.startedAt

                for (const set of se.sets) {
                    const w = Number(set.weightKg)
                    const r = set.repsPerformed
                    const setVolume = w * r

                    if (w > maxWeight) { maxWeight = w; maxWeightDate = se.session.startedAt }
                    if (setVolume > maxVolume) { maxVolume = setVolume; maxVolumeDate = se.session.startedAt }
                    const e1rm = epley1rm(w, r)
                    if (e1rm > best1rm) best1rm = e1rm
                }
            }

            await prisma.userExerciseSummary.upsert({
                where: { userId_exerciseId: { userId, exerciseId } },
                create: {
                    userId, exerciseId,
                    maxWeight, maxWeightDate,
                    maxVolume, maxVolumeDate,
                    estimated1rm: best1rm,
                    totalSessions: sessionIds.size,
                    lastUsedAt,
                },
                update: {
                    maxWeight, maxWeightDate,
                    maxVolume, maxVolumeDate,
                    estimated1rm: best1rm,
                    totalSessions: sessionIds.size,
                    lastUsedAt,
                },
            })

            count++
        }

        console.log(`Backfilled ${count} summaries`)
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(console.error)
