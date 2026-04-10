"""
build_gif_prompts.py
Builds per-frame prompts for every exercise in the master list.
For exercises found in the PDF: uses extracted steps to define frames.
For unmatched exercises: uses a smart generic template based on type + equipment.

Output: scripts/gif_prompts.json
  {
    "exercise_name_en": {
      "frames": [
        { "frame_num": 1, "label": "Starting Position", "prompt": "..." },
        ...
      ],
      "negative_prompt": "...",
      "num_frames": 3
    }
  }
"""

import json
import os
import re

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST_PATH  = os.path.join(BASE_DIR, "scripts", "_final_master_list_snapshot.json")
STEPS_PATH = os.path.join(BASE_DIR, "scripts", "exercise_steps.json")
OUT_PATH   = os.path.join(BASE_DIR, "scripts", "gif_prompts.json")

with open(LIST_PATH,  "r", encoding="utf-8") as f: master = json.load(f)
with open(STEPS_PATH, "r", encoding="utf-8") as f: steps_db = json.load(f)

# ══════════════════════════════════════════════════════════════════════════════
# STYLE CONFIG
# ══════════════════════════════════════════════════════════════════════════════
STYLE_BASE = (
    "line drawing, ink sketch, black and white illustration, "
    "exercise anatomy diagram, single figure, white background, "
    "no color, bold clean outlines, technical illustration, "
    "sports medicine illustration, precise anatomy, "
    "no shading, no fill, pencil sketch style"
)

NEG_PROMPT = (
    "multiple arms, extra limbs, duplicate body parts, multiple heads, "
    "blurry, deformed, disfigured, bad anatomy, extra fingers, "
    "color, colorful, photorealistic, 3d render, shadow, gradient, "
    "dark background, text, watermark, logo, signature, "
    "realistic, photograph, noise, grain"
)

# ══════════════════════════════════════════════════════════════════════════════
# GENERIC FRAME TEMPLATES  (for unmatched exercises)
# ══════════════════════════════════════════════════════════════════════════════
GENERIC_BY_TYPE = {
    "COMPOUND": [
        "starting position, standing upright, holding {equip}, neutral spine",
        "descent phase, controlled movement, {equip} engaged, muscles under tension",
        "peak contraction, full range of motion, {equip} at work, muscles maximally engaged",
    ],
    "ISOLATION": [
        "starting position, single muscle group prepared, {equip} in hand",
        "mid-movement, isolated muscle contracting, {equip} in motion",
        "peak contraction, full squeeze, {equip} at endpoint",
    ],
    "STRETCH": [
        "neutral starting position, relaxed alignment, {equip}",
        "gradual stretch initiation, lengthening movement",
        "full stretch position, maximum range, held pose",
    ],
}

# Equipment descriptors for prompts
EQUIP_DESC = {
    "Olympic Barbell": "barbell",
    "EZ Bar": "EZ curl bar",
    "Dumbbells": "pair of dumbbells",
    "Cable Machine": "cable pulley handle",
    "Lat Pulldown Machine": "lat pulldown bar and machine",
    "Seated Row Machine": "seated row cable handle",
    "Leg Curl Machine": "leg curl machine pad",
    "Leg Extension Machine": "leg extension machine pad",
    "Hack Squat Machine": "hack squat machine",
    "Chest Press Machine": "chest press machine handles",
    "Shoulder Press Machine": "shoulder press machine handles",
    "Pec Deck Machine": "pec deck handles",
    "Calf Raise Machine": "standing calf raise platform",
    "Pull-up Bar": "overhead pull-up bar",
    "Dip Station": "parallel dip bars",
    "Flat Bench": "flat bench",
    "Incline Bench": "incline bench at angle",
    "Bodyweight": "no equipment",
}

