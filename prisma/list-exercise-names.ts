/**
 * list-exercise-names.ts
 *
 * 輸出資料庫中所有現有動作名稱，供 validate_json.py 去重用。
 *
 * 執行：
 *   docker exec -i workout-app npx ts-node \
 *     --compiler-options '{"module":"CommonJS"}' \
 *     prisma/list-exercise-names.ts > existing_names.txt
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const exercises = await prisma.exercise.findMany({
        select: { name: true },
        orderBy: { name: 'asc' },
    })
    exercises.forEach(e => process.stdout.write(e.name + '\n'))
    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
