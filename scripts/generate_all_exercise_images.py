#!/usr/bin/env python3
"""
generate_all_exercise_images.py
================================
Generate one representative line-art image per exercise (178 total),
then optionally expand to multi-frame GIFs.

Quality improvements over previous script:
- Simplified, specific prompt: removes ambiguous "flat grey fill" which caused ghost anatomy
- "one person only, full body visible" to prevent duplicates
- 6 inference steps (vs 4) for better anatomy
- 768x768 → faster than 1024x1024 (~60% time saving) while retaining quality
- No Canny post-processing by default (FLUX line art is clean enough)

Usage:
  # Phase 1: one image per exercise
  python scripts/generate_all_exercise_images.py

  # Phase 2: add multi-frame GIFs (after reviewing phase 1 results)
  python scripts/generate_all_exercise_images.py --phase gif

  # Test single exercise
  python scripts/generate_all_exercise_images.py --only "Push-up"

  # Skip already-generated
  python scripts/generate_all_exercise_images.py --start 50
"""

import sys, cv2, argparse, re, json
import torch, numpy as np
from pathlib import Path
from diffusers import FluxPipeline
from PIL import Image

# ── Config ───────────────────────────────────────────────────────────────────
OUTPUT_DIR = Path("C:/Users/a0927/Desktop/workout/public/exercises/generated")
MODEL_ID   = "black-forest-labs/FLUX.1-schnell"

IMAGE_W = IMAGE_H = 768    # 768 is faster than 1024, still sharp
STEPS   = 6                # 6 steps: better anatomy than 4, still fast enough
CFG     = 0.0

GIF_FRAME  = 700
GIF_PAUSE  = 1100

# ── Prompt template ──────────────────────────────────────────────────────────
# Key changes vs previous:
#  - Removed "flat grey fill" (was causing ghost shadow bodies)
#  - "one person only" is the most critical phrase to prevent duplicates
#  - Simple direct language, no style-heavy keywords that confuse FLUX
STYLE   = "exercise instruction illustration, white background, black ink line art, one person only"
NO_BAD  = "clean pose, full body in frame, no text, no labels, no duplicate figures"

def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")

def equipment_hint(equipment: list[str]) -> str:
    """Return short equipment context from DB equipment list."""
    eq_str = " ".join(equipment).lower()
    if "barbell" in eq_str:    return "with loaded barbell"
    if "dumbbell" in eq_str:   return "holding dumbbells"
    if "cable" in eq_str:      return "at cable machine"
    if "kettlebell" in eq_str: return "holding kettlebell"
    if "band" in eq_str:       return "with resistance band"
    if "machine" in eq_str:    return "on exercise machine"
    if "bench" in eq_str:      return "on bench"
    if "ball" in eq_str:       return "with exercise ball"
    return ""                  # bodyweight: no extra hint

def view_hint(name: str) -> str:
    """Best camera angle for this exercise type."""
    n = name.lower()
    if any(k in n for k in ["row", "pull", "curl", "press", "squat", "lunge",
                              "deadlift", "plank", "push", "hinge", "hip thrust",
                              "glute bridge", "step up", "rollout"]):
        return "side view"
    if any(k in n for k in ["lateral raise", "front raise", "rotation", "twist",
                              "crunch", "sit-up", "sit up"]):
        return "front view"
    return "side view"   # default

def build_single_prompt(name_en: str, equipment: list[str]) -> str:
    eq   = equipment_hint(equipment)
    view = view_hint(name_en)
    parts = [STYLE, f"athlete performing {name_en}"]
    if eq:   parts.append(eq)
    parts += [view, NO_BAD]
    return ", ".join(parts)

# ── 3-frame GIF prompts ───────────────────────────────────────────────────────
GIF_FRAME_TEMPLATES = {
    # Movement phase descriptions for common exercise patterns
    "default": [
        "starting position, relaxed ready stance",
        "mid movement, peak muscle engagement",
        "end position, full range of motion completed",
    ],
    "press": [
        "bottom position, arms bent, weight at chest level",
        "halfway up, arms partially extended",
        "top position, arms fully extended overhead or forward, lockout",
    ],
    "pull": [
        "arms fully extended, hanging, start position",
        "halfway pulled, elbows bending",
        "fully pulled, elbows behind torso, peak contraction",
    ],
    "squat_hinge": [
        "standing tall, neutral spine, feet shoulder width",
        "halfway down, hips back and lowering",
        "bottom position, thighs parallel to floor or lower",
    ],
    "plank_static": [
        "holding plank position, body straight, core tight",
        "same plank hold, side view showing alignment",
    ],
}

def get_gif_frames(name_en: str) -> list[str]:
    n = name_en.lower()
    if any(k in n for k in ["plank", "hold", "isometric", "static"]): return GIF_FRAME_TEMPLATES["plank_static"]
    if any(k in n for k in ["press", "push", "dip", "raise"]):         return GIF_FRAME_TEMPLATES["press"]
    if any(k in n for k in ["row", "pull", "curl", "chin", "lat"]):    return GIF_FRAME_TEMPLATES["pull"]
    if any(k in n for k in ["squat", "lunge", "step", "deadlift",
                              "hinge", "good morning", "hip thrust",
                              "glute bridge"]):                          return GIF_FRAME_TEMPLATES["squat_hinge"]
    return GIF_FRAME_TEMPLATES["default"]

