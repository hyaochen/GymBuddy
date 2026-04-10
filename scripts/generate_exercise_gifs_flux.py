#!/usr/bin/env python3
"""
generate_exercise_gifs_flux.py
==============================
Generate exercise animation GIFs using FLUX.1-schnell (local, no API).

Pipeline:
  FLUX.1-schnell (4 steps, guidance_scale=0) — high quality prompt following
  → Canny edge extraction → clean black-line-on-white art
  → Bounce-loop GIF assembled with Pillow

Output: public/exercises/exercise_gifs/<folder>/
          frame_01.png, frame_02.png, ...  (individual frames)
          <folder>.gif                      (animated GIF)

Requirements:
  pip install diffusers transformers accelerate sentencepiece Pillow opencv-python torch

Usage:
  python scripts/generate_exercise_gifs_flux.py [--start N] [--only NAME]
  --start N     resume from exercise index N (0-based)
  --only NAME   generate only the exercise matching folder name
  --no-canny    skip Canny post-processing (keep full-color output)
"""

import sys, cv2, argparse
import torch
import numpy as np
from pathlib import Path
from diffusers import FluxPipeline
from PIL import Image

# ── Config ───────────────────────────────────────────────────────────────────
OUTPUT_DIR = Path("C:/Users/a0927/Desktop/workout/public/exercises/exercise_gifs")
MODEL_ID   = "black-forest-labs/FLUX.1-schnell"

IMAGE_W = IMAGE_H = 1024   # FLUX native resolution
STEPS   = 4
CFG     = 0.0              # FLUX-schnell is distilled — no CFG

CANNY_LO   = 40
CANNY_HI   = 120
DILATE_K   = 2             # line thickening pixels

GIF_FRAME  = 700           # ms — regular frame duration
GIF_PAUSE  = 1100          # ms — pause on first / last frame (turnaround)

# ── Prompt style ─────────────────────────────────────────────────────────────
# FLUX follows text much more accurately than SDXL-Turbo.
# Use explicit technical illustration language.
STYLE = (
    "clean technical line art illustration on white background, "
    "black ink outlines, flat light grey fill for muscle/body areas, "
    "no shading, no hatching, no text, no labels, single figure"
)
CHAR = "athletic male figure, black shorts, grey sleeveless shirt"
NEG_HINT = ""  # FLUX-schnell doesn't support negative prompts (distilled)


def build_prompt(context: str, frame_desc: str) -> str:
    return f"{STYLE}, {CHAR}, {context}, {frame_desc}"


# ── Post-processing ───────────────────────────────────────────────────────────

def to_line_art(pil_img: Image.Image) -> Image.Image:
    """Canny edge → inverted → black lines on white background."""
    arr     = np.array(pil_img.convert("RGB"))
    gray    = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    edges   = cv2.Canny(blurred, CANNY_LO, CANNY_HI)
    if DILATE_K > 1:
        kernel = np.ones((DILATE_K, DILATE_K), np.uint8)
        edges  = cv2.dilate(edges, kernel, iterations=1)
    return Image.fromarray((255 - edges).astype(np.uint8)).convert("RGB")


# ── GIF assembly ──────────────────────────────────────────────────────────────

def make_gif(frames: list[Image.Image], path: Path):
    """Bounce-loop: f1→f2→…→fn→fn-1→…→f2→f1 (no duplicate endpoints)."""
    n = len(frames)
    if n == 0:
        return
    if n == 1:
        seq = frames * 4
        dur = [GIF_PAUSE] * 4
    elif n == 2:
        seq = [frames[0], frames[1], frames[0], frames[1]]
        dur = [GIF_PAUSE] * 4
    else:
        fwd = frames
        rev = frames[-2:0:-1]   # reverse, drop both endpoints
        seq = fwd + rev
        dur = [
            GIF_PAUSE if i in (0, n - 1) else GIF_FRAME
            for i in range(len(seq))
        ]

    # Resize to 512x512 for smaller GIF file size
    seq = [f.resize((512, 512), Image.LANCZOS) for f in seq]
    pal = [f.convert("P", palette=Image.ADAPTIVE, colors=32) for f in seq]
    pal[0].save(
        path,
        save_all=True,
        append_images=pal[1:],
        duration=dur,
        loop=0,
        optimize=True,
    )


# ── Exercise definitions ──────────────────────────────────────────────────────

