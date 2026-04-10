#!/usr/bin/env python3
"""
generate_exercise_gifs.py
=========================
Generate exercise animation GIFs using SDXL-Turbo (local, no API).

Pipeline:
  SDXL-Turbo (4 steps, guidance_scale=0) — fast, high quality
  → Canny edge extraction → clean black-line-on-white art
  → Bounce-loop GIF assembled with Pillow

Output: public/exercises/exercise_gifs/<folder>/
          frame_01.png, frame_02.png, ...  (individual frames)
          <folder>.gif                      (animated GIF)

Usage:
  python scripts/generate_exercise_gifs.py [--start N]
  --start N  resume from exercise index N (0-based)
"""

import sys, cv2, argparse
import torch
import numpy as np
from pathlib import Path
from diffusers import AutoPipelineForText2Image
from PIL import Image

# ── Config ───────────────────────────────────────────────────────────────────
OUTPUT_DIR = Path("C:/Users/a0927/Desktop/workout/public/exercises/exercise_gifs")
MODEL_ID   = "stabilityai/sdxl-turbo"

IMAGE_W = IMAGE_H = 512
STEPS   = 4
CFG     = 0.0      # SDXL-Turbo: adversarial training, no CFG needed

CANNY_LO   = 50
CANNY_HI   = 140
DILATE_K   = 2     # line thickening pixels

GIF_FRAME  = 700   # ms — regular frame duration
GIF_PAUSE  = 1100  # ms — pause on first / last frame (turnaround)

# ── Prompt style ─────────────────────────────────────────────────────────────
# "pencil sketch" / "sports manga line art" + explicit no-text triggers
# consistently produce a single clean figure on white, no annotation bleed.
STYLE = (
    "pencil sketch illustration, single athlete figure, white background, "
    "black ink lines, clean minimal, no text, no labels, no annotations"
)
# Fixed character — identical across EVERY frame for maximum consistency
CHAR = "athletic male, black shorts, grey sleeveless shirt, short dark hair"


def build_prompt(context: str, frame_desc: str) -> str:
    """~35-45 words total — well within CLIP 77-token limit."""
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
        # pause at seq[0] and seq[n-1] (the turnaround frame)
        dur = [
            GIF_PAUSE if i in (0, n - 1) else GIF_FRAME
            for i in range(len(seq))
        ]

    pal = [f.convert("P", palette=Image.ADAPTIVE, colors=16) for f in seq]
    pal[0].save(
        path,
        save_all=True,
        append_images=pal[1:],
        duration=dur,
        loop=0,
        optimize=True,
    )


# ── Exercise definitions ──────────────────────────────────────────────────────
# "context" — short phrase describing exercise + equipment; stays same per exercise.
# "frames"  — one phrase per frame describing ONLY the pose change.
# Every prompt = STYLE + CHAR + context + frame_desc  (~35-48 words)

