/**
 * generate_missing_images.mjs
 * ===========================
 * Generate images for exercises that are missing from the database.
 * Uses Imagen 4 Standard ($0.04/image) for consistent, high-quality output.
 *
 * Usage:
 *   node scripts/generate_missing_images.mjs              # generate all missing
 *   node scripts/generate_missing_images.mjs --dry-run    # preview only
 *   node scripts/generate_missing_images.mjs --limit 5    # test with 5
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'exercises', 'generated')

const API_KEY = process.env.GEMINI_API_KEY
if (!API_KEY) { console.error('Missing GEMINI_API_KEY in .env'); process.exit(1) }

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1]
             ?? (limitIdx !== -1 ? args[limitIdx + 1] : undefined)
const LIMIT = limitArg ? parseInt(limitArg, 10) : 100

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// ── Missing exercises (from DB query) ─────────────────────────────────────
const MISSING_EXERCISES = [
  // Strength exercises
  { name_en: "Back Extension", name_zh: "背伸展", equipment: ["Back Extension Bench"], type: "ISOLATION", view: "side view", focus: "person lying face down on back extension bench, torso lifting upward, lower back muscles engaged" },
  { name_en: "Incline Cable Fly", name_zh: "上斜繩索飛鳥", equipment: ["Cable Machine", "Incline Bench"], type: "ISOLATION", view: "front view", focus: "person on incline bench pulling cable handles together in fly motion, chest squeezed" },
  { name_en: "Cable Curl", name_zh: "繩索彎舉", equipment: ["Cable Machine"], type: "ISOLATION", view: "side view", focus: "person standing at cable machine curling handle upward, biceps contracting" },
  { name_en: "Machine Lateral Raise", name_zh: "側平舉機", equipment: ["Lateral Raise Machine"], type: "ISOLATION", view: "front view", focus: "person seated on machine with padded arms raising outward to shoulder height" },
  { name_en: "T-bar Row", name_zh: "T槓划船", equipment: ["T-bar Row Machine"], type: "COMPOUND", view: "side view", focus: "person bent over T-bar row setup pulling weight toward chest, back muscles engaged" },
  { name_en: "Arnold Press", name_zh: "阿諾德推舉", equipment: ["Dumbbells"], type: "COMPOUND", view: "front view", focus: "person seated pressing dumbbells overhead while rotating palms from facing body to facing forward" },
  { name_en: "Cable Lateral Raise", name_zh: "繩索側平舉", equipment: ["Cable Machine"], type: "ISOLATION", view: "front view", focus: "person standing next to cable machine raising one arm laterally to shoulder height" },
  { name_en: "Bent-over Rear Delt Fly", name_zh: "俯身啞鈴飛鳥", equipment: ["Dumbbells"], type: "ISOLATION", view: "front view", focus: "person bent over at hips holding dumbbells, arms raising outward targeting rear deltoids" },
  { name_en: "Preacher Curl", name_zh: "斜板彎舉", equipment: ["EZ Bar", "Preacher Bench"], type: "ISOLATION", view: "side view", focus: "person leaning over preacher bench pad curling EZ bar upward, biceps isolated" },
  { name_en: "Concentration Curl", name_zh: "集中彎舉", equipment: ["Dumbbell"], type: "ISOLATION", view: "front view", focus: "person seated on bench, elbow braced against inner thigh, curling dumbbell with one arm" },
  { name_en: "Close-grip Bench Press", name_zh: "窄距臥推", equipment: ["Olympic Barbell", "Flat Bench"], type: "COMPOUND", view: "side view", focus: "person lying on bench pressing barbell with narrow grip, triceps emphasized" },
  { name_en: "Lunges", name_zh: "跨步蹲", equipment: ["Bodyweight"], type: "COMPOUND", view: "side view", focus: "person in lunge position with one leg forward bent at 90 degrees, back knee nearly touching ground" },
  { name_en: "Front Squat", name_zh: "前蹲", equipment: ["Olympic Barbell"], type: "COMPOUND", view: "side view", focus: "person squatting with barbell resting on front shoulders, elbows high, torso upright" },
  { name_en: "Glute Bridge", name_zh: "臀橋", equipment: ["Bodyweight"], type: "ISOLATION", view: "side view", focus: "person lying on back with knees bent, hips raised high off ground, glutes squeezed" },
  { name_en: "Cable Kickback", name_zh: "繩索臀踢腿", equipment: ["Cable Machine"], type: "ISOLATION", view: "side view", focus: "person standing at cable machine with ankle strap, kicking one leg straight back, glute engaged" },
  // Core exercises
  { name_en: "Hanging Leg Raise", name_zh: "懸掛舉腿", equipment: ["Pull-up Bar"], type: "ISOLATION", view: "front view", focus: "person hanging from pull-up bar raising straight legs to horizontal position, core engaged" },
  { name_en: "Reverse Crunch", name_zh: "反向捲腹", equipment: ["Bodyweight"], type: "ISOLATION", view: "side view", focus: "person lying on back lifting bent knees toward chest, lower abs contracting, hips lifting off ground" },
  // Stretch exercises
  { name_en: "Doorway Chest Stretch", name_zh: "胸部門框伸展", equipment: ["Doorframe"], type: "STRETCH", view: "side view", focus: "person standing in doorway with forearm against frame, body leaning forward to stretch chest" },
  { name_en: "Cross-body Shoulder Stretch", name_zh: "肩部交叉伸展", equipment: ["Bodyweight"], type: "STRETCH", view: "front view", focus: "person standing pulling one straight arm across body with other hand, stretching shoulder" },
  { name_en: "Overhead Tricep Stretch", name_zh: "三頭肌頭頂伸展", equipment: ["Bodyweight"], type: "STRETCH", view: "front view", focus: "person with one arm raised overhead and bent behind head, other hand pressing elbow down" },
  { name_en: "Bicep Wall Stretch", name_zh: "二頭肌牆壁伸展", equipment: ["Wall"], type: "STRETCH", view: "side view", focus: "person standing with palm flat against wall behind them, body turning away to stretch bicep" },
  { name_en: "Cat-Cow Stretch", name_zh: "貓牛式", equipment: ["Bodyweight"], type: "STRETCH", view: "side view", focus: "person on hands and knees arching back upward (cat pose) with head down" },
  { name_en: "Child's Pose", name_zh: "嬰兒式", equipment: ["Bodyweight"], type: "STRETCH", view: "side view", focus: "person kneeling with arms extended forward on ground, forehead resting on floor, back rounded" },
  { name_en: "Hip Flexor Lunge Stretch", name_zh: "髖屈肌弓步伸展", equipment: ["Bodyweight"], type: "STRETCH", view: "side view", focus: "person in deep lunge position with back knee on ground, hips pushing forward to stretch hip flexor" },
  { name_en: "Standing Quad Stretch", name_zh: "站立股四頭肌伸展", equipment: ["Bodyweight"], type: "STRETCH", view: "side view", focus: "person standing on one leg, holding other foot behind to buttock, stretching quadriceps" },
  { name_en: "Seated Hamstring Stretch", name_zh: "坐姿腘繩肌伸展", equipment: ["Bodyweight"], type: "STRETCH", view: "side view", focus: "person sitting on floor with one leg extended, reaching toward toes, stretching hamstring" },
  { name_en: "Figure-4 Glute Stretch", name_zh: "臀部梨狀肌伸展", equipment: ["Bodyweight"], type: "STRETCH", view: "front view", focus: "person lying on back with one ankle crossed over opposite knee, pulling thigh toward chest" },
  { name_en: "Standing Calf Stretch", name_zh: "站立小腿伸展", equipment: ["Wall"], type: "STRETCH", view: "side view", focus: "person leaning against wall with one leg stepped back, heel pressed to ground stretching calf" },
  { name_en: "Butterfly Stretch", name_zh: "蝴蝶式大腿內側伸展", equipment: ["Bodyweight"], type: "STRETCH", view: "front view", focus: "person sitting on floor with soles of feet together, knees dropping outward to sides" },
  { name_en: "Supine Spinal Twist", name_zh: "仰臥脊椎旋轉", equipment: ["Bodyweight"], type: "STRETCH", view: "top-down angled view", focus: "person lying on back with one knee crossed over body to opposite side, arms extended in T shape" },
  { name_en: "Neck Side Stretch", name_zh: "頸部側邊伸展", equipment: ["Bodyweight"], type: "STRETCH", view: "front view", focus: "person standing tilting head to one side with hand gently pressing, stretching neck" },
]

// ── Prompt builder (enhanced for Imagen 4) ──────────────────────────────────
function buildPrompt(exercise) {
  const style = [
    "Professional minimalist exercise instruction illustration.",
    "Clean black ink line art on pure white background.",
    "Bold confident strokes, anatomically accurate human figure.",
    "Clearly show the specific exercise position and any equipment used.",
    "Highlight engaged muscle groups with slightly thicker lines.",
    "Single figure, single key position (peak contraction or full stretch).",
    "No text, no labels, no shading, no gradients, no color.",
    "High contrast black and white only.",
    "Professional fitness manual / anatomy textbook quality.",
  ].join(' ')

  const details = [
    `Exercise: ${exercise.name_en}.`,
    exercise.focus,
    `Equipment: ${exercise.equipment.join(', ')}.`,
    `View angle: ${exercise.view}.`,
  ].join(' ')

  return `${style}\n\n${details}`
}

// ── Slug helper ─────────────────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

// ── Gemini Image Generation via SDK ─────────────────────────────────────────
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
})

async function generateImage(exercise, outPath) {
  const prompt = buildPrompt(exercise)

  try {
    const response = await model.generateContent(prompt)
    for (const part of response.response.candidates[0].content.parts) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, 'base64')
        fs.writeFileSync(outPath, buffer)
        return { ok: true, prompt }
      }
    }
    const textPart = response.response.candidates[0].content.parts.find(p => p.text)
    return { ok: false, reason: textPart?.text?.substring(0, 100) ?? 'No image in response', prompt }
  } catch (err) {
    return { ok: false, reason: err.message?.substring(0, 100) ?? 'Unknown error', prompt }
  }
}

// ── Sleep helper ────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const existingSlugs = new Set(
    fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith('.png'))
      .map(f => f.replace(/\.png$/, ''))
  )

  const remaining = MISSING_EXERCISES.filter(ex => !existingSlugs.has(slugify(ex.name_en)))
  const toGenerate = remaining.slice(0, LIMIT)

  console.log('═'.repeat(60))
  console.log(' Imagen 4 Standard — Missing Exercise Image Generator')
  console.log('═'.repeat(60))
  console.log(`  Total missing defined:     ${MISSING_EXERCISES.length}`)
  console.log(`  Already have PNG:          ${MISSING_EXERCISES.length - remaining.length}`)
  console.log(`  Remaining to generate:     ${remaining.length}`)
  console.log(`  This run:                  ${toGenerate.length}`)
  console.log(`  Model:                     gemini-2.5-flash-preview-04-17 (image gen)`)
  console.log(`  Cost per image:            ~$0.02-0.04`)
  console.log(`  Estimated total cost:      ~$${(toGenerate.length * 0.03).toFixed(2)}`)
  console.log(`  Rate limit:                3s between calls`)
  if (isDryRun) console.log('\n  [DRY RUN — no API calls]')
  console.log('═'.repeat(60))

  if (remaining.length === 0) {
    console.log('\n✅ All missing exercises already have images!')
    return
  }

  console.log('\nExercises to generate:')
  toGenerate.forEach((ex, i) => {
    console.log(`  [${String(i + 1).padStart(2, '0')}] ${ex.name_en} (${ex.name_zh})`)
  })

  if (isDryRun) {
    console.log('\n--- Prompt preview (first exercise) ---')
    console.log(buildPrompt(toGenerate[0]))
    console.log('\n[Dry run complete.]')
    return
  }

  console.log('\nStarting generation...\n')
  let success = 0, failed = 0

  for (let i = 0; i < toGenerate.length; i++) {
    const ex = toGenerate[i]
    const slug = slugify(ex.name_en)
    const outPath = path.join(OUTPUT_DIR, `${slug}.png`)

    process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${toGenerate.length}] ${ex.name_en}... `)

    try {
      const result = await generateImage(ex, outPath)
      if (result.ok) {
        console.log('✅')
        success++
      } else {
        console.log(`❌ ${result.reason.substring(0, 80)}`)
        failed++
      }
    } catch (err) {
      console.log(`❌ ${err.message.substring(0, 80)}`)
      failed++
    }

    if (i < toGenerate.length - 1) await sleep(3000)
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`  Done! ✅ ${success} success, ❌ ${failed} failed`)
  console.log(`  Cost: ~$${(success * 0.03).toFixed(2)}`)
  console.log('═'.repeat(60))
}

main().catch(err => { console.error(err); process.exit(1) })
