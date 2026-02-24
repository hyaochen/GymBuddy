/**
 * 更新 5日PPL計劃的預設重量
 * 適合 55kg / 171cm / 26歲 男性（中等初學者）
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// 55kg 男性建議起始重量參考：
// 臥推約 bodyweight × 0.7–0.8 ≈ 38–44kg → 用 40kg
// 深蹲約 bodyweight × 0.9–1.0 ≈ 50–55kg → 用 50kg
// 硬舉約 bodyweight × 1.0–1.2 ≈ 55–66kg → 用 55kg
// 肩推約 bodyweight × 0.4–0.5 ≈ 22–27kg → 用 25kg

const WEIGHTS: Record<string, number> = {
    '槓鈴臥推':     40,   // 約 0.73× bodyweight
    '上斜槓鈴臥推': 30,
    '槓鈴肩推':     25,
    '蝴蝶機夾胸':   20,
    '纜繩三頭下壓': 10,
    '臥式三頭屈伸': 12,

    '硬舉':         55,   // 約 1.0× bodyweight
    '引體向上':      0,   // 自體重
    '槓鈴划船':     40,
    '坐姿划船':     27.5,
    '臉拉':          7.5,
    '啞鈴彎舉':      8,   // 單手

    '槓鈴深蹲':     50,   // 約 0.9× bodyweight
    '保加利亞分腿蹲': 12, // 單手啞鈴
    '腿推機':       60,
    '腿屈伸':       20,
    '腿彎舉':       20,
    '提踵':         30,

    '啞鈴臥推':     16,   // 單手
    '上斜繩索飛鳥':  6,
    '側平舉機':      6,
    '繩索彎舉':      7.5,

    '羅馬尼亞硬舉': 40,
    '臀推':         40,
    '哈克深蹲':     40,
    '背伸展':        0,   // 自體重
}

async function main() {
    const plan = await prisma.workoutPlan.findFirst({
        where: { name: '5日PPL進階計劃' },
        include: {
            days: {
                include: {
                    exercises: { include: { exercise: { select: { name: true } } } }
                }
            }
        }
    })
    if (!plan) throw new Error('Plan not found')

    console.log(`🏋️  更新計劃: ${plan.name}\n`)

    let updated = 0
    for (const day of plan.days) {
        for (const pe of day.exercises) {
            const exName = pe.exercise.name
            // 從中文名稱找匹配（最長的 key 優先，避免 '硬舉' 匹配到 '羅馬尼亞硬舉'）
            const matchKey = Object.keys(WEIGHTS).sort((a, b) => b.length - a.length).find(k => exName.includes(k))
            if (matchKey !== undefined) {
                const newWeight = WEIGHTS[matchKey]
                await prisma.workoutPlanExercise.update({
                    where: { id: pe.id },
                    data: { defaultWeightKg: newWeight },
                })
                console.log(`  ✅ ${exName.split(' ')[0].padEnd(12)} → ${newWeight}kg`)
                updated++
            } else {
                console.log(`  ⚠️  ${exName.split(' ')[0].padEnd(12)} → 無對應（保持原值）`)
            }
        }
    }

    console.log(`\n✅ 已更新 ${updated} 個動作的預設重量`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
