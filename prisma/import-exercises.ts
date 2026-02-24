/**
 * Import exercise cues, common mistakes, and video URLs from user's training data.
 * Run: npx tsx prisma/import-exercises.ts
 */

import prisma from '../src/lib/prisma'

// ─── Muscle group IDs (from DB) ─────────────────────────────────────────────

const MG = {
    upperChest:   'cmlzdca90000s11jl07tslweq',
    chest:        'cmlzdca8y000r11jlwjmm82t4',
    frontDelt:    'cmlzdca98000y11jlnqcnzqmp',
    sideDelt:     'cmlzdca99000z11jlrh9smtvw',
    rearDelt:     'cmlzdca95000w11jls9zw8kcl',
    lats:         'cmlzdca91000t11jlopv0hyy9',
    rhomboids:    'cmlzdca93000u11jlpb2nfjlj',
    traps:        'cmlzdca94000v11jlifmevsus',
    biceps:       'cmlzdca9a001011jl5eedh5bc',
    triceps:      'cmlzdca9c001211jlezlnzpzb', // Note: use actual DB id
    quads:        'cmlzdca9f001311jlotbdumke',
    hamstrings:   'cmlzdca9g001411jluxl2qvyp',
    glutes:       'cmlzdca9h001511jlvduyiahb',
    calves:       'cmlzdca9i001611jl7q1lxh7d',
    erectorSpinae:'cmlzdca97000x11jl65q9fkg5',
    abs:          'cmlzdca9k001711jlhijqumsi',
    obliques:     'cmlzdca9l001811jlizh5wp8q',
    forearms:     'cmlzdca9d001211jlezlnzpzb', // Note: use actual DB id
    hipFlexors:   'cmlzdca9n001911jl60q9rwpm',
}

// Parse forearms and triceps IDs properly
async function getMuscleGroupIds() {
    const mgs = await prisma.muscleGroup.findMany()
    const map: Record<string, string> = {}
    for (const mg of mgs) {
        map[mg.name] = mg.id
    }
    return map
}

// ─── Exercise updates (matches to existing DB exercises) ─────────────────────

type ExerciseUpdate = {
    nameContains: string      // partial name to find the exercise
    videoUrl?: string         // YouTube or other URL
    cues: string              // semicolon-separated tips → stepInstructions
    mistakes?: string         // semicolon-separated common mistakes
}

