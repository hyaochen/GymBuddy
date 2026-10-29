/**
 * T-GB-020: Coffee video plans for Shutiao (userId below).
 *
 * Prints one SQL transaction to stdout. Pipe it to psql:
 *   node scripts/coffee-video-plans-T-GB-020.mjs | docker exec -i workout-db psql -U workout -d workout -v ON_ERROR_STOP=1
 *
 * Idempotent: if a plan with the same name already exists for the user, the
 * transaction aborts without writing anything. Existing plans are never touched.
 * Exercises are inserted with ON CONFLICT (name) DO NOTHING (reuse if present).
 * Durations are real video lengths in seconds (checked with yt-dlp 2026-10-29).
 */
import { randomBytes } from 'node:crypto'

const USER_ID = 'cmnlsmm0e0000t0ca7nmxhn4a'
const CHANNEL = 'Coffee林芊妤 YouTube 頻道（@Coffee89921_）'
const url = (id) => `https://www.youtube.com/watch?v=${id}`

// [videoId, short name, seconds, exerciseType]
const V = {
    // light
    VdS5UHtmoho: ['站立腹肌初階', 1200, 'ISOLATION'],
    ghwNOgmYsz0: ['極速腹肌挑戰', 649, 'ISOLATION'],
    WpVjMCpb_iE: ['護膝腿臀操', 1564, 'COMPOUND'],
    '5fG8mWUkmYw': ['站立手臂操', 1421, 'ISOLATION'],
    '39G79Aj4UhU': ['懶人手臂操', 815, 'ISOLATION'],
    'hp89yY-e1eQ': ['站立燃脂不跳躍', 1999, 'CARDIO'],
    npN98gjV73Q: ['肩頸背舒緩強化', 1215, 'ISOLATION'],
    T0eUkIE0wqI: ['椅子腹肌', 1103, 'ISOLATION'],
    '4lNZz12VQhI': ['全身拉筋', 1978, 'STRETCH'],
    qWrpzAcIfQc: ['晨起伸展', 1231, 'STRETCH'],
    'v1IfbS_KXEM': ['小腿拉筋', 839, 'STRETCH'],
    // hard
    '6J_lz8ii6a8': ['慢速腹肌', 1342, 'ISOLATION'],
    '7rp7DGEAJ-s': ['零休息腹肌', 1214, 'ISOLATION'],
    '2JmK5jjJYvo': ['深蹲下半身', 1599, 'COMPOUND'],
    lE9Hkfuq_pw: ['深蹲加腿部拉筋', 1304, 'COMPOUND'],
    xmFdFnirjyo: ['極限手臂背胸', 847, 'ISOLATION'],
    HgSbc_HvlJI: ['胸部訓練', 1394, 'ISOLATION'],
    p5vwa2yBGxU: ['全身增肌減脂', 2257, 'COMPOUND'],
    '1KqiHry0PXI': ['平板支撐核心', 749, 'ISOLATION'],
    LwFHrTrBnu0: ['站立高強度燃脂', 2553, 'CARDIO'],
    EWRvkLQ3mMg: ['深層拉筋', 2330, 'STRETCH'],
    hMjFyJeprdw: ['一小時深層拉筋', 3750, 'STRETCH'],
}

// [dayName, dayOfWeek (ISO, Sunday = 7), [videoIds]]
const LIGHT = [
    ['週一 腹肌', 1, ['VdS5UHtmoho', 'ghwNOgmYsz0']],
    ['週二 臀腿', 2, ['WpVjMCpb_iE']],
    ['週三 上半身', 3, ['5fG8mWUkmYw', '39G79Aj4UhU']],
    ['週四 全身燃脂', 4, ['hp89yY-e1eQ']],
    ['週五 背肩與核心', 5, ['npN98gjV73Q', 'T0eUkIE0wqI']],
    ['週六 拉伸', 6, ['4lNZz12VQhI']],
    ['週日 拉伸', 7, ['qWrpzAcIfQc', 'v1IfbS_KXEM']],
]
const HARD = [
    ['週一 腹肌', 1, ['6J_lz8ii6a8', '7rp7DGEAJ-s']],
    ['週二 臀腿', 2, ['2JmK5jjJYvo', 'lE9Hkfuq_pw']],
    ['週三 上半身', 3, ['xmFdFnirjyo', 'HgSbc_HvlJI']],
    ['週四 全身燃脂', 4, ['p5vwa2yBGxU', '1KqiHry0PXI']],
    ['週五 高強度燃脂', 5, ['LwFHrTrBnu0']],
    ['週六 拉伸', 6, ['EWRvkLQ3mMg']],
    ['週日 深度拉伸', 7, ['hMjFyJeprdw']],
]

