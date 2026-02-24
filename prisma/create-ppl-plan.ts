/**
 * 建立 5日PPL進階計劃
 * D1推 D2拉 D3腿(股四主) D4上肢補充 D5下肢後鏈
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const EX = {
    barbellBenchPress:     'cmlzdca9o001a11jl6e68w6k8',
    inclineBenchPress:     'cmlzdcaa2001b11jljh08hwvo',
    overheadPress:         'cmlzdcaba001h11jlw4qesrqg',
    pecDeckFly:            'cmlzdcab6001g11jlh3ckucxp',
    cableTricepPushdown:   'cmlzdcabx001k11jlx8f4vj9f',
    skullCrusher:          'cmlzdcac2001l11jlfcj3qhwn',
    deadlift:              'cmlzdcacf001n11jl27x9zqhe',
    pullUp:                'cmlzdcacs001o11jl81sagr15',
    barbellRow:            'cmlzdcadf001r11jlj17yojvy',
    seatedCableRow:        'cmlzdcad7001q11jlz2tk17nx',
    facePull:              'cmlzdcadp001s11jledg98qnn',
    dumbbellCurl:          'cmlzzvv900002pddrut303r65',
    barbellSquat:          'cmlzdcae5001v11jlx20nwifb',
    bulgarianSplitSquat:   'cmlzzvv8s0000pddrjfqdn4ul',
    legPress:              'cmlzdcaef001w11jlg3xvc1ld',
    legExtension:          'cmlzdcaew001z11jl05mkwr06',
    legCurl:               'cmlzdcaes001y11jl2exl4cfi',
    calfRaise:             'cmlzdcaf6002111jl0bi4su3q',
    dumbbellBenchPress:    'cmlzdcaac001c11jl4snhn7mc',
    inclineCableFly:       'cmlzzvv960004pddrrmm37ftu',
    machineLateralRaise:   'cmlzzvv9c0006pddr8e4gho6a',
    cableCurl:             'cmlzzvv990005pddrxvx21c5y',
    romanianDeadlift:      'cmlzdcael001x11jlvcwa15nv',
    hipThrust:             'cmlzzvv8x0001pddr37fi77sa',
    hackSquat:             'cmlzdcaf0002011jljukrmp61',
    backExtension:         'cmlzzvv930003pddrrtcxbkdn',
}

function ex(id: string, idx: number, sets: number, min: number, max: number, rest: number, kg: number) {
    return { exerciseId: id, orderIndex: idx, defaultSets: sets, defaultRepsMin: min, defaultRepsMax: max, restSeconds: rest, defaultWeightKg: kg }
}

async function main() {
    console.log('🏋️ 建立 5日PPL進階計劃...\n')

    const old = await prisma.workoutPlan.findFirst({ where: { name: '5日PPL進階計劃' } })
    if (old) {
        await prisma.workoutPlan.delete({ where: { id: old.id } })
        console.log('🗑️  刪除舊計劃\n')
    }

    const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } })
    if (!user) throw new Error('No users found. Please register first.')
    console.log(`👤 建立給用戶: ${user.name} (${user.email})\n`)

    const plan = await prisma.workoutPlan.create({
        data: {
            userId: user.id,
            name: '5日PPL進階計劃',
            description: '每週5日訓練，同肌群每週2次。D1推力(胸肩三頭)→D2拉力(背二頭)→D3腿部(股四主)→D4上肢補充→D5下肢後鏈',
            days: {
                create: [
                    {
                        dayName: 'D1 推（胸肩三頭）',
                        orderIndex: 1,
                        exercises: { create: [
                            ex(EX.barbellBenchPress,   1, 4, 6,  10, 150, 60),
                            ex(EX.inclineBenchPress,   2, 3, 8,  12,  90, 40),
                            ex(EX.overheadPress,       3, 3, 6,  10, 150, 40),
                            ex(EX.pecDeckFly,          4, 3, 10, 15,  60, 30),
                            ex(EX.cableTricepPushdown, 5, 3, 10, 12,  60, 15),
                            ex(EX.skullCrusher,        6, 3, 8,  12,  90, 20),
                        ]},
                    },
                    {
                        dayName: 'D2 拉（背二頭）',
                        orderIndex: 2,
                        exercises: { create: [
                            ex(EX.deadlift,       1, 3, 3,  6,  180, 80),
                            ex(EX.pullUp,         2, 4, 6,  10, 120,  0),
                            ex(EX.barbellRow,     3, 3, 6,  10, 120, 60),
                            ex(EX.seatedCableRow, 4, 3, 10, 12,  90, 40),
                            ex(EX.facePull,       5, 3, 12, 15,  60, 10),
                            ex(EX.dumbbellCurl,   6, 3, 8,  12,  60, 12),
                        ]},
                    },
                    {
                        dayName: 'D3 腿（股四主）',
                        orderIndex: 3,
                        exercises: { create: [
                            ex(EX.barbellSquat,        1, 4, 6,  10, 180, 70),
                            ex(EX.bulgarianSplitSquat, 2, 3, 8,  12, 120, 20),
                            ex(EX.legPress,            3, 3, 10, 15, 120, 80),
                            ex(EX.legExtension,        4, 3, 12, 15,  60, 30),
                            ex(EX.legCurl,             5, 3, 10, 15,  60, 30),
                            ex(EX.calfRaise,           6, 4, 8,  12,  60, 40),
                        ]},
                    },
                    {
                        dayName: 'D4 上肢綜合',
                        orderIndex: 4,
                        exercises: { create: [
                            ex(EX.dumbbellBenchPress,  1, 3, 8,  12, 120, 22),
                            ex(EX.seatedCableRow,      2, 3, 8,  12, 120, 40),
                            ex(EX.inclineCableFly,     3, 3, 12, 15,  60,  8),
                            ex(EX.machineLateralRaise, 4, 4, 12, 15,  45, 10),
                            ex(EX.cableCurl,           5, 3, 10, 12,  60, 10),
                            ex(EX.cableTricepPushdown, 6, 3, 10, 12,  60, 12),
                        ]},
                    },
                    {
                        dayName: 'D5 下肢後鏈',
                        orderIndex: 5,
                        exercises: { create: [
                            ex(EX.romanianDeadlift, 1, 4, 6,  10, 150, 60),
                            ex(EX.hipThrust,        2, 3, 8,  12, 120, 60),
                            ex(EX.legCurl,          3, 3, 10, 15,  60, 25),
                            ex(EX.hackSquat,        4, 3, 6,  10, 150, 60),
                            ex(EX.backExtension,    5, 3, 10, 15,  90,  0),
                        ]},
                    },
                ],
            },
        },
        include: { days: { include: { exercises: true }, orderBy: { orderIndex: 'asc' } } },
    })

    console.log(`✅ 計劃建立成功！ID: ${plan.id}`)
    console.log(`   名稱: ${plan.name}\n`)
    plan.days.forEach(day => {
        console.log(`   ${day.dayName} — ${day.exercises.length} 個動作`)
    })
    console.log(`\n🔗 開始訓練: http://localhost:3005/session`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