const UPDATES: ExerciseUpdate[] = [
    {
        nameContains: '槓鈴臥推',
        videoUrl: 'https://www.youtube.com/watch?v=vcBig73ojpE',
        cues: '肩胛內收下沉、肩膀遠離耳朵；小拱背、胸骨抬高；前臂垂直推槓，腳穩固踩地；握距略寬於肩',
        mistakes: '手肘過度外張90°；臀部離凳；槓路忽上忽下；未全程控制',
    },
    {
        nameContains: '槓鈴深蹲',
        videoUrl: 'https://www.youtube.com/watch?v=CWl0apMgshk',
        cues: '槓放斜方肌上方（高杠）；吸氣撐腹、膝蓋朝腳尖方向外推；下蹲至大腿至少平行；起身帶動為髖與膝同時伸展',
        mistakes: '膝內扣；塌腰或過度骨盆前傾；腳跟離地；胸腔塌陷',
    },
    {
        nameContains: '硬舉',
        videoUrl: 'https://www.youtube.com/watch?v=NYN3UGCYisk',
        cues: '槓置腳中線上方；髖後移、脊柱中立；脛貼槓、上背緊；腳推地、槓貼腿上滑至鎖定',
        mistakes: '拉起前槓離身；下背圓曲；起始髖太低或太高導致槓路偏離',
    },
    {
        nameContains: '羅馬尼亞硬舉',
        videoUrl: 'https://www.youtube.com/watch?v=H_871e6OqLY',
        cues: '從站姿開始、膝微彎、髖折疊後移；槓沿大腿下降至腿後有明顯拉伸感；全程脊柱中立；頂部完全鎖定',
        mistakes: '向下時彎背或下放過深導致失去髖折疊；膝過度彎曲變成硬舉',
    },
    {
        nameContains: '槓鈴肩推',
        videoUrl: 'https://www.youtube.com/watch?v=_RlRDWO2jfg',
        cues: '握距略寬於肩；吸氣收緊核心與臀；槓沿臉前直線上推，過額後頭微收回至槓下',
        mistakes: '上推時過度後仰；肘外翻失去前臂垂直；聳肩代償',
    },
    {
        nameContains: '槓鈴划船',
        videoUrl: 'https://www.youtube.com/watch?v=axoeDmW0oAY',
        cues: '髖折疊、背部與地約平行；槓拉向下胸/腹上；肘沿身體兩側後拉；動作底端完全伸展',
        mistakes: '借力甩槓；聳肩拉；槓路忽前忽後',
    },
    {
        nameContains: '引體向上',
        videoUrl: 'https://www.youtube.com/watch?v=O94yEoGXtBY',
        cues: '肩胛先下沉內收；拉至胸靠近槓/把手；控制離心；握距中等',
        mistakes: '只用手臂拉、忽略肩胛運動；半程；身體大幅擺動',
    },
    {
        nameContains: '滑輪下拉',
        videoUrl: 'https://www.youtube.com/watch?v=O94yEoGXtBY',
        cues: '肩胛先下沉內收；拉至胸靠近把手；控制離心；握距中等',
        mistakes: '只用手臂拉、忽略肩胛運動；半程；身體大幅擺動',
    },
    {
        nameContains: '臉拉',
        videoUrl: 'https://www.youtube.com/watch?v=eIq5CB9JfKE',
        cues: '把手拉向眉/額高度，肘領先、肩胛外展轉內收；終點前臂與地面平行',
        mistakes: '手腕內旋導致肩夾擠；肘過低成肱三下壓',
    },
    {
        nameContains: '腿推機',
        videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
        cues: '腳放平台中上部、全腳掌發力；下放至大腿與軀幹約90°或更深但不骨盆後傾；推起不鎖死膝',
        mistakes: '腳尖內扣或外翻過度；膝內扣；只做半程',
    },
    {
        nameContains: '蝴蝶機夾胸',
        videoUrl: 'https://www.youtube.com/watch?v=JUDTGZh4rhg',
        cues: '上胸型：把手低到高收合；中胸型：平行路徑；全程手肘微彎固定、胸骨抬高',
        mistakes: '前臂彎伸變成推胸；動作過快失去峰縮',
    },
    {
        nameContains: '纜繩三頭下壓',
        videoUrl: 'https://www.youtube.com/watch?v=6Fzep104f0s',
        cues: '上臂貼近軀幹、肘做鉸鏈；向下伸直到完全伸展但不鎖死；離心3秒控制',
        mistakes: '身體過度前傾借力；手腕內折',
    },
    {
        nameContains: '腿屈伸',
        cues: '軸心對準膝關節、腳尖微內收；上舉至完全伸展、停1秒；離心控制',
        mistakes: '勾腳／踢腿太快；上半身晃動',
    },
    {
        nameContains: '腿彎舉',
        cues: '膝關節與機械軸對齊；腳跟勾向臀部；頂點停1秒',
        mistakes: '腰椎代償；幅度過淺',
    },
    {
        nameContains: '提踵',
        cues: '全腳掌穩定、下放至腳跟低於平台、頂部停1秒；膝伸直（站姿）或彎曲（坐姿）調整腓腸/比目魚比例',
        mistakes: '彈震借力；半程',
    },
    {
        nameContains: '哈克深蹲',
        videoUrl: 'https://www.youtube.com/watch?v=BYJH0ig63HY',
        cues: '胸骨抬高、肘高撐起；下蹲時膝前移、軀幹更直；保持全腳掌受力',
        mistakes: '胸垮、肘掉；腳跟離地',
    },
    {
        nameContains: '啞鈴臥推',
        videoUrl: 'https://www.youtube.com/watch?v=cbHSvdIR0Kk',
        cues: '躺平後，將啞鈴舉在胸部正上方；緩慢下放啞鈴至胸部兩側，手肘與身體呈45-60度；利用胸部力量將啞鈴推回起始位置',
        mistakes: '下放太快失去控制；手肘過度外張',
    },
    {
        nameContains: '坐姿划船',
        videoUrl: 'https://www.youtube.com/watch?v=ciEXVQ76_zc',
        cues: '坐在器材上，胸口靠著墊子；利用背部肌群的力量將把手向後拉，同時收緊肩胛骨；緩慢地放回，感受背部的伸展',
        mistakes: '借力甩動；上背圓曲',
    },
    {
        nameContains: '啞鈴側平舉',
        cues: '肩外展為主、肘約15°彎；手肘領先手腕；頂點短暫停留',
        mistakes: '聳肩代償；下放無控制；幅度過高影響肩夾擠',
    },
]

