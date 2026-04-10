/**
 * fix_snapshot_encoding.mjs
 *
 * Reads the correctly-encoded source master list (C:/tmp/final_master_list.json),
 * injects a global style guide and a cleaned-up, concise English-only prompt
 * into each exercise entry, and writes the result to:
 *   scripts/_final_master_list_snapshot.json
 *
 * The Chinese descriptions inside prompts are REMOVED — the English exercise
 * name + action keyword are now sufficient since we rely on the global guide.
 */

import fs from 'fs';
import path from 'path';

// ──────────────────────────────────────────────
// 1. Global style guide (prepended to every prompt)
// ──────────────────────────────────────────────
const GLOBAL_STYLE = [
    "Professional minimalist vector line art of a fitness exercise illustration.",
    "Style: clean black ink lines on pure white background, bold yet thin strokes.",
    "NO text, NO labels, NO shading, NO gradients, NO complex backgrounds.",
    "Depict the human figure in correct anatomical posture for the specific exercise.",
    "Clearly show any equipment being used (barbell, dumbbell, machine, etc.).",
    "Highlight the primary muscle groups engaged using slightly thicker outlines.",
    "Single continuous scene: show the key movement position (peak contraction or full stretch).",
    "SVG / clean vector illustration aesthetic. High contrast. Minimalist."
].join(" ");

// ──────────────────────────────────────────────
// 2. Helper: generate a clean English-only prompt
// ──────────────────────────────────────────────
function buildPrompt(exercise) {
    const equipmentStr = exercise.equipment
        .map(e => e.split('/')[0].trim()) // keep only the English part
        .join(', ');

    return `${GLOBAL_STYLE} Exercise name: ${exercise.name_en}. Equipment used: ${equipmentStr}. Movement type: ${exercise.type}.`;
}

// ──────────────────────────────────────────────
// 3. Load the UTF-8 source file
// ──────────────────────────────────────────────
const SOURCE = 'C:/tmp/final_master_list.json';
const OUTPUT = path.join(process.cwd(), 'scripts/_final_master_list_snapshot.json');

const raw = fs.readFileSync(SOURCE, 'utf8');
const masterList = JSON.parse(raw);

// ──────────────────────────────────────────────
// 4. Rebuild with clean prompts + global style attached
// ──────────────────────────────────────────────
const fixed = masterList.map(ex => ({
    source: ex.source,
    name_zh: ex.name_zh,
    name_en: ex.name_en,
    type: ex.type,
    equipment: ex.equipment.map(e => e.split('/')[0].trim()), // English part only
    global_style_guide: GLOBAL_STYLE,  // stored for reference
    prompt: buildPrompt(ex)
}));

// ──────────────────────────────────────────────
// 5. Write UTF-8 output
// ──────────────────────────────────────────────
fs.writeFileSync(OUTPUT, JSON.stringify(fixed, null, 2), 'utf8');
console.log(`✅  Done! Fixed ${fixed.length} exercises.`);
console.log(`📄  Output: ${OUTPUT}`);
console.log();
console.log('═══════════════════════════════════');
console.log('         GLOBAL STYLE GUIDE');
console.log('═══════════════════════════════════');
console.log(GLOBAL_STYLE);
