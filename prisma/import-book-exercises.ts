/**
 * import-book-exercises.ts
 *
 * 從書籍提取的 JSON 匯入新動作到 PostgreSQL。
 * 使用 upsert(update:{}) 模式 — 安全可重複執行，不覆蓋現有資料。
 *
 * 執行前準備：
 *   1. 將 book1_exercises_clean.json / book2_exercises_clean.json 放到 prisma/ 目錄
 *   2. 確保書頁圖片已複製到 public/book-exercises/
 *
 * 執行：
 *   docker exec -i workout-app npx ts-node \
 *     --compiler-options '{"module":"CommonJS"}' \
 *     prisma/import-book-exercises.ts
 */

import { PrismaClient, Difficulty, ExerciseType } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

interface ExtractedExercise {
    name_zh: string
    name_en: string
    description?: string
    stepInstructions: string[]
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    exerciseType: 'COMPOUND' | 'ISOLATION' | 'STRETCH' | 'CARDIO'
    primaryMuscles: string[]
    secondaryMuscles: string[]
    equipment: string[]
    sourceBook: string
    sourcePageNumber: number
}

function makeExerciseId(nameZh: string, nameEn: string): string {
    const key = `${nameZh}_${nameEn}`.toLowerCase().replace(/\s+/g, '_')
    return 'book_' + crypto.createHash('md5').update(key).digest('hex').slice(0, 12)
}

function buildGifUrl(sourceBook: string, pageNumber: number): string {
    // 對應書頁圖片路徑，如：/book-exercises/core_strength/image00042.jpg
    const paddedPage = String(pageNumber).padStart(5, '0')
    return `/book-exercises/${sourceBook}/image${paddedPage}.jpg`
}

async function main() {
    const jsonFiles = [
        path.join(__dirname, 'book1_exercises_clean.json'),
        path.join(__dirname, 'book2_exercises_clean.json'),
    ].filter(f => fs.existsSync(f))

    if (jsonFiles.length === 0) {
        console.error('❌ 找不到 JSON 檔案。請先執行 extract_book.py 和 validate_json.py')
        console.error('   預期路徑：')
        console.error('   - prisma/book1_exercises_clean.json')
        console.error('   - prisma/book2_exercises_clean.json')
        process.exit(1)
    }

    console.log('=== 匯入書籍動作 ===\n')

    // 建立 Equipment 名稱 → ID 對照表
    const allEquipment = await prisma.equipment.findMany()
    const equipmentMap = new Map(allEquipment.map(e => [e.name, e.id]))
    console.log(`  設備項目：${allEquipment.length} 個`)

    // 建立 MuscleGroup 名稱 → ID 對照表
    const allMuscles = await prisma.muscleGroup.findMany()
    const muscleMap = new Map(allMuscles.map(m => [m.name, m.id]))
    console.log(`  肌群項目：${allMuscles.length} 個`)

    let totalCreated = 0
    let totalSkipped = 0
    let totalErrors = 0

    for (const jsonFile of jsonFiles) {
        const fileName = path.basename(jsonFile)
        console.log(`\n處理 ${fileName}...`)

        const exercises: ExtractedExercise[] = JSON.parse(
            fs.readFileSync(jsonFile, 'utf-8')
        )
        console.log(`  共 ${exercises.length} 個動作`)

        for (const ex of exercises) {
            const exerciseName = `${ex.name_zh} ${ex.name_en}`.trim()
            const exerciseId = makeExerciseId(ex.name_zh, ex.name_en)
            const gifUrl = buildGifUrl(ex.sourceBook, ex.sourcePageNumber)

            try {
                // 建立或跳過（不覆蓋已有資料）
                const result = await prisma.exercise.upsert({
                    where: { name: exerciseName },
                    update: {},
                    create: {
                        id: exerciseId,
                        name: exerciseName,
                        description: ex.description ?? null,
                        stepInstructions: ex.stepInstructions,
                        difficulty: ex.difficulty as Difficulty,
                        exerciseType: ex.exerciseType as ExerciseType,
                        gifUrl,
                    },
                })

                // 掛載設備（junction table）
                let eqLinked = 0
                for (const eqName of ex.equipment) {
                    const eqId = equipmentMap.get(eqName)
                    if (!eqId) {
                        console.warn(`    ⚠️  設備不存在："${eqName}"`)
                        continue
                    }
                    await prisma.exerciseEquipment.upsert({
                        where: {
                            exerciseId_equipmentId: {
                                exerciseId: result.id,
                                equipmentId: eqId,
                            },
                        },
                        update: {},
                        create: { exerciseId: result.id, equipmentId: eqId },
                    })
                    eqLinked++
                }

                // 掛載主要肌群
                let muscleLinked = 0
                for (const muscleName of ex.primaryMuscles) {
                    const muscleId = muscleMap.get(muscleName)
                    if (!muscleId) {
                        console.warn(`    ⚠️  肌群不存在："${muscleName}"`)
                        continue
                    }
                    await prisma.exerciseMuscle.upsert({
                        where: {
                            exerciseId_muscleGroupId: {
                                exerciseId: result.id,
                                muscleGroupId: muscleId,
                            },
                        },
                        update: {},
                        create: {
                            exerciseId: result.id,
                            muscleGroupId: muscleId,
                            isPrimary: true,
                        },
                    })
                    muscleLinked++
                }

                // 掛載次要肌群
                for (const muscleName of ex.secondaryMuscles) {
                    const muscleId = muscleMap.get(muscleName)
                    if (!muscleId) continue
                    await prisma.exerciseMuscle.upsert({
                        where: {
                            exerciseId_muscleGroupId: {
                                exerciseId: result.id,
                                muscleGroupId: muscleId,
                            },
                        },
                        update: {},
                        create: {
                            exerciseId: result.id,
                            muscleGroupId: muscleId,
                            isPrimary: false,
                        },
                    })
                    muscleLinked++
                }

                const typeTag = `[${ex.exerciseType}]`
                const diffTag = `[${ex.difficulty}]`
                console.log(
                    `  ✓ ${typeTag} ${diffTag} ${exerciseName} ` +
                    `(eq:${eqLinked} muscle:${muscleLinked})`
                )
                totalCreated++

            } catch (e) {
                console.error(`  ❌ 錯誤：${exerciseName} — ${e}`)
                totalErrors++
            }
        }
    }

    // 最終統計
    const finalCount = await prisma.exercise.count()
    console.log('\n=== 完成 ===')
    console.log(`  新增：${totalCreated}`)
    console.log(`  跳過（已存在）：${totalSkipped}`)
    console.log(`  錯誤：${totalErrors}`)
    console.log(`  資料庫總動作數：${finalCount}`)

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