// ─── New exercises to create ─────────────────────────────────────────────────

type NewExercise = {
    name: string
    type: 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT' | 'SMITH_MACHINE' | 'OTHER'
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    bodyRegion: 'UPPER' | 'LOWER' | 'CORE' | 'FULL_BODY'
    exerciseType: 'COMPOUND' | 'ISOLATION'
    cues: string
    mistakes?: string
    videoUrl?: string
    primaryMuscles: string[]    // muscle group name keywords
    secondaryMuscles: string[]
}

const NEW_EXERCISES: NewExercise[] = [
    {
        name: '保加利亞分腿蹲 Bulgarian Split Squat',
        type: 'BARBELL',
        difficulty: 'INTERMEDIATE',
        bodyRegion: 'LOWER',
        exerciseType: 'COMPOUND',
        videoUrl: 'https://www.youtube.com/watch?v=hPlKPjohFS0',
        cues: '前腳全腳掌受力，後腳腳背放凳；下蹲時軀幹微前傾、膝蓋朝腳尖；前膝約在腳尖上方不內扣',
        mistakes: '重心跑到後腳；前腳腳跟離地；髖失衡左右晃',
        primaryMuscles: ['Quadriceps'],
        secondaryMuscles: ['Glutes', 'Hamstrings'],
    },
    {
        name: '臀推 Hip Thrust',
        type: 'BARBELL',
        difficulty: 'INTERMEDIATE',
        bodyRegion: 'LOWER',
        exerciseType: 'COMPOUND',
        videoUrl: 'https://www.youtube.com/watch?v=LM8XHLYJoYs',
        cues: '肩胛置於凳緣、脛垂直；起身時骨盆後傾、頂峰收縮2秒；軌跡近水平',
        mistakes: '腰椎代償過度伸展；腳距太遠/太近導致發力點錯誤；下放失控',
        primaryMuscles: ['Glutes'],
        secondaryMuscles: ['Hamstrings'],
    },
    {
        name: '啞鈴彎舉 Dumbbell Curl',
        type: 'DUMBBELL',
        difficulty: 'BEGINNER',
        bodyRegion: 'UPPER',
        exerciseType: 'ISOLATION',
        cues: '上臂穩定、肘靠近身體；離心控制2–3秒；頂峰短暫停留再下放',
        mistakes: '後仰/甩動；肘前移變成前臂抬舉',
        primaryMuscles: ['Biceps'],
        secondaryMuscles: ['Forearms'],
    },
    {
        name: '背伸展 Back Extension',
        type: 'BODYWEIGHT',
        difficulty: 'BEGINNER',
        bodyRegion: 'LOWER',
        exerciseType: 'ISOLATION',
        videoUrl: 'https://www.youtube.com/watch?v=D98GnSHyGzA',
        cues: '髖折疊發力，上下背保持中立；上到水平即可，不過度仰',
        mistakes: '以腰椎過伸代償；下降過深',
        primaryMuscles: ['Erector Spinae'],
        secondaryMuscles: ['Glutes', 'Hamstrings'],
    },
    {
        name: '上斜繩索飛鳥 Incline Cable Fly',
        type: 'CABLE',
        difficulty: 'INTERMEDIATE',
        bodyRegion: 'UPPER',
        exerciseType: 'ISOLATION',
        videoUrl: 'https://www.youtube.com/watch?v=Vezzqyjgd0k',
        cues: '將長凳調整至上斜30-45度；兩側滑輪調整至最低位置；雙手各持把手，手臂向兩側打開手肘微彎；利用上胸的力量以弧形軌跡向上向內夾',
        mistakes: '前臂彎伸變成推胸；動作過快失去峰縮',
        primaryMuscles: ['Upper Chest'],
        secondaryMuscles: ['Pectorals', 'Anterior Deltoid'],
    },
    {
        name: '繩索彎舉 Cable Curl',
        type: 'CABLE',
        difficulty: 'BEGINNER',
        bodyRegion: 'UPPER',
        exerciseType: 'ISOLATION',
        videoUrl: 'https://www.youtube.com/watch?v=k7lQMIRe_vM',
        cues: '將滑輪調整至最低位置；站在繩索機前，反握握把；保持上手臂固定，利用二頭肌的力量將握把向上彎舉',
        mistakes: '手腕折曲；上臂前後甩動',
        primaryMuscles: ['Biceps'],
        secondaryMuscles: ['Forearms'],
    },
    {
        name: '側平舉機 Machine Lateral Raise',
        type: 'MACHINE',
        difficulty: 'BEGINNER',
        bodyRegion: 'UPPER',
        exerciseType: 'ISOLATION',
        cues: '肩外展為主、肘約15°彎；手肘領先手腕；頂點短暫停留',
        mistakes: '聳肩代償；下放無控制；幅度過高影響肩夾擠',
        primaryMuscles: ['Lateral Deltoid'],
        secondaryMuscles: ['Anterior Deltoid'],
    },
]

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('📥 Importing exercise data...\n')

    // Get muscle groups
    const allMuscleGroups = await prisma.muscleGroup.findMany()
    const mgByName = (keyword: string) =>
        allMuscleGroups.find(mg => mg.name.includes(keyword))

    // ── Update existing exercises ──────────────────────────────────────────

    console.log('🔄 Updating existing exercises...')
    let updated = 0
    let notFound = 0

    for (const ex of UPDATES) {
        const found = await prisma.exercise.findFirst({
            where: { name: { contains: ex.nameContains } },
        })
        if (!found) {
            console.log(`  ⚠️  Not found: "${ex.nameContains}"`)
            notFound++
            continue
        }

        const steps = ex.cues.split('；').map(s => s.trim()).filter(Boolean)
        // Append common mistakes as a separate section
        const allSteps: string[] = [...steps]
        if (ex.mistakes) {
            allSteps.push('── 常見錯誤 ──')
            ex.mistakes.split('；').forEach(m => allSteps.push('⚠️ ' + m.trim()))
        }

        await prisma.exercise.update({
            where: { id: found.id },
            data: {
                stepInstructions: allSteps,
                ...(ex.videoUrl ? { videoUrl: ex.videoUrl } : {}),
            },
        })
        console.log(`  ✅ Updated: ${found.name}`)
        updated++
    }

    // ── Create new exercises ───────────────────────────────────────────────

    console.log('\n➕ Creating new exercises...')
    let created = 0

    for (const ex of NEW_EXERCISES) {
        // Check if already exists
        const namePart = ex.name.split(' ')[0]
        const existing = await prisma.exercise.findFirst({
            where: { name: { contains: namePart } },
        })
        if (existing) {
            // Just update video/cues if already there
            const steps = ex.cues.split('；').map(s => s.trim()).filter(Boolean)
            if (ex.mistakes) {
                steps.push('── 常見錯誤 ──')
                ex.mistakes.split('；').forEach(m => steps.push('⚠️ ' + m.trim()))
            }
            await prisma.exercise.update({
                where: { id: existing.id },
                data: {
                    stepInstructions: steps,
                    ...(ex.videoUrl ? { videoUrl: ex.videoUrl } : {}),
                },
            })
            console.log(`  🔄 Already exists, updated: ${existing.name}`)
            continue
        }

        const steps = ex.cues.split('；').map(s => s.trim()).filter(Boolean)
        if (ex.mistakes) {
            steps.push('── 常見錯誤 ──')
            ex.mistakes.split('；').forEach(m => steps.push('⚠️ ' + m.trim()))
        }

        const primaryMgs = ex.primaryMuscles
            .map(k => mgByName(k))
            .filter(Boolean)
        const secondaryMgs = ex.secondaryMuscles
            .map(k => mgByName(k))
            .filter(Boolean)

        const newEx = await prisma.exercise.create({
            data: {
                name: ex.name,
                difficulty: ex.difficulty,
                exerciseType: ex.exerciseType,
                stepInstructions: steps,
                videoUrl: ex.videoUrl ?? null,
                muscles: {
                    create: [
                        ...primaryMgs.map(mg => ({
                            muscleGroupId: mg!.id,
                            isPrimary: true,
                        })),
                        ...secondaryMgs.map(mg => ({
                            muscleGroupId: mg!.id,
                            isPrimary: false,
                        })),
                    ],
                },
            },
        })
        console.log(`  ✅ Created: ${newEx.name}`)
        created++
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Not found: ${notFound}`)
    console.log(`   Created: ${created}`)
    console.log('\n✅ Done!')
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