# ══════════════════════════════════════════════════════════════════════════════
# SPECIFIC FRAME DEFINITIONS for major exercises
# (High quality, biomechanically precise)
# ══════════════════════════════════════════════════════════════════════════════
SPECIFIC_FRAMES = {
    "Barbell Bench Press": [
        "person lying on flat bench, feet flat on floor, barbell at arms length above chest, straight arms, starting position",
        "person on flat bench, barbell being lowered toward chest, elbows at 45 degrees, controlled descent",
        "person on flat bench, barbell touching lower chest, elbows bent, bottom position",
        "person on flat bench, pressing barbell back up, arms extending, returning to start",
    ],
    "Incline Barbell Bench Press": [
        "person lying on incline bench at 45 degrees, barbell above upper chest, arms extended",
        "person on incline bench, lowering barbell toward upper chest, elbows flared",
        "person on incline bench, barbell at upper chest level, bottom position",
    ],
    "Dumbbell Bench Press": [
        "person lying on flat bench, holding two dumbbells above chest, arms extended, starting",
        "person on flat bench, lowering dumbbells outward to sides, elbows bent",
        "person on flat bench, dumbbells at chest level, elbows bent outward",
        "person on flat bench, pressing dumbbells back up, arms extending",
    ],
    "Dumbbell Fly": [
        "person lying on flat bench, arms extended above chest holding dumbbells, palms facing in",
        "person on flat bench, lowering dumbbells in wide arc to sides, arms slightly bent",
        "person on flat bench, dumbbells at chest height in wide position, chest fully stretched",
        "person on flat bench, bringing dumbbells back up in arc, squeezing chest",
    ],
    "Push-up": [
        "person in plank position, hands shoulder width apart, arms straight, body straight line",
        "person lowering body toward floor, elbows bending, chest approaching ground",
        "person at bottom of push-up, chest near floor, elbows bent 90 degrees",
        "person pushing back up, arms extending, returning to plank",
    ],
    "Pec Deck Fly": [
        "person seated upright in pec deck machine, arms wide open, elbows at shoulder height",
        "person in pec deck, bringing handles together in arc in front of chest",
        "person in pec deck, handles meeting at center, chest fully contracted",
    ],
    "Pull-up": [
        "person hanging from pull-up bar, arms fully extended overhead, dead hang",
        "person pulling body upward, elbows bending, chin approaching bar",
        "person at top of pull-up, chin above bar, elbows fully bent",
        "person lowering back down slowly, arms extending",
    ],
    "Lat Pulldown": [
        "person seated at lat pulldown machine, arms extended overhead gripping wide bar",
        "person pulling bar down toward collarbone, elbows driving back and down",
        "person with bar at collarbone level, elbows fully retracted, lats contracted",
        "person allowing bar to return upward, arms extending overhead",
    ],
    "Seated Cable Row": [
        "person seated with legs extended, leaning forward gripping cable handle, arms extended",
        "person pulling cable handle toward abdomen, torso upright, elbows driving back",
        "person with cable handle at abdomen, elbows fully retracted, back squeezed",
        "person extending arms forward slowly, returning to start",
    ],
    "Barbell Row": [
        "person bent forward at hips, barbell hanging at arms length, back parallel to floor",
        "person pulling barbell up toward lower ribcage, elbows driving up and back",
        "person with barbell touching lower ribcage, elbows high, back contracted",
        "person lowering barbell back down in controlled manner",
    ],
    "Deadlift": [
        "person standing over barbell, hips hinged, back flat, hands gripping bar, starting position",
        "person lifting barbell from floor, legs driving, hips and shoulders rising together",
        "person standing upright, barbell at hip level, hips locked out, shoulders back",
        "person lowering barbell back toward floor, hips hinging backwards",
    ],
    "Romanian Deadlift": [
        "person standing holding barbell at hips, slight knee bend, neutral spine",
        "person hinging forward at hips, barbell sliding down thighs, hamstrings stretching",
        "person in hinge position, barbell near floor, maximum hamstring stretch",
        "person driving hips forward to return upright, squeezing glutes",
    ],
    "Back Squat": [
        "person standing with barbell on upper traps, feet shoulder-width apart, starting position",
        "person beginning squat descent, hips hinging back, knees tracking toes",
        "person at bottom of squat, thighs parallel to floor or below, back straight",
        "person driving through heels returning to standing, glutes contracting",
    ],
    "Overhead Barbell Press": [
        "person standing holding barbell at shoulder level, elbows forward, feet shoulder width",
        "person pressing barbell upward, arms extending overhead",
        "person with barbell fully overhead, arms locked out, body straight",
        "person lowering barbell back to shoulders in controlled descent",
    ],
    "Dumbbell Lateral Raise": [
        "person standing holding dumbbells at sides, slight forward lean, palms facing in",
        "person raising dumbbells out to sides, arms slightly bent throughout",
        "person with dumbbells at shoulder height, arms extended horizontally",
        "person lowering dumbbells back to sides slowly",
    ],
    "Barbell Bicep Curl": [
        "person standing holding barbell at thighs, palms forward, arms straight",
        "person curling barbell upward, elbows anchored at sides, forearms rising",
        "person with barbell at shoulder height, biceps fully contracted",
        "person lowering barbell back down slowly, fighting gravity",
    ],
    "Dumbbell Hammer Curl": [
        "person standing holding dumbbells at sides, palms facing each other (neutral grip)",
        "person curling one dumbbell upward, neutral grip maintained, elbow fixed",
        "person with dumbbell at shoulder, neutral grip, peak contraction",
    ],
    "Hack Squat": [
        "person on hack squat machine, pad on shoulders, feet on platform, standing position",
        "person lowering on hack squat, knees bending, descending",
        "person at bottom of hack squat, thighs parallel or below, machine bent",
        "person pushing platform up, legs extending, returning to top",
    ],
    "Leg Press": [
        "person seated in leg press machine, feet on platform, legs extended",
        "person lowering platform, knees bending toward chest",
        "person at bottom, knees at 90 degrees near chest",
        "person pressing platform away, legs extending back to start",
    ],
    "Leg Curl": [
        "person lying face-down on leg curl machine, legs straight, pad on ankles",
        "person curling legs upward, heels driving toward glutes",
        "person with heels near glutes, hamstrings fully contracted",
    ],
    "Leg Extension": [
        "person seated in leg extension machine, pad on shins, legs bent",
        "person extending legs upward, straightening knees",
        "person with legs fully extended, quadriceps contracted",
    ],
    "Calf Raise": [
        "person on calf raise machine, heels below platform level, full dorsiflexion",
        "person rising onto tiptoes, calves contracting",
        "person at top of calf raise, maximum plantarflexion, calves fully contracted",
    ],
    "Cable Tricep Pushdown": [
        "person standing at cable machine, gripping bar overhead, elbows at sides bent",
        "person pushing bar downward, elbows anchored, forearms descending",
        "person with bar at thigh level, arms fully extended, triceps contracted",
    ],
    "Skull Crusher": [
        "person lying on flat bench, holding EZ bar above forehead, arms extended",
        "person lowering EZ bar toward forehead by bending elbows",
        "person with bar near forehead, elbows fully bent overhead",
        "person extending arms back up, straightening elbows",
    ],
    "Dips": [
        "person holding parallel bars, arms straight, body suspended, starting position",
        "person lowering body down between bars, elbows bending",
        "person at bottom of dip, elbows at 90 degrees, body lowered",
        "person pushing back up, arms extending, returning to top",
    ],
    "Shoulder Press Machine": [
        "person seated in shoulder press machine, handles at shoulder level, elbows bent",
        "person pressing handles upward overhead, arms extending",
        "person with arms fully extended overhead, shoulders contracted",
    ],
    "Chest Press Machine": [
        "person seated at chest press machine, handles at chest level, elbows bent",
        "person pressing handles forward, arms extending",
        "person with arms fully extended in front, chest contracted",
    ],
    "Plank": [
        "person in forearm plank, body straight line, elbows under shoulders",
        "person holding plank position, core tight, glutes engaged, side view showing straight body",
    ],
    "Mountain Climber": [
        "person in push-up position, arms straight, one knee drawn toward chest",
        "person switching legs, opposite knee driving forward",
        "person in alternating running motion in plank position, both legs shown mid-switch",
    ],
    "Superman": [
        "person lying face down, arms and legs on floor, neutral position",
        "person raising arms and legs off floor simultaneously, back extended",
        "person at top hold, arms forward, legs behind, body formed into arc",
    ],
    "Plank (Side)": [
        "person lying on side, elbow under shoulder, body straight",
        "person lifting hips off floor into side plank, body forming straight diagonal line",
        "person in full side plank, arm extended upward, body straight line",
    ],
}

