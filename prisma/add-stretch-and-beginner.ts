/**
 * add-stretch-and-beginner.ts
 *
 * Adds:
 *  1. 15 stretching / relaxation exercises (STRETCH type, bodyweight)
 *  2. 5日PPL放鬆計劃 — 3-day cool-down plan (Push/Pull/Legs)
 *  3. 3日PPL新手計劃 — beginner-friendly 3-day PPL
 *
 * Run inside Docker:
 *   docker exec -i workout-app npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/add-stretch-and-beginner.ts
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('=== Adding Stretch Exercises + Beginner Plan ===\n')

    // ── 1. Stretching exercises ───────────────────────────────────────────────

    const stretchExercises = [
        {
            id: 'stretch_chest_doorway',
            name: '胸部門框伸展 Doorway Chest Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '站在門框旁，雙臂彎曲扶住門框兩側，身體微微前傾，感受胸部的伸展。每次保持 30 秒，重複 2–3 次。',
            stepInstructions: [
                '站在門框中央，雙腳略比肩寬',
                '雙臂彎曲 90 度，小臂貼住門框兩側',
                '身體緩慢前傾，直到胸部有明顯張力感',
                '保持 30 秒，深呼吸，讓胸肌放鬆',
                '緩慢退回，重複 2–3 組',
            ],
            muscles: ['胸大肌', '前三角肌'],
        },
        {
            id: 'stretch_shoulder_cross',
            name: '肩部交叉伸展 Cross-body Shoulder Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '將一隻手臂橫跨胸前，用另一隻手將其固定拉近身體，感受肩後三角肌與旋轉肌的伸展。',
            stepInstructions: [
                '站直，將右手臂伸直橫過胸前',
                '左手從右手臂下方托住，輕輕往左胸方向拉',
                '感受右肩後側的伸展，保持 30 秒',
                '換邊重複',
            ],
            muscles: ['後三角肌', '背闊肌'],
        },
        {
            id: 'stretch_tricep_overhead',
            name: '三頭肌頭頂伸展 Overhead Tricep Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '將一隻手臂舉過頭頂，肘關節彎曲讓手指觸及背部，另一隻手輕壓肘部加深伸展。',
            stepInstructions: [
                '右手臂舉過頭頂，手肘彎曲，手指向下指向背部',
                '左手輕放右手肘，緩慢往頭後方向施壓',
                '感受右側三頭肌的拉伸，保持 30 秒',
                '換手重複',
            ],
            muscles: ['三頭肌'],
        },
        {
            id: 'stretch_bicep_wall',
            name: '二頭肌牆壁伸展 Bicep Wall Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '將手掌貼牆，手指朝後，緩慢轉動身體讓手臂伸直，感受前臂與二頭肌的伸展。',
            stepInstructions: [
                '站在牆邊，右手張開貼牆，手指朝向後方（或側面）',
                '保持手臂伸直，緩慢將身體轉向左側',
                '感受右側二頭肌與前臂的拉伸',
                '保持 30 秒後換邊',
            ],
            muscles: ['二頭肌'],
        },
        {
            id: 'stretch_cat_cow',
            name: '貓牛式 Cat-Cow Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '四足跪地交替進行脊椎彎曲（貓式）和伸展（牛式），放鬆整條脊椎及背部深層肌群。',
            stepInstructions: [
                '四足跪地，手腕在肩膀正下方，膝蓋在臀部正下方',
                '吸氣時：頭部上揚、腰部下沉（牛式）',
                '吐氣時：低頭、背部向上拱起（貓式）',
                '緩慢交替，每次保持 2–3 秒，重複 10 次',
            ],
            muscles: ['下背', '豎脊肌'],
        },
        {
            id: 'stretch_child_pose',
            name: '嬰兒式 Child\'s Pose',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '跪坐後身體前傾雙手向前延伸，充分放鬆下背、臀部與肩膀，是訓練後最佳的全身放鬆姿勢。',
            stepInstructions: [
                '跪坐在墊子上，雙腳大拇指相碰，膝蓋分開',
                '身體緩慢前傾，雙手向前延伸，額頭輕觸地面',
                '臀部往腳跟方向沉，感受下背與臀部的拉伸',
                '深呼吸，每次吐氣讓身體更放鬆，保持 60 秒',
            ],
            muscles: ['下背', '臀大肌', '背闊肌'],
        },
        {
            id: 'stretch_hip_flexor',
            name: '髖屈肌弓步伸展 Hip Flexor Lunge Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '弓步跪姿下沉髖部，伸展前側股直肌與髂腰肌，改善因久坐或大重量訓練造成的髖部緊繃。',
            stepInstructions: [
                '右腳向前踏出成弓步，左膝跪地',
                '雙手放在右膝上，身體保持直立',
                '臀部緩慢向前下方推，感受左側髖前方的拉伸',
                '保持 30–45 秒後換邊',
            ],
            muscles: ['髖屈肌', '股四頭肌'],
        },
        {
            id: 'stretch_quad_standing',
            name: '站立股四頭肌伸展 Standing Quad Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '單腳站立，另一腳向後彎曲以手握住腳踝，感受大腿前側股四頭肌的充分伸展。',
            stepInstructions: [
                '單腳站立，可以手扶牆保持平衡',
                '另一腳向後彎曲，以同側手抓住腳踝',
                '膝蓋併攏，髖部微微前推',
                '感受大腿前側的拉伸，保持 30 秒，換腿重複',
            ],
            muscles: ['股四頭肌'],
        },
        {
            id: 'stretch_hamstring_seated',
            name: '坐姿腘繩肌伸展 Seated Hamstring Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '坐在地板上，雙腳伸直向前，身體前傾雙手觸碰腳趾，充分伸展腿後側腘繩肌群。',
            stepInstructions: [
                '坐在地板上，雙腳伸直向前合攏',
                '吸一口氣，吐氣時身體緩慢前傾，雙手沿腿向下滑',
                '盡可能伸向腳趾，保持背部相對直立',
                '感受腿後側的拉伸，保持 30–45 秒',
            ],
            muscles: ['腘繩肌'],
        },
        {
            id: 'stretch_glute_pigeon',
            name: '臀部梨狀肌伸展 Figure-4 Glute Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '仰臥位將一隻腳踝放在另一腿膝蓋上，呈數字 4 的形狀，有效伸展臀大肌與梨狀肌。',
            stepInstructions: [
                '仰臥，雙腳彎曲踩地',
                '右腳踝放在左膝上，呈數字 4 形',
                '雙手抱住左大腿，緩慢將左腿拉向胸口',
                '感受右側臀部深層的拉伸，保持 30–45 秒，換邊重複',
            ],
            muscles: ['臀大肌'],
        },
        {
            id: 'stretch_calf_standing',
            name: '站立小腿伸展 Standing Calf Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '面向牆壁，一腳向後踩穩，腳跟壓地，伸展腓腸肌與比目魚肌，緩解小腿訓練後的緊繃感。',
            stepInstructions: [
                '面向牆壁，雙手輕扶牆面',
                '右腳向後踩出，腳跟踩實地面',
                '身體微微前傾，感受右小腿後側的拉伸',
                '保持 30 秒，換腿重複',
                '彎曲後腿膝蓋可伸展比目魚肌（更深處）',
            ],
            muscles: ['小腿'],
        },
        {
            id: 'stretch_butterfly',
            name: '蝴蝶式大腿內側伸展 Butterfly Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '坐地將腳底相對，雙手按住膝蓋向地面輕壓，充分伸展大腿內收肌群，改善腿部訓練後的內側緊繃。',
            stepInstructions: [
                '坐在地上，雙腳腳底相對，膝蓋向外展開',
                '雙手輕放在膝蓋上方或腳踝處',
                '保持背部直立，緩慢用雙肘向下輕壓膝蓋',
                '感受大腿內側的拉伸，保持 30–45 秒',
            ],
            muscles: ['大腿內側', '臀大肌'],
        },
        {
            id: 'stretch_spinal_twist',
            name: '仰臥脊椎旋轉 Supine Spinal Twist',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '仰臥將一隻腿跨過身體扭轉，旋轉脊椎和放鬆腰背及臀部肌肉，消除訓練後的腰部疲勞。',
            stepInstructions: [
                '仰臥，雙手向兩側伸展成十字形',
                '右膝彎曲，右腳跨到身體左側，腳放在地上',
                '頭部轉向右側，感受腰部與臀部的旋轉拉伸',
                '雙肩盡量貼地，保持 30–45 秒後換邊',
            ],
            muscles: ['下背', '臀大肌', '豎脊肌'],
        },
        {
            id: 'stretch_lat_side_bend',
            name: '背闊肌側彎伸展 Lat Side Bend Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '站立一手高舉後向反側彎腰，充分伸展背闊肌與側腹，緩解划船、引體向上後的背部緊繃。',
            stepInstructions: [
                '站直，右手高舉過頭',
                '身體緩慢向左彎，右手臂跟著側彎',
                '感受右側背闊肌與側腹部的拉伸',
                '保持 30 秒，換邊重複',
            ],
            muscles: ['背闊肌', '核心'],
        },
        {
            id: 'stretch_neck_side',
            name: '頸部側邊伸展 Neck Side Stretch',
            exerciseType: 'STRETCH' as const,
            difficulty: 'BEGINNER' as const,
            description: '頭部緩慢向一側傾斜，用手輕加壓力，放鬆頸部兩側肌肉，減輕肩推、划船訓練後的頸部張力。',
            stepInstructions: [
                '坐直或站立，頸部放鬆',
                '頭部緩慢向右傾斜，右耳靠近右肩',
                '右手輕放在頭部左側，輕微施加壓力加深伸展',
                '保持 30 秒，緩慢換邊重複',
            ],
            muscles: ['頸部', '斜方肌'],
        },
    ]

    console.log(`Creating ${stretchExercises.length} stretching exercises...`)
    let created = 0
    for (const ex of stretchExercises) {
        const exists = await prisma.exercise.findUnique({ where: { id: ex.id } })
        if (exists) { console.log(`  ↩ Skip (exists): ${ex.name}`); continue }

        await prisma.exercise.create({
            data: {
                id: ex.id,
                name: ex.name,
                exerciseType: ex.exerciseType,
                difficulty: ex.difficulty,
                description: ex.description,
                stepInstructions: ex.stepInstructions,
                gifUrl: null,
                videoUrl: null,
            },
        })
        console.log(`  ✓ Created: ${ex.name}`)
        created++
    }
    console.log(`\n${created} new stretch exercises created.\n`)

    // ── 2. 5日PPL放鬆計劃 ────────────────────────────────────────────────────
    // NOTE: plans are user-specific. We'll get the first user (or allow null userId for default)
    // Actually we'll create plans for all existing users, or mark them as "global template"
    // For now, create for the first user found

    const users = await prisma.user.findMany({ select: { id: true, name: true } })
    console.log(`Creating plans for users: ${users.map(u => u.name).join(', ')}`)

    for (const user of users) {
        await createRelaxationPlan(user.id, user.name)
        await createBeginnerPlan(user.id, user.name)
    }

    console.log('\n=== Done! ===')
}

async function createRelaxationPlan(userId: string, username: string) {
    const existing = await prisma.workoutPlan.findFirst({
        where: { userId, name: '5日PPL放鬆計劃' },
    })
    if (existing) { console.log(`  ↩ Relaxation plan already exists for ${username}`); return }

    const plan = await prisma.workoutPlan.create({
        data: {
            userId,
            name: '5日PPL放鬆計劃',
            description: '配合5日PPL進階計劃的收操放鬆計畫，以靜態伸展為主，每次約15–20分鐘。訓練後立即進行效果最佳。',
        },
    })
    console.log(`  ✓ Created relaxation plan for ${username}`)

    // Day R1: 推日放鬆 (after Push D1/D4)
    const r1 = await prisma.workoutPlanDay.create({
        data: {
            planId: plan.id,
            dayName: 'R1 推日放鬆（胸肩三頭）',
            orderIndex: 0,
        },
    })
    const r1Exercises = [
        { exId: 'stretch_chest_doorway',    sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_shoulder_cross',   sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_tricep_overhead',  sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_neck_side',        sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_child_pose',       sets: 1, repsMin: 1, repsMax: 1, weight: 0, rest: 60 },
    ]
    for (let i = 0; i < r1Exercises.length; i++) {
        const e = r1Exercises[i]
        await prisma.workoutPlanExercise.create({
            data: { dayId: r1.id, exerciseId: e.exId, orderIndex: i, defaultSets: e.sets, defaultRepsMin: e.repsMin, defaultRepsMax: e.repsMax, defaultWeightKg: e.weight, restSeconds: e.rest },
        })
    }

    // Day R2: 拉日放鬆 (after Pull D2)
    const r2 = await prisma.workoutPlanDay.create({
        data: {
            planId: plan.id,
            dayName: 'R2 拉日放鬆（背二頭）',
            orderIndex: 1,
        },
    })
    const r2Exercises = [
        { exId: 'stretch_lat_side_bend',    sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_shoulder_cross',   sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_bicep_wall',       sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_spinal_twist',     sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 45 },
        { exId: 'stretch_cat_cow',          sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_child_pose',       sets: 1, repsMin: 1, repsMax: 1, weight: 0, rest: 60 },
    ]
    for (let i = 0; i < r2Exercises.length; i++) {
        const e = r2Exercises[i]
        await prisma.workoutPlanExercise.create({
            data: { dayId: r2.id, exerciseId: e.exId, orderIndex: i, defaultSets: e.sets, defaultRepsMin: e.repsMin, defaultRepsMax: e.repsMax, defaultWeightKg: e.weight, restSeconds: e.rest },
        })
    }

    // Day R3: 腿日放鬆 (after Leg D3/D5)
    const r3 = await prisma.workoutPlanDay.create({
        data: {
            planId: plan.id,
            dayName: 'R3 腿日放鬆（腿臀後鏈）',
            orderIndex: 2,
        },
    })
    const r3Exercises = [
        { exId: 'stretch_hip_flexor',       sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 45 },
        { exId: 'stretch_quad_standing',    sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_hamstring_seated', sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 45 },
        { exId: 'stretch_glute_pigeon',     sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 45 },
        { exId: 'stretch_butterfly',        sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 45 },
        { exId: 'stretch_calf_standing',    sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 30 },
        { exId: 'stretch_spinal_twist',     sets: 2, repsMin: 1, repsMax: 1, weight: 0, rest: 45 },
    ]
    for (let i = 0; i < r3Exercises.length; i++) {
        const e = r3Exercises[i]
        await prisma.workoutPlanExercise.create({
            data: { dayId: r3.id, exerciseId: e.exId, orderIndex: i, defaultSets: e.sets, defaultRepsMin: e.repsMin, defaultRepsMax: e.repsMax, defaultWeightKg: e.weight, restSeconds: e.rest },
        })
    }

    console.log(`    → 3 relaxation days created (R1推/R2拉/R3腿)`)
}

async function createBeginnerPlan(userId: string, username: string) {
    const existing = await prisma.workoutPlan.findFirst({
        where: { userId, name: '3日PPL新手計劃' },
    })
    if (existing) { console.log(`  ↩ Beginner plan already exists for ${username}`); return }

    const plan = await prisma.workoutPlan.create({
        data: {
            userId,
            name: '3日PPL新手計劃',
            description: '適合健身新手的3日推拉腿分化計劃，以中等重量的複合動作為主。每週訓練3天，各肌群有充足恢復時間。建議重量為體重的30–40%開始，掌握動作後再漸進增重。',
        },
    })
    console.log(`  ✓ Created beginner plan for ${username}`)

    // Day B1: 推 Push (Chest/Shoulder/Tricep)
    const b1 = await prisma.workoutPlanDay.create({
        data: { planId: plan.id, dayName: 'B1 推（胸肩三頭）', orderIndex: 0 },
    })
    const b1Exercises = [
        // 槓鈴臥推 Barbell Bench Press
        { exId: 'cmlzdca9o001a11jl6e68w6k8', sets: 3, repsMin: 8,  repsMax: 12, weight: 20, rest: 120 },
        // 上斜啞鈴臥推 Incline Dumbbell Press
        { exId: 'cmm023vpu0001oqut0t7ijffw',  sets: 3, repsMin: 10, repsMax: 15, weight: 10, rest: 90 },
        // 啞鈴肩推 Dumbbell Shoulder Press
        { exId: 'cmm023vqe0007oqut9hv4hylu',  sets: 3, repsMin: 10, repsMax: 15, weight: 8,  rest: 90 },
        // 纜繩三頭下壓 Cable Tricep Pushdown
        { exId: 'cmlzdcabx001k11jlx8f4vj9f',  sets: 3, repsMin: 12, repsMax: 15, weight: 8,  rest: 60 },
        // 蝴蝶機夾胸 Pec Deck Fly
        { exId: 'cmlzdcab6001g11jlh3ckucxp',  sets: 3, repsMin: 12, repsMax: 15, weight: 15, rest: 60 },
    ]
    for (let i = 0; i < b1Exercises.length; i++) {
        const e = b1Exercises[i]
        await prisma.workoutPlanExercise.create({
            data: { dayId: b1.id, exerciseId: e.exId, orderIndex: i, defaultSets: e.sets, defaultRepsMin: e.repsMin, defaultRepsMax: e.repsMax, defaultWeightKg: e.weight, restSeconds: e.rest },
        })
    }

    // Day B2: 拉 Pull (Back/Bicep)
    const b2 = await prisma.workoutPlanDay.create({
        data: { planId: plan.id, dayName: 'B2 拉（背二頭）', orderIndex: 1 },
    })
    const b2Exercises = [
        // 滑輪下拉 Lat Pulldown
        { exId: 'cmlzdcad0001p11jlpe0uoije',  sets: 3, repsMin: 10, repsMax: 15, weight: 30, rest: 90 },
        // 坐姿划船 Seated Cable Row
        { exId: 'cmlzdcad7001q11jlz2tk17nx',  sets: 3, repsMin: 10, repsMax: 15, weight: 20, rest: 90 },
        // 單臂啞鈴划船 Single-arm Dumbbell Row
        { exId: 'cmm023vq20003oqutch89wzql',  sets: 3, repsMin: 10, repsMax: 15, weight: 12, rest: 90 },
        // 啞鈴彎舉 Dumbbell Curl
        { exId: 'cmlzzvv900002pddrut303r65',  sets: 3, repsMin: 12, repsMax: 15, weight: 7,  rest: 60 },
        // 臉拉 Face Pull
        { exId: 'cmlzdcadp001s11jledg98qnn',  sets: 3, repsMin: 15, repsMax: 20, weight: 5,  rest: 60 },
    ]
    for (let i = 0; i < b2Exercises.length; i++) {
        const e = b2Exercises[i]
        await prisma.workoutPlanExercise.create({
            data: { dayId: b2.id, exerciseId: e.exId, orderIndex: i, defaultSets: e.sets, defaultRepsMin: e.repsMin, defaultRepsMax: e.repsMax, defaultWeightKg: e.weight, restSeconds: e.rest },
        })
    }

    // Day B3: 腿 Legs
    const b3 = await prisma.workoutPlanDay.create({
        data: { planId: plan.id, dayName: 'B3 腿（股四腘繩）', orderIndex: 2 },
    })
    const b3Exercises = [
        // 槓鈴深蹲 Barbell Back Squat
        { exId: 'cmlzdcae5001v11jlx20nwifb',  sets: 3, repsMin: 8,  repsMax: 12, weight: 30, rest: 120 },
        // 腿推機 Leg Press
        { exId: 'cmlzdcaef001w11jlg3xvc1ld',  sets: 3, repsMin: 12, repsMax: 15, weight: 40, rest: 90 },
        // 腿屈伸 Leg Extension
        { exId: 'cmlzdcaew001z11jl05mkwr06',  sets: 3, repsMin: 12, repsMax: 15, weight: 15, rest: 60 },
        // 腿彎舉 Leg Curl
        { exId: 'cmlzdcaes001y11jl2exl4cfi',  sets: 3, repsMin: 12, repsMax: 15, weight: 12, rest: 60 },
        // 提踵 Calf Raise
        { exId: 'cmlzdcaf6002111jl0bi4su3q',  sets: 3, repsMin: 15, repsMax: 20, weight: 20, rest: 45 },
    ]
    for (let i = 0; i < b3Exercises.length; i++) {
        const e = b3Exercises[i]
        await prisma.workoutPlanExercise.create({
            data: { dayId: b3.id, exerciseId: e.exId, orderIndex: i, defaultSets: e.sets, defaultRepsMin: e.repsMin, defaultRepsMax: e.repsMax, defaultWeightKg: e.weight, restSeconds: e.rest },
        })
    }

    console.log(`    → 3 beginner days created (B1推/B2拉/B3腿)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
