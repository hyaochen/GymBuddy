/**
 * apply-backfill.ts
 *
 * 套用 prisma/audit/codex-backfill.json 到 DB：
 * - 補上缺漏的 primary / secondary muscle group
 * - 補上缺漏的 equipment
 * - 補上缺漏的 alternative pairs（雙向）
 *
 * 安全特性：
 * - upsert / skipDuplicates 模式 — 不覆蓋既有資料
 * - 只新增，不刪除
 * - DRY_RUN=1 預覽，無 flag 才實際寫入
 *
 * 執行：
 *   docker exec -i workout-app npx tsx prisma/apply-backfill.ts          # 實際寫入
 *   DRY_RUN=1 docker exec -i workout-app npx tsx prisma/apply-backfill.ts  # 預覽
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const DRY_RUN = process.env.DRY_RUN === '1'

interface BackfillEntry {
    id: string
    name: string
    addPrimaryMuscles?: string[]
    addSecondaryMuscles?: string[]
    addEquipment?: string[]
    addAlternatives?: string[]
    reasoning?: string
}

interface BackfillFile {
    summary?: Record<string, number>
    backfill: BackfillEntry[]
}

async function main() {
    const filePath = path.join(__dirname, 'audit', 'codex-backfill.json')
    if (!fs.existsSync(filePath)) {
        console.error(`❌ 找不到 ${filePath}`)
        process.exit(1)
    }
    const data: BackfillFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    console.log(`📦 載入 ${data.backfill.length} 筆 backfill entry`)
    if (data.summary) console.log(`📊 summary:`, data.summary)
    if (DRY_RUN) console.log('🔍 DRY_RUN 模式 — 不會實際寫入\n')

    // 建立查詢表
    const allExercises = await prisma.exercise.findMany({ select: { id: true, name: true } })
    const nameToId = new Map(allExercises.map(e => [e.name, e.id]))
    const idToName = new Map(allExercises.map(e => [e.id, e.name]))

    const allMuscles = await prisma.muscleGroup.findMany({ select: { id: true, name: true } })
    const muscleNameToId = new Map(allMuscles.map(m => [m.name, m.id]))

    const allEquipment = await prisma.equipment.findMany({ select: { id: true, name: true } })
    const equipmentNameToId = new Map(allEquipment.map(e => [e.name, e.id]))

    let muscleAdded = 0, muscleSkipped = 0
    let equipmentAdded = 0, equipmentSkipped = 0
    let altAdded = 0, altSkipped = 0
    const errors: string[] = []
    const unknownMuscles = new Set<string>()
    const unknownEquipment = new Set<string>()
    const unknownExercises = new Set<string>()

    for (const entry of data.backfill) {
        const exerciseId = nameToId.get(entry.name) || (idToName.has(entry.id) ? entry.id : null)
        if (!exerciseId) {
            errors.push(`❌ 找不到動作: ${entry.name} (id=${entry.id})`)
            continue
        }

        // ─── primary muscles ───
        for (const muscleName of entry.addPrimaryMuscles || []) {
            const muscleId = muscleNameToId.get(muscleName)
            if (!muscleId) { unknownMuscles.add(muscleName); continue }
            try {
                if (!DRY_RUN) {
                    const result = await prisma.exerciseMuscle.upsert({
                        where: { exerciseId_muscleGroupId: { exerciseId, muscleGroupId: muscleId } },
                        update: {},
                        create: { exerciseId, muscleGroupId: muscleId, isPrimary: true },
                    })
                    if (result.isPrimary) muscleAdded++
                    else muscleSkipped++
                } else {
                    muscleAdded++
                }
            } catch (e) {
                errors.push(`❌ muscle ${muscleName} → ${entry.name}: ${e}`)
            }
        }

        // ─── secondary muscles ───
        for (const muscleName of entry.addSecondaryMuscles || []) {
            const muscleId = muscleNameToId.get(muscleName)
            if (!muscleId) { unknownMuscles.add(muscleName); continue }
            try {
                if (!DRY_RUN) {
                    await prisma.exerciseMuscle.upsert({
                        where: { exerciseId_muscleGroupId: { exerciseId, muscleGroupId: muscleId } },
                        update: {},
                        create: { exerciseId, muscleGroupId: muscleId, isPrimary: false },
                    })
                }
                muscleAdded++
            } catch (e) {
                errors.push(`❌ muscle ${muscleName} → ${entry.name}: ${e}`)
            }
        }

        // ─── equipment ───
        for (const eqName of entry.addEquipment || []) {
            const equipmentId = equipmentNameToId.get(eqName)
            if (!equipmentId) { unknownEquipment.add(eqName); continue }
            try {
                if (!DRY_RUN) {
                    await prisma.exerciseEquipment.upsert({
                        where: { exerciseId_equipmentId: { exerciseId, equipmentId } },
                        update: {},
                        create: { exerciseId, equipmentId },
                    })
                }
                equipmentAdded++
            } catch (e) {
                errors.push(`❌ equipment ${eqName} → ${entry.name}: ${e}`)
            }
        }

        // ─── alternatives (bidirectional) ───
        for (const altName of entry.addAlternatives || []) {
            const altId = nameToId.get(altName)
            if (!altId) { unknownExercises.add(altName); continue }
            if (altId === exerciseId) continue // skip self
            try {
                if (!DRY_RUN) {
                    const r = await prisma.exerciseAlternative.createMany({
                        data: [
                            { exerciseId, alternativeExerciseId: altId },
                            { exerciseId: altId, alternativeExerciseId: exerciseId },
                        ],
                        skipDuplicates: true,
                    })
                    altAdded += r.count
                    altSkipped += 2 - r.count
                } else {
                    altAdded += 2
                }
            } catch (e) {
                errors.push(`❌ alt ${altName} ↔ ${entry.name}: ${e}`)
            }
        }
    }

    console.log('\n═══ 結果 ═══')
    console.log(`  muscle group 連結新增：${muscleAdded}（跳過已存在：${muscleSkipped}）`)
    console.log(`  equipment 連結新增：${equipmentAdded}（跳過：${equipmentSkipped}）`)
    console.log(`  alternative 連結新增：${altAdded}（跳過：${altSkipped}）`)
    if (unknownMuscles.size > 0) console.log(`  ⚠️ unknown muscle names:`, [...unknownMuscles])
    if (unknownEquipment.size > 0) console.log(`  ⚠️ unknown equipment names:`, [...unknownEquipment])
    if (unknownExercises.size > 0) console.log(`  ⚠️ unknown alternative exercise names (${unknownExercises.size}):`, [...unknownExercises].slice(0, 10))
    if (errors.length > 0) {
        console.log(`\n  ❌ 錯誤 ${errors.length} 筆:`)
        for (const e of errors.slice(0, 20)) console.log(`    ${e}`)
    }

    // 驗證最終 coverage
    const stats = await Promise.all([
        prisma.exercise.count(),
        prisma.$queryRaw<{ no_alt: bigint }[]>`
            SELECT COUNT(*)::bigint AS no_alt FROM exercises WHERE id NOT IN (SELECT "exerciseId" FROM exercise_alternatives)
        `,
        prisma.$queryRaw<{ no_muscle: bigint }[]>`
            SELECT COUNT(*)::bigint AS no_muscle FROM exercises WHERE id NOT IN (SELECT "exerciseId" FROM exercise_muscles)
        `,
    ])
    console.log('\n═══ DB 最終狀態 ═══')
    console.log(`  總動作數：${stats[0]}`)
    console.log(`  無替代方案：${stats[1][0].no_alt}`)
    console.log(`  無 muscle 標籤：${stats[2][0].no_muscle}`)
}

main()
    .then(async () => { await prisma.$disconnect() })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
