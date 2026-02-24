/**
 * update-missing-images.ts
 * Fills gifUrl (YouTube thumbnail) and videoUrl for exercises that are missing them.
 *
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/update-missing-images.ts
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

function ytThumb(videoId: string) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}
function ytUrl(videoId: string) {
    return `https://www.youtube.com/watch?v=${videoId}`
}

// { exerciseName (partial match): videoId }
const videoMap: Record<string, string> = {
    // ── Chest ──────────────────────────────────────────────────────────────
    'Dumbbell Fly':             'eozdVDA78K0',
    'Chest Press Machine':      'JG1PNi_9UUo',
    'Push-up':                  'IODxDxX7oi4',

    // ── Shoulders ──────────────────────────────────────────────────────────
    'Shoulder Press Machine':   'qEwKCR5JCog',
    'Arnold Press':             '6Z15_WdXmVw',
    'Cable Lateral Raise':      'PPdLgAFkEUM',
    'Bent-over Rear Delt Fly':  'ttvfGg9d76c',
    'Machine Lateral Raise':    'qkOZMTbhEcQ',

    // ── Triceps ────────────────────────────────────────────────────────────
    'Skull Crusher':            'd_KZxkY_0cM',
    'Close-grip Bench Press':   'nEF0bv2FW94',

    // ── Biceps ─────────────────────────────────────────────────────────────
    'Barbell Bicep Curl':       'ykJmrZ5v0Oo',
    'Dumbbell Lateral Raise':   '3VcKaXpzqRo',
    'Dumbbell Hammer Curl':     'zC3nLlEvin4',
    'Preacher Curl':            'fIWP-FRFNU0',
    'Concentration Curl':       '0AUGkch3tzc',

    // ── Back ───────────────────────────────────────────────────────────────
    'Dips':                     '2z8JmcrW-As',
    'Straight-arm Lat Pulldown':'il4YULiGJVQ',
    'T-bar Row':                'j3Igk5nyZE4',

    // ── Core ───────────────────────────────────────────────────────────────
    'Plank':                    'pvIjsG5Svck',
    'Crunches':                 'Xyd_fa5zoEU',
    'Cable Crunch':             '2fbujeH3F0E',
    'Russian Twist':            '9mtmGFTIUgg',
    'Hanging Leg Raise':        'hdng3Nm1x_E',
    'Side Plank':               'wqzrb67Dwf8',
    'Reverse Crunch':           'hyv14_1QMVA',

    // ── Legs ───────────────────────────────────────────────────────────────
    'Leg Extension':            'ljO4jkwv8jQ',
    'Leg Curl':                 'ELOCsoDSmrg',
    'Calf Raise':               'c5Kv6-fnTj8',
    'Seated Calf Raise':        'JbyjNymZOt0',
    'Lunges':                   '3XDriUn0udo',
    'Front Squat':              'm4ytaCJZpl0',
    'Glute Bridge':             'wPM8icPu6H8',
    'Seated Leg Curl':          '1Tq3QdYUuHs',
    'Cable Kickback':           'UPbsGzXxHRs',

    // ── Stretch ────────────────────────────────────────────────────────────
    'Doorway Chest Stretch':    'MzrQ43O0U3A',
    'Cross-body Shoulder':      'R7B_mj4KXPU',
    'Overhead Tricep Stretch':  's3upLwS1vFM',
    'Bicep Wall Stretch':       '6ZJUP-sP6bg',
    'Cat-Cow':                  'kqnua4rHVVA',
    "Child's Pose":             'qZ_KpDmD3fE',
    'Hip Flexor Lunge':         'YqF8BgRohhk',
    'Standing Quad':            'OT2hWzNEoWI',
    'Seated Hamstring':         'hE1WDxjRSA4',
    'Figure-4 Glute':           'FNhWHaBUEcs',
    'Standing Calf Stretch':    'gfsBLVtaFGw',
    'Butterfly Stretch':        '6ZZ4AOKK1Ss',
    'Supine Spinal Twist':      '1hL6hpxDzGI',
    'Lat Side Bend':            'x_BdMYUAmFI',
    'Neck Side Stretch':        'gcSZlHFCrNs',
}

function findVideoId(name: string): string | null {
    for (const [key, id] of Object.entries(videoMap)) {
        if (name.includes(key)) return id
    }
    return null
}

async function main() {
    // 1. All exercises missing gifUrl
    const missing = await prisma.exercise.findMany({
        where: { gifUrl: null },
        select: { id: true, name: true, videoUrl: true },
    })
    console.log(`Found ${missing.length} exercises without gifUrl`)

    let updated = 0, skipped = 0

    for (const ex of missing) {
        // If exercise already has a videoUrl, extract the YouTube ID
        let videoId: string | null = null

        if (ex.videoUrl) {
            const m = ex.videoUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
            if (m) videoId = m[1]
        }

        // Otherwise look up from our map
        if (!videoId) videoId = findVideoId(ex.name)

        if (!videoId) {
            console.log(`  SKIP (no match): ${ex.name}`)
            skipped++
            continue
        }

        await prisma.exercise.update({
            where: { id: ex.id },
            data: {
                gifUrl: ytThumb(videoId),
                videoUrl: ex.videoUrl ?? ytUrl(videoId),
            },
        })
        console.log(`  ✓ ${ex.name.substring(0, 40)} → ${videoId}`)
        updated++
    }

    // 2. Also upgrade exercises that have a videoUrl but no gifUrl was set above
    //    (exercises where gifUrl is set to a wger static PNG but has a YouTube videoUrl)
    //    — skip for now; only fill the nulls

    console.log(`\nDone: ${updated} updated, ${skipped} skipped (no video match)`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