const PLANS = [
    { name: 'Coffee 輕量版 5+2', level: 'BEGINNER', label: '輕量版', days: LIGHT,
      desc: `跟著 YouTube 影片練：週一到週五按部位、週六日拉伸。影片來源：${CHANNEL}。輕量版以初階影片為主，每天約 20 到 50 分鐘。` },
    { name: 'Coffee 自虐版 5+2', level: 'ADVANCED', label: '自虐版', days: HARD,
      desc: `跟著 YouTube 影片練：週一到週五按部位、週六日拉伸。影片來源：${CHANNEL}。自虐版選用高強度影片，每天約 20 到 80 分鐘。` },
]

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const cuid = () => 'c' + randomBytes(12).toString('hex')
const minutes = (sec) => Math.round(sec / 60)

// Guard: no emoji in anything we write
const EMOJI = /\p{Extended_Pictographic}/u

const exName = (label, id) => `Coffee｜${V[id][0]} ${minutes(V[id][1])}分`
const out = []
out.push('BEGIN;')

// 1. exercises (reuse by unique name)
const exIdByVideo = {}
for (const plan of PLANS) {
    for (const [, , ids] of plan.days) {
        for (const id of ids) {
            if (!V[id]) throw new Error(`unknown video ${id}`)
            const [short, sec, type] = V[id]
            const name = exName(plan.label, id)
            const desc = `跟著影片完整練完，片長約 ${minutes(sec)} 分鐘。影片來源：${CHANNEL}。`
            if (EMOJI.test(name) || EMOJI.test(desc)) throw new Error('emoji in ' + name)
            const eid = cuid()
            exIdByVideo[id] = eid
            out.push(
                `INSERT INTO exercises (id, name, description, "stepInstructions", difficulty, "exerciseType", "isTimeBased", "videoUrl") VALUES (${q(eid)}, ${q(name)}, ${q(desc)}, '[]'::jsonb, '${plan.level}', '${type}', true, ${q(url(id))}) ON CONFLICT (name) DO NOTHING;`,
            )
        }
    }
}

// 2. plans (abort if the name already exists for this user)
for (const plan of PLANS) {
    if (EMOJI.test(plan.name) || EMOJI.test(plan.desc)) throw new Error('emoji in plan')
    const planId = cuid()
    out.push(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM workout_plans WHERE "userId" = ${q(USER_ID)} AND name = ${q(plan.name)}) THEN RAISE EXCEPTION 'plan already exists: ${plan.name}'; END IF; END $$;`)
    out.push(`INSERT INTO workout_plans (id, "userId", name, description, "daysPerWeek", "isActive", "createdAt", "updatedAt") VALUES (${q(planId)}, ${q(USER_ID)}, ${q(plan.name)}, ${q(plan.desc)}, 7, true, now(), now());`)
    plan.days.forEach(([dayName, dow, ids], di) => {
        const dayId = cuid()
        out.push(`INSERT INTO workout_plan_days (id, "planId", "dayName", "dayOfWeek", "orderIndex") VALUES (${q(dayId)}, ${q(planId)}, ${q(dayName)}, ${dow}, ${di});`)
        ids.forEach((id, ei) => {
            const sec = V[id][1]
            // exercise id may belong to an already existing row, so look it up by name
            out.push(`INSERT INTO workout_plan_exercises (id, "dayId", "exerciseId", "orderIndex", "defaultSets", "defaultRepsMin", "defaultRepsMax", "defaultDurationMin", "defaultDurationMax", "restSeconds") SELECT ${q(cuid())}, ${q(dayId)}, e.id, ${ei}, 1, 1, 1, ${sec}, ${sec}, 30 FROM exercises e WHERE e.name = ${q(exName(plan.label, id))};`)
        })
    })
}
out.push('COMMIT;')
process.stdout.write(out.join('\n') + '\n')