EXERCISES = [
    {
        "name_en": "Barbell Bench Press",
        "name_zh": "槓鈴臥推",
        "folder": "barbell_bench_press",
        "context": "flat bench press, lying supine on bench, hands gripping barbell above chest, side view",
        "frames": [
            "arms fully extended, barbell locked out directly above chest",
            "elbows bent 75 degrees, barbell halfway down toward chest",
            "barbell touching lower chest, elbows at 90 degrees, bottom position",
        ],
    },
    {
        "name_en": "Push-up",
        "name_zh": "伏地挺身",
        "folder": "push_up",
        "context": "push-up on floor, hands shoulder-width, bodyweight, side view",
        "frames": [
            "top position, arms straight, body rigid from head to heels",
            "midpoint, elbows bent halfway, chest lowering toward floor",
            "bottom position, chest near floor, elbows fully bent",
        ],
    },
    {
        "name_en": "Barbell Back Squat",
        "name_zh": "槓鈴深蹲",
        "folder": "barbell_back_squat",
        "context": "barbell back squat, barbell resting on upper traps, feet shoulder-width, side view",
        "frames": [
            "standing tall, neutral spine, barbell on upper back",
            "quarter squat, hips back and down, torso slightly forward",
            "full depth, thighs parallel to floor, knees tracking over toes",
            "ascending, driving through heels, hips extending upward",
        ],
    },
    {
        "name_en": "Dumbbell Bicep Curl",
        "name_zh": "啞鈴彎舉",
        "folder": "dumbbell_bicep_curl",
        "context": "dumbbell bicep curl, standing, dumbbells in each hand, front view",
        "frames": [
            "arms fully extended at sides, dumbbells hanging, start position",
            "elbows bent 90 degrees, dumbbells at mid-height",
            "dumbbells curled to shoulders, biceps fully contracted, peak",
        ],
    },
    {
        "name_en": "Deadlift",
        "name_zh": "硬舉",
        "folder": "deadlift",
        "context": "conventional barbell deadlift, loaded barbell on floor, side view",
        "frames": [
            "hinged at hips, hands gripping bar, back flat, hips above knees, setup",
            "bar at shin level, hips rising, back maintaining flat position",
            "bar at knee height, hips driving forward, back straightening",
            "fully upright, barbell at hip crease, shoulders back, lockout",
        ],
    },
    {
        "name_en": "Barbell Row",
        "name_zh": "槓鈴划船",
        "folder": "barbell_row",
        "context": "bent-over barbell row, torso parallel to floor, overhand grip, side view",
        "frames": [
            "torso hinged forward, barbell hanging at arms length below chest",
            "pulling barbell toward abdomen, elbows driving back past torso, midway",
            "barbell at lower chest, elbows fully retracted behind torso, peak contraction",
        ],
    },
    {
        "name_en": "Dumbbell Shoulder Press",
        "name_zh": "啞鈴肩推",
        "folder": "dumbbell_shoulder_press",
        "context": "dumbbell overhead press seated on bench, dumbbells at shoulder height, front view",
        "frames": [
            "seated, dumbbells at shoulder level, elbows bent, start",
            "pressing dumbbells upward, arms halfway extended overhead",
            "arms fully extended overhead, dumbbells together above head, lockout",
        ],
    },
    {
        "name_en": "Lat Pulldown",
        "name_zh": "滑輪下拉",
        "folder": "lat_pulldown",
        "context": "lat pulldown machine, seated, gripping wide bar overhead, front view",
        "frames": [
            "arms fully extended overhead gripping wide bar, slight lean back",
            "bar pulled down to chin level, elbows bending and driving down",
            "bar at upper chest, elbows fully pulled down and back, peak",
        ],
    },
    {
        "name_en": "Cable Tricep Pushdown",
        "name_zh": "繩索三頭肌下壓",
        "folder": "cable_tricep_pushdown",
        "context": "cable tricep pushdown with rope attachment, standing, side view",
        "frames": [
            "hands at chest height gripping rope, elbows tucked at sides, start",
            "pressing rope downward, elbows extending halfway",
            "arms fully extended, triceps locked out, rope ends spread apart",
        ],
    },
    {
        "name_en": "Forearm Plank",
        "name_zh": "前臂棒式",
        "folder": "forearm_plank",
        "context": "forearm plank hold, elbows on floor, side view",
        "frames": [
            "forearms on floor, body straight from head to heels, neutral spine, hips level",
            "same position, close-up showing engaged core, flat back, hips not sagging",
        ],
    },
]


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start",    type=int, default=0,  help="Resume from exercise index N")
    parser.add_argument("--only",     type=str, default="", help="Only generate exercise with this folder name")
    parser.add_argument("--no-canny", action="store_true",  help="Skip Canny post-processing")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    gpu_name = torch.cuda.get_device_name(0)
    vram_gb  = torch.cuda.get_device_properties(0).total_memory // 1024 ** 3
    print(f"GPU: {gpu_name} ({vram_gb} GB VRAM)")
    print(f"Loading {MODEL_ID}...")
    print("(Using enable_model_cpu_offload — VRAM usage ~6 GB, slower generation)\n")

    pipe = FluxPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()   # keeps VRAM under 8 GB
    # pipe.enable_sequential_cpu_offload()  # even lower VRAM, even slower

    total = len(EXERCISES)
    for ei, ex in enumerate(EXERCISES):
        if ei < args.start:
            continue
        if args.only and ex["folder"] != args.only:
            continue

        folder   = OUTPUT_DIR / ex["folder"]
        folder.mkdir(parents=True, exist_ok=True)
        gif_path = folder / f"{ex['folder']}.gif"

        print(f"[{ei+1:02d}/{total}] {ex['name_en']} ({len(ex['frames'])} frames)")

        if gif_path.exists():
            print("  [SKIP] GIF already exists\n")
            continue

        seed   = 7000 + ei * 113   # unique seed per exercise
        frames: list[Image.Image] = []

        for fi, frame_desc in enumerate(ex["frames"], start=1):
            frame_path = folder / f"frame_{fi:02d}.png"

            if frame_path.exists():
                img = Image.open(frame_path).convert("RGB")
                frames.append(img)
                print(f"  frame {fi:02d} → [cached]")
                continue

            prompt = build_prompt(ex["context"], frame_desc)
            gen    = torch.Generator().manual_seed(seed + fi)

            print(f"  frame {fi:02d} generating...", end="", flush=True)
            result = pipe(
                prompt=prompt,
                num_inference_steps=STEPS,
                guidance_scale=CFG,
                width=IMAGE_W,
                height=IMAGE_H,
                max_sequence_length=256,
                generator=gen,
            )
            raw_img = result.images[0]

            if args.no_canny:
                out_img = raw_img
            else:
                out_img = to_line_art(raw_img)

            out_img.save(frame_path, optimize=True)
            frames.append(out_img)
            print(" saved")

        make_gif(frames, gif_path)
        print(f"  GIF saved: {gif_path.name}\n")

    print("All done!")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