# ══════════════════════════════════════════════════════════════════════════════
# BUILD PROMPTS
# ══════════════════════════════════════════════════════════════════════════════
results = {}

for ex in master:
    name     = ex["name_en"]
    eq_list  = ex.get("equipment", ["Bodyweight"])
    ex_type  = ex.get("type", "COMPOUND")

    # Equipment string for prompts
    equip_str = ", ".join([EQUIP_DESC.get(e, e.lower()) for e in eq_list])

    # ── Choose frame descriptors ─────────────────────────────────────────
    if name in SPECIFIC_FRAMES:
        frame_descs = SPECIFIC_FRAMES[name]
        source = "specific"
    elif name in steps_db and steps_db[name].get("steps"):
        # Use PDF-extracted steps (keep English-like ones)
        raw_steps = steps_db[name]["steps"]
        # Filter steps to max 5, trim very long ones
        frame_descs = [s[:150] for s in raw_steps[:5] if len(s.strip()) > 10]
        if len(frame_descs) < 2:
            frame_descs = None  # Fall back to generic
        source = "pdf"
    else:
        frame_descs = None
        source = "generic"

    if frame_descs is None:
        template_frames = GENERIC_BY_TYPE.get(ex_type, GENERIC_BY_TYPE["COMPOUND"])
        frame_descs = [t.replace("{equip}", equip_str) for t in template_frames]
        source = "generic"

    # ── Build prompts ────────────────────────────────────────────────────
    frames = []
    for i, desc in enumerate(frame_descs):
        frame_prompt = (
            f"{STYLE_BASE}, "
            f"{name} exercise, {equip_str}, "
            f"{desc.strip()}"
        )
        frames.append({
            "frame_num": i + 1,
            "label": desc.strip()[:60],
            "prompt": frame_prompt,
        })

    results[name] = {
        "name_zh": ex["name_zh"],
        "type": ex_type,
        "equipment": eq_list,
        "num_frames": len(frames),
        "negative_prompt": NEG_PROMPT,
        "frames": frames,
        "prompt_source": source,
    }

# ── Report ───────────────────────────────────────────────────────────────────
sources = {"specific": 0, "pdf": 0, "generic": 0}
for v in results.values():
    sources[v["prompt_source"]] += 1

print("=== Prompt Build Summary ===")
print(f"  Specific (high-quality manual): {sources['specific']}")
print(f"  PDF-extracted:                  {sources['pdf']}")
print(f"  Generic fallback:               {sources['generic']}")
print(f"  Total exercises:                {len(results)}")
total_frames = sum(v["num_frames"] for v in results.values())
print(f"  Total frames to generate:       {total_frames}")
print(f"  Avg frames per exercise:        {total_frames/len(results):.1f}")

# Preview 3 examples
for name in ["Barbell Bench Press", "Plank", "Neck Side Flexion"]:
    if name in results:
        r = results[name]
        print(f"\n--- {name} ({r['num_frames']} frames, source={r['prompt_source']}) ---")
        for fr in r["frames"]:
            print(f"  Frame {fr['frame_num']}: {fr['prompt'][:100]}...")

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\n✅ Saved {len(results)} exercises to {OUT_PATH}")