EXERCISES = [
    {
        "name_en": "Barbell Bench Press",
        "name_zh": "槓鈴臥推",
        "folder": "barbell_bench_press",
        "context": "bench press, lying on flat bench, Olympic barbell, side view",
        "frames": [
            "arms fully extended above chest, barbell locked out, start",
            "lowering barbell toward lower chest, elbows bent 75 degrees, descent",
            "barbell touching chest, elbows 90 degrees, bottom of rep",
        ],
    },
    {
        "name_en": "Push-up",
        "name_zh": "伏地挺身",
        "folder": "push_up",
        "context": "push-up, hands on floor, bodyweight, side view",
        "frames": [
            "high plank, arms straight, body rigid straight line head to heels, top",
            "elbows bent halfway, chest lowered toward floor, midpoint",
            "chest near floor, elbows fully bent, lowest position",
        ],
    },
    {
        "name_en": "Barbell Back Squat",
        "name_zh": "槓鈴深蹲",
        "folder": "barbell_back_squat",
        "context": "barbell back squat, barbell on upper back, side view",
        "frames": [
            "standing tall, barbell on back, feet shoulder-width, neutral spine",
            "descending, hips back and down, quarter squat",
            "full depth, thighs parallel to floor, knees tracking toes",
            "driving upward, extending hips and knees to stand",
        ],
    },
    {
        "name_en": "Dumbbell Bicep Curl",
        "name_zh": "啞鈴彎舉",
        "folder": "dumbbell_bicep_curl",
        "context": "dumbbell bicep curl, dumbbells in hands, front view",
        "frames": [
            "standing, dumbbells at sides, arms straight, start",
            "curling dumbbells up, elbows bent 90 degrees, halfway",
            "dumbbells at shoulders, biceps contracted, peak",
        ],
    },
    {
        "name_en": "Deadlift",
        "name_zh": "硬舉",
        "folder": "deadlift",
        "context": "barbell deadlift, loaded barbell on floor, side view",
        "frames": [
            "hinging over barbell on floor, gripping bar, back flat, setup",
            "pulling bar off floor, bar at shin level, hips rising",
            "bar at knee height, hips driving forward, mid lift",
            "standing upright, barbell at hips, full lockout",
        ],
    },
    {
        "name_en": "Barbell Row",
        "name_zh": "槓鈴划船",
        "folder": "barbell_row",
        "context": "bent-over barbell row, torso hinged forward, side view",
        "frames": [
            "torso bent forward, barbell hanging at arms length, start",
            "pulling barbell toward abdomen, elbows driving back, midway",
            "barbell at lower chest, elbows behind torso, peak",
        ],
    },
    {
        "name_en": "Dumbbell Shoulder Press",
        "name_zh": "啞鈴肩推",
        "folder": "dumbbell_shoulder_press",
        "context": "dumbbell overhead press, seated, dumbbells, front view",
        "frames": [
            "seated, dumbbells at shoulder height, elbows bent, ready",
            "pressing dumbbells overhead, arms halfway extended",
            "dumbbells overhead, arms straight, full lockout",
        ],
    },
    {
        "name_en": "Lat Pulldown",
        "name_zh": "滑輪下拉",
        "folder": "lat_pulldown",
        "context": "lat pulldown, seated at cable machine, wide bar above, front view",
        "frames": [
            "arms reaching up gripping wide bar fully extended, start",
            "pulling bar downward, elbows bending, bar at chin level",
            "bar pulled to upper chest, elbows fully retracted, peak",
        ],
    },
    {
        "name_en": "Cable Tricep Pushdown",
        "name_zh": "繩索三頭肌下壓",
        "folder": "cable_tricep_pushdown",
        "context": "cable tricep pushdown, rope attachment, side view",
        "frames": [
            "standing, gripping rope at chest height, elbows tucked at sides",
            "pressing rope downward, elbows straightening, midway",
            "arms fully extended downward, triceps locked out",
        ],
    },
    {
        "name_en": "Forearm Plank",
        "name_zh": "前臂棒式",
        "folder": "forearm_plank",
        "context": "forearm plank, core exercise, elbows on floor, side view",
        "frames": [
            "forearm plank, body straight head to heels, correct neutral spine",
            "forearm plank close view, core tight, hips level, sustained hold",
        ],
    },
]


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0, help="Resume from exercise index N")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    gpu_name = torch.cuda.get_device_name(0)
    vram_gb  = torch.cuda.get_device_properties(0).total_memory // 1024 ** 3
    print(f"GPU: {gpu_name} ({vram_gb} GB VRAM)")
    print(f"Loading {MODEL_ID}...\n")

    pipe = AutoPipelineForText2Image.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16,
        variant="fp16",
    )
    pipe = pipe.to("cuda")
    pipe.enable_attention_slicing()

    total = len(EXERCISES)
    for ei, ex in enumerate(EXERCISES):
        if ei < args.start:
            continue

        folder   = OUTPUT_DIR / ex["folder"]
        folder.mkdir(parents=True, exist_ok=True)
        gif_path = folder / f"{ex['folder']}.gif"

        name_display = ex['name_en']
        print(f"[{ei+1:02d}/{total}] {name_display} ({len(ex['frames'])} frames)")

        if gif_path.exists():
            print("  [SKIP] GIF already exists\n")
            continue

        seed   = 4000 + ei * 83   # unique seed per exercise
        frames : list[Image.Image] = []

        for fi, frame_desc in enumerate(ex["frames"], start=1):
            frame_path = folder / f"frame_{fi:02d}.png"

            if frame_path.exists():
                img = Image.open(frame_path).convert("RGB")
                frames.append(img)
                print(f"  frame {fi:02d} → [cached]")
                continue

            prompt = build_prompt(ex["context"], frame_desc)
            gen    = torch.Generator("cuda").manual_seed(seed)

            result = pipe(
                prompt=prompt,
                num_inference_steps=STEPS,
                guidance_scale=CFG,
                width=IMAGE_W,
                height=IMAGE_H,
                generator=gen,
            )

            line_img = to_line_art(result.images[0])
            line_img.save(frame_path, optimize=True)
            frames.append(line_img)
            print(f"  frame {fi:02d} saved")

        make_gif(frames, gif_path)
        print(f"  GIF saved: {gif_path.name}\n")

    print("All done!")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