def build_gif_prompt(name_en: str, equipment: list[str], frame_desc: str) -> str:
    eq   = equipment_hint(equipment)
    view = view_hint(name_en)
    parts = [STYLE, f"athlete performing {name_en}"]
    if eq:   parts.append(eq)
    parts += [frame_desc, view, NO_BAD]
    return ", ".join(parts)

# ── Post-processing (optional Canny) ─────────────────────────────────────────
def to_line_art(pil_img: Image.Image) -> Image.Image:
    arr     = np.array(pil_img.convert("RGB"))
    gray    = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    edges   = cv2.Canny(blurred, 40, 120)
    kernel  = np.ones((2, 2), np.uint8)
    edges   = cv2.dilate(edges, kernel, iterations=1)
    return Image.fromarray((255 - edges).astype(np.uint8)).convert("RGB")

# ── GIF assembly ──────────────────────────────────────────────────────────────
def make_gif(frames: list[Image.Image], path: Path):
    n = len(frames)
    if n == 0: return
    if n == 1:
        seq, dur = frames * 4, [GIF_PAUSE] * 4
    elif n == 2:
        seq = [frames[0], frames[1], frames[0], frames[1]]
        dur = [GIF_PAUSE] * 4
    else:
        fwd = frames
        rev = frames[-2:0:-1]
        seq = fwd + rev
        dur = [GIF_PAUSE if i in (0, n - 1) else GIF_FRAME for i in range(len(seq))]

    seq512 = [f.resize((512, 512), Image.LANCZOS) for f in seq]
    pal    = [f.convert("P", palette=Image.ADAPTIVE, colors=32) for f in seq512]
    pal[0].save(path, save_all=True, append_images=pal[1:],
                duration=dur, loop=0, optimize=True)

# ── Load exercises ────────────────────────────────────────────────────────────
def load_exercises() -> list[dict]:
    root = Path("C:/Users/a0927/Desktop/workout/prisma")
    exercises = []
    for fname in ["book1_exercises_clean.json", "book2_exercises_clean.json"]:
        p = root / fname
        if p.exists():
            with open(p, encoding="utf-8") as f:
                exercises += json.load(f)
    return exercises

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start",   type=int, default=0,  help="Resume from index N")
    parser.add_argument("--only",    type=str, default="", help="Only this exercise name (partial match)")
    parser.add_argument("--phase",   type=str, default="single", choices=["single", "gif"],
                        help="single=one image per exercise, gif=multi-frame GIF")
    parser.add_argument("--canny",   action="store_true", help="Apply Canny edge post-processing")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    exercises = load_exercises()
    print(f"Loaded {len(exercises)} exercises")

    print(f"GPU: {torch.cuda.get_device_name(0)} ({torch.cuda.get_device_properties(0).total_memory//1024**3} GB)")
    print(f"Loading {MODEL_ID}...")
    pipe = FluxPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()
    print("Model ready.\n")

    total = len(exercises)
    for ei, ex in enumerate(exercises):
        if ei < args.start: continue
        name_en = ex["name_en"]
        if args.only and args.only.lower() not in name_en.lower(): continue

        slug    = slugify(name_en)
        eq      = ex.get("equipment", [])
        folder  = OUTPUT_DIR / slug
        folder.mkdir(parents=True, exist_ok=True)

        print(f"[{ei+1:03d}/{total}] {name_en}")

        if args.phase == "single":
            out_path = folder / "preview.png"
            if out_path.exists():
                print("  [SKIP] preview.png exists\n")
                continue

            prompt = build_single_prompt(name_en, eq)
            print(f"  prompt: {prompt[:100]}...")
            gen    = torch.Generator().manual_seed(42 + ei * 97)

            result = pipe(
                prompt=prompt,
                num_inference_steps=STEPS,
                guidance_scale=CFG,
                width=IMAGE_W, height=IMAGE_H,
                max_sequence_length=256,
                generator=gen,
            )
            img = result.images[0]
            if args.canny:
                img = to_line_art(img)
            img.save(out_path, optimize=True)
            print(f"  saved: {out_path.name}\n")

        elif args.phase == "gif":
            gif_path = folder / f"{slug}.gif"
            if gif_path.exists():
                print("  [SKIP] gif exists\n")
                continue

            frame_descs = get_gif_frames(name_en)
            frames: list[Image.Image] = []

            for fi, frame_desc in enumerate(frame_descs, start=1):
                fp = folder / f"frame_{fi:02d}.png"
                if fp.exists():
                    frames.append(Image.open(fp).convert("RGB"))
                    print(f"  frame {fi} [cached]")
                    continue

                prompt = build_gif_prompt(name_en, eq, frame_desc)
                gen    = torch.Generator().manual_seed(1000 + ei * 97 + fi * 13)
                print(f"  frame {fi} generating...", end="", flush=True)
                result = pipe(
                    prompt=prompt,
                    num_inference_steps=STEPS,
                    guidance_scale=CFG,
                    width=IMAGE_W, height=IMAGE_H,
                    max_sequence_length=256,
                    generator=gen,
                )
                img = result.images[0]
                if args.canny:
                    img = to_line_art(img)
                img.save(fp, optimize=True)
                frames.append(img)
                print(" done")

            make_gif(frames, gif_path)
            print(f"  GIF: {gif_path.name}\n")

    print(f"\nDone! Output: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
