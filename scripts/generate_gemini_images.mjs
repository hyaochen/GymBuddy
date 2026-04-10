/**
 * generate_gemini_images.mjs
 * ==========================
 * Generate exercise illustration images using Gemini 2.0 Flash (FREE TIER).
 * Uses native image generation — NOT Imagen 4.0 (which was $0.855/image).
 *
 * Usage:
 *   node scripts/generate_gemini_images.mjs               # default limit 50
 *   node scripts/generate_gemini_images.mjs --limit 5     # test with 5 images
 *   node scripts/generate_gemini_images.mjs --limit 102   # generate all remaining
 *   node scripts/generate_gemini_images.mjs --dry-run     # show what would be generated
 *
 * Safety:
 *   Hard limit: script STOPS (process.exit) when MAX_IMAGES_PER_RUN reached.
 *   No limit can be set above 200 (to prevent accidents).
 *   Skips exercises that already have a PNG file.
 *   Rate limit: 12 seconds between API calls (max 5/min, free tier allows 15/min).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config()

// ── Hard-coded safety ceiling ────────────────────────────────────────────────
const ABSOLUTE_MAX = 200   // Cannot generate more than this in any single run

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const limitArg  = args.find(a => a.startsWith('--limit='))?.split('=')[1]
               ?? args[args.indexOf('--limit') + 1]
const isDryRun  = args.includes('--dry-run')
const rawLimit  = limitArg ? parseInt(limitArg, 10) : 50

if (isNaN(rawLimit) || rawLimit < 1) {
  console.error('--limit must be a positive number')
  process.exit(1)
}
const MAX_IMAGES_PER_RUN = Math.min(rawLimit, ABSOLUTE_MAX)

// ── Config ───────────────────────────────────────────────────────────────────
const API_KEY    = process.env.GEMINI_API_KEY
const MODEL_NAME = 'gemini-2.0-flash-exp-image-generation'  // Free tier, native image gen
const DELAY_MS   = 12_000                       // 12s between calls = max 5/min (safe for free tier)

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'exercises', 'generated')
const BOOK1_JSON = path.join(ROOT, 'prisma', 'book1_exercises_clean.json')
const BOOK2_JSON = path.join(ROOT, 'prisma', 'book2_exercises_clean.json')

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY in .env')
  process.exit(1)
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// ── Slug helper ───────────────────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

// ── Equipment hint ────────────────────────────────────────────────────────────
function equipmentHint(equipment) {
  const eq = (equipment || []).join(' ').toLowerCase()
  if (eq.includes('barbell'))    return 'with loaded barbell'
  if (eq.includes('dumbbell'))   return 'with dumbbells'
  if (eq.includes('cable'))      return 'at cable machine'
  if (eq.includes('kettlebell')) return 'with kettlebell'
  if (eq.includes('band'))       return 'with resistance band'
  if (eq.includes('machine'))    return 'on exercise machine'
  if (eq.includes('bench'))      return 'on bench'
  if (eq.includes('ball'))       return 'with exercise ball'
  return ''
}

// ── View angle hint ───────────────────────────────────────────────────────────
function viewHint(name) {
  const n = name.toLowerCase()
  if (/rotation|twist|crunch|sit.up|lateral raise|front raise/.test(n)) return 'front view'
  return 'side view'
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(exercise) {
  const eq   = equipmentHint(exercise.equipment)
  const view = viewHint(exercise.name_en)
  const parts = [
    'Clean exercise instruction illustration',
    'white background',
    'black ink line art only',
    'one person only',
    `athlete performing ${exercise.name_en}`,
  ]
  if (eq) parts.push(eq)
  parts.push(view, 'anatomically correct', 'full body visible', 'no text', 'no labels', 'professional fitness manual style')
  return parts.join(', ')
}

// ── Load exercises ────────────────────────────────────────────────────────────
function loadExercises() {
  const b1 = JSON.parse(fs.readFileSync(BOOK1_JSON, 'utf8'))
  const b2 = JSON.parse(fs.readFileSync(BOOK2_JSON, 'utf8'))
  return [...b1, ...b2]
}

// ── Check existing images ─────────────────────────────────────────────────────
function getExistingFlatPngs() {
  return new Set(
    fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith('.png') && !fs.statSync(path.join(OUTPUT_DIR, f)).isDirectory())
      .map(f => f.replace(/\.png$/, ''))
  )
}

// ── Gemini image generation ───────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
})

async function generateImage(exercise, outPath) {
  const prompt = buildPrompt(exercise)
  const response = await model.generateContent(prompt)

  for (const part of response.response.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, 'base64')
      fs.writeFileSync(outPath, buffer)
      return { ok: true, prompt }
    }
  }
  // Model responded with text only (image generation not supported / blocked)
  const textPart = response.response.candidates[0].content.parts.find(p => p.text)
  return { ok: false, reason: textPart?.text ?? 'No image in response' }
}

// ── Sleep helper ──────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const allExercises  = loadExercises()
  const existingSlugs = getExistingFlatPngs()

  // Identify exercises that still need images (by slug match to flat PNG)
  const remaining = allExercises.filter(ex => {
    const slug = slugify(ex.name_en)
    return !existingSlugs.has(slug)
  })

  // ── Startup report ────────────────────────────────────────────────────────
  console.log('═'.repeat(60))
  console.log(' Gemini Image Generator — FREE TIER (gemini-2.0-flash-exp)')
  console.log('═'.repeat(60))
  console.log(`  Total exercises (JSON):    ${allExercises.length}`)
  console.log(`  Already have flat PNG:     ${existingSlugs.size}`)
  console.log(`  Remaining to generate:     ${remaining.length}`)
  console.log(`  ⛔ THIS RUN HARD LIMIT:   ${MAX_IMAGES_PER_RUN} images`)
  console.log(`  Rate limit:               ${DELAY_MS / 1000}s between calls`)
  console.log(`  Estimated time:           ~${Math.ceil(MAX_IMAGES_PER_RUN * DELAY_MS / 60000)} minutes`)
  console.log(`  Model:                    ${MODEL_NAME} (FREE tier)`)
  console.log(`  Cost estimate:            $0 (free tier)`)
  if (isDryRun) {
    console.log('\n  [DRY RUN — no API calls will be made]')
  }
  console.log('═'.repeat(60))

  if (remaining.length === 0) {
    console.log('\n✅ All exercises already have images! Nothing to do.')
    return
  }

  // Show which exercises will be generated in this run
  const toGenerate = remaining.slice(0, MAX_IMAGES_PER_RUN)
  console.log(`\nWill generate ${toGenerate.length} of ${remaining.length} remaining exercises:`)
  toGenerate.forEach((ex, i) => {
    console.log(`  [${String(i + 1).padStart(3, '0')}] ${ex.name_en}`)
  })

  if (isDryRun) {
    console.log('\n[Dry run complete. No images generated.]')
    return
  }

  console.log('\nStarting generation...\n')

  let generated = 0
  let failed    = 0

  for (const ex of toGenerate) {
    // ── Hard limit check (safety: also checked here in addition to slice) ──
    if (generated >= MAX_IMAGES_PER_RUN) {
      console.log(`\n⛔  Hard limit reached: ${MAX_IMAGES_PER_RUN} images. Stopping safely.`)
      break
    }

    const slug    = slugify(ex.name_en)
    const outPath = path.join(OUTPUT_DIR, `${slug}.png`)

    // Double-check skip (file might have been created mid-run)
    if (fs.existsSync(outPath)) {
      console.log(`[SKIP] ${ex.name_en}`)
      continue
    }

    process.stdout.write(`[${String(generated + 1).padStart(3, '0')}/${toGenerate.length}] ${ex.name_en} ... `)

    try {
      const result = await generateImage(ex, outPath)
      if (result.ok) {
        generated++
        const size = Math.round(fs.statSync(outPath).size / 1024)
        console.log(`✓ saved (${size} KB)`)
      } else {
        failed++
        console.log(`✗ FAILED: ${result.reason?.slice(0, 80)}`)
        // If model doesn't support image generation, stop early
        if (result.reason?.includes('not supported') || result.reason?.includes('responseModalities')) {
          console.error('\n⛔ Model does not support image generation. Check model name.')
          process.exit(1)
        }
      }
    } catch (err) {
      failed++
      console.log(`✗ ERROR: ${err.message?.slice(0, 80)}`)
      // Rate limit error — wait longer
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        console.log('  ⏳ Rate limit hit. Waiting 60s...')
        await sleep(60_000)
        continue
      }
    }

    // Delay between requests (skip delay after last item)
    if (generated + failed < toGenerate.length) {
      await sleep(DELAY_MS)
    }
  }

  // ── Final report ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60))
  console.log(`  ✅ Generated:   ${generated} images`)
  console.log(`  ✗  Failed:     ${failed} images`)
  console.log(`  📂 Output:     ${OUTPUT_DIR}`)
  const totalNow = existingSlugs.size + generated
  const stillLeft = remaining.length - generated
  console.log(`  📊 Total PNG:  ${totalNow} / ${allExercises.length} exercises`)
  if (stillLeft > 0) {
    console.log(`  ⏭  Still left: ${stillLeft} exercises — re-run to continue`)
  } else {
    console.log(`  🎉 All exercises now have images!`)
  }
  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
