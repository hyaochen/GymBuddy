/**
 * regenerate_book_images.mjs
 * ==========================
 * Regenerate book-scanned and non-standard exercise images with unified style.
 * Uses Gemini 2.5 Flash Image via SDK for consistent line-art output.
 *
 * Usage:
 *   node scripts/regenerate_book_images.mjs              # generate all
 *   node scripts/regenerate_book_images.mjs --dry-run    # preview only
 *   node scripts/regenerate_book_images.mjs --limit 10   # test with 10
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'exercises', 'generated')
const LIST_FILE = '/tmp/regen_list.json'

const API_KEY = process.env.GEMINI_API_KEY
if (!API_KEY) { console.error('Missing GEMINI_API_KEY in .env'); process.exit(1) }

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1]
             ?? (limitIdx !== -1 ? args[limitIdx + 1] : undefined)
const LIMIT = limitArg ? parseInt(limitArg, 10) : 200

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// ── Load exercise list ──────────────────────────────────────────────────────
const exercises = JSON.parse(fs.readFileSync(LIST_FILE, 'utf8'))

// ── Slug helper ─────────────────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

// ── Equipment hint ──────────────────────────────────────────────────────────
function equipmentHint(equipment) {
  const eq = (equipment || []).join(' ').toLowerCase()
  if (eq.includes('barbell')) return 'with loaded barbell'
  if (eq.includes('dumbbell')) return 'with dumbbells'
  if (eq.includes('cable')) return 'at cable machine'
  if (eq.includes('kettlebell')) return 'with kettlebell'
  if (eq.includes('band')) return 'with resistance band'
  if (eq.includes('machine')) return 'on exercise machine'
  if (eq.includes('bench')) return 'on bench'
  if (eq.includes('ball')) return 'with exercise ball'
  if (eq.includes('trx') || eq.includes('suspend')) return 'with suspension trainer (TRX)'
  if (eq.includes('medicine')) return 'with medicine ball'
  if (eq.includes('sandbag')) return 'with sandbag'
  if (eq.includes('plate')) return 'with weight plate'
  return ''
}

// ── View angle hint ─────────────────────────────────────────────────────────
function viewHint(name) {
  const n = name.toLowerCase()
  if (/rotation|twist|crunch|sit.up|lateral raise|front raise|fly|press.up|push.up/.test(n)) return 'front view'
  if (/plank|bridge|extension|curl|squat|lunge|deadlift|row|swing|clean|snatch|press/.test(n)) return 'side view'
  return 'three-quarter view'
}

// ── Prompt builder ──────────────────────────────────────────────────────────
function buildPrompt(exercise) {
  const eq = equipmentHint(exercise.equipment)
  const view = viewHint(exercise.name_en)

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
    eq ? `Equipment: ${exercise.equipment.join(', ')}. Person ${eq}.` : 'Bodyweight exercise, no equipment.',
    `View angle: ${view}.`,
  ].join(' ')

  return `${style}\n\n${details}`
}

// ── Gemini model ────────────────────────────────────────────────────────────
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
        return { ok: true }
      }
    }
    return { ok: false, reason: 'No image in response' }
  } catch (err) {
    return { ok: false, reason: err.message?.substring(0, 80) ?? 'Unknown error' }
  }
}

// ── Sleep helper ────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Filter out exercises that already have a generated PNG
  const existingSlugs = new Set(
    fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith('.png'))
      .map(f => f.replace(/\.png$/, ''))
  )

  const remaining = exercises.filter(ex => !existingSlugs.has(slugify(ex.name_en)))
  const toGenerate = remaining.slice(0, LIMIT)

  console.log('═'.repeat(60))
  console.log(' Book/Legacy Image Regeneration — Unified Line Art Style')
  console.log('═'.repeat(60))
  console.log(`  Total exercises to regen:  ${exercises.length}`)
  console.log(`  Already have generated:    ${exercises.length - remaining.length}`)
  console.log(`  Remaining:                 ${remaining.length}`)
  console.log(`  This run:                  ${toGenerate.length}`)
  console.log(`  Model:                     gemini-2.5-flash-image`)
  console.log(`  Rate limit:                5s between calls`)
  console.log(`  Estimated time:            ~${Math.ceil(toGenerate.length * 5 / 60)} minutes`)
  if (isDryRun) console.log('\n  [DRY RUN — no API calls]')
  console.log('═'.repeat(60))

  if (remaining.length === 0) {
    console.log('\n✅ All exercises already have generated images!')
    return
  }

  console.log(`\nFirst 10 exercises:`)
  toGenerate.slice(0, 10).forEach((ex, i) => {
    console.log(`  [${String(i + 1).padStart(3, '0')}] ${ex.name_en} (${ex.name_zh})`)
  })
  if (toGenerate.length > 10) console.log(`  ... and ${toGenerate.length - 10} more`)

  if (isDryRun) {
    console.log('\n--- Prompt preview ---')
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

    process.stdout.write(`[${String(i + 1).padStart(3, '0')}/${toGenerate.length}] ${ex.name_en}... `)

    const result = await generateImage(ex, outPath)
    if (result.ok) {
      console.log('✅')
      success++
    } else {
      console.log(`❌ ${result.reason}`)
      failed++
    }

    if (i < toGenerate.length - 1) await sleep(5000)
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`  Done! ✅ ${success} success, ❌ ${failed} failed`)
  console.log('═'.repeat(60))
}

main().catch(err => { console.error(err); process.exit(1) })
