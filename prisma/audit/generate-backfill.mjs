/**
 * generate-backfill.mjs
 *
 * Rule-based keyword matching to infer muscle groups, then propose alternatives
 * for the 257-exercise knowledge base.
 *
 * Inputs (in prisma/audit/):
 *   - exercises-full.json    (DB dump with name/description/steps/current tags)
 *   - muscle-groups.json     (19 valid muscle group names)
 *   - equipment.json         (27 valid equipment names)
 *
 * Output:
 *   - codex-backfill.json    (compatible with apply-backfill.ts schema)
 */

import fs from 'node:fs'
import path from 'node:path'

const AUDIT_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''))
const ROOT = path.resolve(AUDIT_DIR, '..', '..')

function loadJson(rel) {
  const p = path.join(AUDIT_DIR, rel)
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

const exercises = loadJson('exercises-full.json')
const muscleGroups = loadJson('muscle-groups.json')

// ─── muscle keyword → canonical name table ──────────────────────────────────
// Keywords are matched against name + description + steps (lowercased / NFC normalized)
// Order matters: more specific keywords first
const MG = {}
for (const m of muscleGroups) MG[m.name.split(' ')[0]] = m.name  // shorthand → full

const KEYWORDS = [
  // CHEST
  { kw: ['上胸', 'upper chest', 'incline bench press', '上斜', '斜板上推', '45度角睫'], muscle: '上胸 Upper Chest', region: 'CHEST' },
  { kw: ['胸大肌', '胸肌', '胸推', '臥推', '飛鳥', 'fly', 'bench press', '夾胸', 'push-up', '伏地挺身', '夾胸機', '蝴蝶機', 'pec deck', 'chest press'], muscle: '胸大肌 Pectorals', region: 'CHEST' },
  // BACK
  { kw: ['背闊肌', 'lat ', '下拉', 'pull-up', 'pulldown', 'pullup', '引體', 'lat pulldown'], muscle: '背闊肌 Latissimus Dorsi', region: 'BACK' },
  { kw: ['菱形肌', '划船', 'row', '中背', '坐姿划船'], muscle: '菱形肌 Rhomboids', region: 'BACK' },
  { kw: ['斜方肌', 'trap', '聳肩', 'shrug', '頸部', 'neck', '頸後', '頸側', '頸前'], muscle: '斜方肌 Trapezius', region: 'BACK' },
  { kw: ['後三角', '後束', 'rear delt', 'face pull', '臉拉', 'reverse fly', '反向飛鳥'], muscle: '後三角肌 Rear Deltoid', region: 'BACK' },
  { kw: ['豎脊', '下背', '腰椎', 'lower back', 'back extension', '背伸展', '豎脊肌', '硬舉', 'deadlift', 'good morning', '早安式'], muscle: '豎脊肌 Erector Spinae', region: 'BACK' },
  // SHOULDERS
  { kw: ['前三角', '前束', 'front delt', 'anterior delt', '前舉', 'front raise'], muscle: '前三角肌 Anterior Deltoid', region: 'SHOULDERS' },
  { kw: ['側三角', '側束', 'lateral delt', 'side raise', '側平舉', 'lateral raise'], muscle: '側三角肌 Lateral Deltoid', region: 'SHOULDERS' },
  { kw: ['肩推', 'overhead press', 'shoulder press', '肩部推舉', '頸後推舉', '坐姿肩推', '阿諾肩推', 'arnold press'], muscle: '前三角肌 Anterior Deltoid', region: 'SHOULDERS', co: '側三角肌 Lateral Deltoid' },
  // ARMS
  { kw: ['二頭肌', 'biceps', 'bicep curl', '彎舉', 'curl', '錘式', 'hammer', '21s', 'preacher'], muscle: '二頭肌 Biceps Brachii', region: 'ARMS' },
  { kw: ['三頭肌', 'triceps', 'tricep', '三頭下壓', 'pushdown', 'skull crusher', '法式推舉', '三頭伸展', 'tricep extension', '撐體', 'dip', 'dips', '頭上三頭', '頸後臂屈伸'], muscle: '三頭肌 Triceps Brachii', region: 'ARMS' },
  { kw: ['前臂', 'forearm', '腕彎舉', 'wrist curl', '握力'], muscle: '前臂 Forearms', region: 'ARMS' },
  // LEGS
  { kw: ['股四頭', 'quad', '腿屈伸', 'leg extension', '前蹲', 'front squat', '哈克深蹲', 'hack squat'], muscle: '股四頭肌 Quadriceps', region: 'LEGS' },
  { kw: ['腘繩', '腿後', 'hamstring', '腿彎舉', 'leg curl', '羅馬尼亞', 'romanian deadlift', 'rdl', '硬舉'], muscle: '腘繩肌 Hamstrings', region: 'LEGS' },
  { kw: ['臀大肌', '臀肌', 'glute', '臀推', 'hip thrust', '臀橋', 'glute bridge', '臀踢腿', 'kickback', '深蹲', 'squat', '弓步', '跨步', 'lunge', '保加利亞分腿蹲', 'split squat', '腿推舉', 'leg press'], muscle: '臀大肌 Glutes', region: 'LEGS' },
  { kw: ['小腿', 'calf', 'calves', '提踵', 'calf raise', '腓腸'], muscle: '小腿 Calves', region: 'LEGS' },
  { kw: ['髖屈', 'hip flexor', '舉腿', 'leg raise', '懸掛舉腿', 'hanging leg', '抬腿'], muscle: '髖屈肌 Hip Flexors', region: 'LEGS' },
  // CORE
  { kw: ['腹斜肌', '腹斜', 'oblique', '俄羅斯轉體', 'russian twist', '側棒', 'side plank', '側捲', '伐木', 'woodchop'], muscle: '腹斜肌 Obliques', region: 'CORE' },
  { kw: ['腹直肌', '腹肌', 'abs', '仰臥起坐', 'crunch', '捲腹', '棒式', 'plank', '空中腳踏車', '反向捲腹', 'sit-up', 'situp', 'bicycle crunch', 'mountain climber', '登山', '死蟲', 'dead bug', '舉腿', '核心肌群', '核心穩定', '腳趾微踢', 'toe tap', 'leg circle', '腿部畫', 'pike', '單車', 'bicycle', '藥球', 'medicine ball'], muscle: '腹直肌 Rectus Abdominis', region: 'CORE' },
  // CORE - rotation
  { kw: ['脊椎旋轉', 'spinal twist', '軀幹旋轉', 'trunk rotation', 'torso rotation', '轉體', 'rotation', '旋轉', '割草機', 'lawnmower', 'chop', '下砍', '臀部畫圈', 'hip circle', '臀部旋轉', 'twist'], muscle: '腹斜肌 Obliques', region: 'CORE' },
  // BACK - Superman / Cat-Cow / Pull-over
  { kw: ['超人式', 'superman', '貓牛', 'cat-cow', '拱橋', 'bridge', 'pull-over', 'pullover', '肩伸', '橋式'], muscle: '豎脊肌 Erector Spinae', region: 'BACK' },
  // SHOULDERS - kettlebell / clean & jerk / power moves
  { kw: ['壺鈴推舉', 'kettlebell push', '高拉', 'high-pull', '上搏', 'clean ', '抓舉', 'snatch', '急推', 'push press', '爆發推', '肩部推舉', '肩側舉', 'shoulder rotation', '肩部迴旋', 'lateral dumbbell', '壺鈴擺盪', 'kettlebell swing'], muscle: '前三角肌 Anterior Deltoid', region: 'SHOULDERS', co: '側三角肌 Lateral Deltoid' },
  // CORE catch-all
  { kw: ['核心'], muscle: '腹直肌 Rectus Abdominis', region: 'CORE' },
]

// ─── name keyword → equipment hint table ───────────────────────────────────
const EQ_NAME_HINTS = [
  { kw: ['啞鈴', 'dumbbell'], eq: 'Dumbbells / 啞鈴' },
  { kw: ['ez槓', 'ez bar'], eq: 'EZ Bar / EZ槓' },
  { kw: ['槓鈴', 'barbell'], eq: 'Olympic Barbell / 奧林匹克槓鈴' },
  { kw: ['繩索', '纜繩', 'cable', '滑索'], eq: 'Cable Machine / 纜繩機' },
  { kw: ['史密斯', 'smith'], eq: 'Smith Machine / 史密斯機' },
  { kw: ['牧師椅', 'preacher'], eq: 'Preacher Curl Machine / 牧師椅彎舉機' },
  { kw: ['側平舉機', 'machine lateral raise'], eq: 'Shoulder Press Machine / 肩推機' },
  { kw: ['臀推機', 'hip thrust machine'], eq: 'Hip Thrust Machine / 臀推機' },
  { kw: ['雙槓', 'dip'], eq: 'Dip / Pull-up Station / 雙槓引體向上架' },
  { kw: ['壺鈴', 'kettlebell'], eq: 'Dumbbells / 啞鈴' },  // closest analog (no dedicated kettlebell row)
]

// ─── equipment → most likely muscle hints ───────────────────────────────────
const EQ_MUSCLE_HINTS = {
  'Chest Press Machine / 胸推機': ['胸大肌 Pectorals'],
  'Shoulder Press Machine / 肩推機': ['前三角肌 Anterior Deltoid', '側三角肌 Lateral Deltoid'],
  'Lat Pulldown Machine / 滑輪下拉機': ['背闊肌 Latissimus Dorsi'],
  'Seated Row Machine / 坐姿划船機': ['菱形肌 Rhomboids', '背闊肌 Latissimus Dorsi'],
  'Leg Press Machine / 腿推機': ['股四頭肌 Quadriceps', '臀大肌 Glutes'],
  'Leg Curl Machine / 腿彎舉機': ['腘繩肌 Hamstrings'],
  'Leg Extension Machine / 腿屈伸機': ['股四頭肌 Quadriceps'],
  'Hack Squat Machine / 哈克深蹲機': ['股四頭肌 Quadriceps', '臀大肌 Glutes'],
  'Pec Deck / Butterfly Machine / 蝴蝶機': ['胸大肌 Pectorals'],
  'Preacher Curl Machine / 牧師椅彎舉機': ['二頭肌 Biceps Brachii'],
  'Hip Thrust Machine / 臀推機': ['臀大肌 Glutes'],
  'Cable Crossover / 纜繩交叉機': ['胸大肌 Pectorals'],
}

// ─── infer muscles from name + description + steps ─────────────────────────
// Use weighted scoring: name match >> description match > steps match
function inferMuscles(ex) {
  const nameStr = ex.name.toLowerCase()
  const descStr = (ex.description || '').toLowerCase()
  const stepsStr = (ex.steps || []).join(' ').toLowerCase()

  // muscle → score
  const scores = new Map()
  function bump(muscle, n) {
    scores.set(muscle, (scores.get(muscle) || 0) + n)
  }

  for (const { kw, muscle, co } of KEYWORDS) {
    let hit = false
    for (const k of kw) {
      const ks = k.toLowerCase()
      if (nameStr.includes(ks)) { bump(muscle, 5); if (co) bump(co, 3); hit = true; break }
      if (descStr.includes(ks)) { bump(muscle, 2); if (co) bump(co, 1); hit = true; break }
      if (stepsStr.includes(ks)) { bump(muscle, 1); hit = true; break }
    }
  }

  // Equipment hint additively
  for (const eq of ex.equipment_names || []) {
    const hint = EQ_MUSCLE_HINTS[eq]
    if (!hint) continue
    bump(hint[0], 3)
    for (const m of hint.slice(1)) bump(m, 2)
  }

  // Pick: top-scoring as primary (max 2), next as secondary (max 3)
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return { addPrimary: [], addSecondary: [] }

  const topScore = sorted[0][1]
  // primary = top score(s) within 1 point of top; min 1 (so at least one primary)
  // cap at 2 primary unless tie
  const primaryThreshold = Math.max(topScore - 1, 1)
  const primary = sorted.filter(([_, s]) => s >= primaryThreshold).slice(0, 2).map(([m]) => m)
  const remaining = sorted.filter(([m]) => !primary.includes(m))
  const secondary = remaining.slice(0, 3).map(([m]) => m)

  // Remove muscles already present
  const havePrimary = new Set(ex.primary_muscles || [])
  const haveAll = new Set([...(ex.primary_muscles || []), ...(ex.secondary_muscles || [])])
  const addPrimary = primary.filter(m => !havePrimary.has(m))
  const addSecondary = secondary.filter(m => !haveAll.has(m) && !primary.includes(m))

  return { addPrimary, addSecondary }
}

// ─── infer alternatives from same-primary-muscle cohort ─────────────────────
function inferAlternatives(ex, allExercises, exerciseProjection) {
  if (ex.alt_count >= 2) return []

  const myPrimary = new Set(
    (exerciseProjection[ex.id]?.primaryMuscles || ex.primary_muscles || [])
  )
  if (myPrimary.size === 0) return []

  const myType = ex.exercise_type  // COMPOUND / ISOLATION / STRETCH
  const existingAlts = new Set(ex.alternatives || [])
  const candidates = []
  for (const other of allExercises) {
    if (other.id === ex.id) continue
    if (existingAlts.has(other.name)) continue
    const otherPrimary = new Set(
      (exerciseProjection[other.id]?.primaryMuscles || other.primary_muscles || [])
    )
    // shared primary muscle
    const shared = [...myPrimary].some(m => otherPrimary.has(m))
    if (!shared) continue
    // prefer same exercise_type
    const typeMatch = other.exercise_type === myType ? 1 : 0
    // prefer similar isTimeBased
    const timeMatch = other.is_time_based === ex.is_time_based ? 1 : 0
    // shared equipment ?
    const myEq = new Set((ex.equipment_names || []).map(s => s))
    const eqMatch = (other.equipment_names || []).some(e => myEq.has(e)) ? 1 : 0
    candidates.push({ name: other.name, score: typeMatch * 4 + timeMatch * 2 + eqMatch * 1 })
  }
  candidates.sort((a, b) => b.score - a.score)
  // need (2 - alt_count) more
  const need = Math.max(2 - ex.alt_count, 0)
  return candidates.slice(0, need).map(c => c.name)
}

// ─── build backfill ─────────────────────────────────────────────────────────
const exerciseProjection = {}  // id → projected new primary/secondary muscles (used by alt inference)
const backfill = []

// First pass: infer muscles + equipment
for (const ex of exercises) {
  const { addPrimary, addSecondary } = inferMuscles(ex)
  exerciseProjection[ex.id] = {
    primaryMuscles: [...(ex.primary_muscles || []), ...addPrimary],
    secondaryMuscles: [...(ex.secondary_muscles || []), ...addSecondary],
  }

  // equipment inference (fill gaps if exercise has none)
  let addEquipment = []
  if (!ex.equipment_names || ex.equipment_names.length === 0) {
    const haystack = ex.name.toLowerCase()
    for (const { kw, eq } of EQ_NAME_HINTS) {
      if (kw.some(k => haystack.includes(k.toLowerCase()))) {
        addEquipment.push(eq)
        break
      }
    }
    // STRETCH or no match → Bodyweight
    if (addEquipment.length === 0) addEquipment.push('Bodyweight / 自體重量')
  }

  if (addPrimary.length === 0 && addSecondary.length === 0 && addEquipment.length === 0) continue
  backfill.push({
    id: ex.id,
    name: ex.name,
    addPrimaryMuscles: addPrimary,
    addSecondaryMuscles: addSecondary,
    addEquipment,
    addAlternatives: [],
    reasoning: `keyword/equipment-match → ${addPrimary.join(', ') || '(none primary)'}${addSecondary.length ? ` / 2nd: ${addSecondary.join(', ')}` : ''}${addEquipment.length ? ` / eq: ${addEquipment.join(', ')}` : ''}`,
  })
}

// Second pass: infer alternatives (using projected muscles from pass 1)
const byId = {}
for (const e of backfill) byId[e.id] = e
for (const ex of exercises) {
  const alts = inferAlternatives(ex, exercises, exerciseProjection)
  if (alts.length === 0) continue
  if (byId[ex.id]) {
    byId[ex.id].addAlternatives = alts
    byId[ex.id].reasoning += ` | alt: ${alts.length} (same-primary cohort)`
  } else {
    backfill.push({
      id: ex.id,
      name: ex.name,
      addPrimaryMuscles: [],
      addSecondaryMuscles: [],
      addEquipment: [],
      addAlternatives: alts,
      reasoning: `alt: ${alts.length} (same-primary cohort)`,
    })
  }
}

// Stats
const totalNeed = exercises.filter(e => !e.primary_muscles || e.primary_muscles.length === 0).length
const totalAltNeed = exercises.filter(e => e.alt_count < 2).length
const unmatched = []
for (const ex of exercises) {
  const proj = exerciseProjection[ex.id]
  if (!proj.primaryMuscles || proj.primaryMuscles.length === 0) unmatched.push(ex.name)
}

const out = {
  summary: {
    totalExercises: exercises.length,
    exercisesNeedingMuscles: totalNeed,
    exercisesNeedingAlternatives: totalAltNeed,
    backfillEntries: backfill.length,
    stillUnmatchedMuscles: unmatched.length,
  },
  unmatchedMuscleExamples: unmatched.slice(0, 30),
  backfill,
}

fs.writeFileSync(path.join(AUDIT_DIR, 'codex-backfill.json'), JSON.stringify(out, null, 2))
console.log(`✓ Wrote ${backfill.length} entries → codex-backfill.json`)
console.log(`  summary:`, out.summary)
if (unmatched.length > 0) console.log(`  ⚠️ unmatched (${unmatched.length}): first 5 →`, unmatched.slice(0, 5))
