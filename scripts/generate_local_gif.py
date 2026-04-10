"""
generate_local_gif.py
Local exercise GIF generator using:
  - Stable Diffusion 1.5 (base model: lineart/anime fine-tune)
  - Post-processing: threshold → pure B&W line art
  - Optional ControlNet LineArt if available
  - Pillow + imageio for GIF assembly

Usage:
  python scripts/generate_local_gif.py                    # All exercises
  python scripts/generate_local_gif.py --only "Deadlift"  # Single exercise
  python scripts/generate_local_gif.py --batch 5          # First N (test mode)
  python scripts/generate_local_gif.py --resume           # Skip already done
"""

import json
import os
import sys
import argparse
import time
import gc
import traceback

import torch
from diffusers import (
    StableDiffusionPipeline,
    DPMSolverMultistepScheduler,
)
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
import imageio
import numpy as np

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMPTS_PATH = os.path.join(BASE_DIR, "scripts", "gif_prompts.json")
FRAMES_DIR  = os.path.join(BASE_DIR, "public", "exercises", "gif_frames")
GIFS_DIR    = os.path.join(BASE_DIR, "public", "exercises", "gifs")

os.makedirs(FRAMES_DIR, exist_ok=True)
os.makedirs(GIFS_DIR,   exist_ok=True)

# ── Config ─────────────────────────────────────────────────────────────────
# Using a line-art friendly model. Options:
#   "Linaqruf/anything-v3.0"      - anime/lineart style
#   "runwayml/stable-diffusion-v1-5"  - base (needs post-processing)
SD_MODEL_ID  = "runwayml/stable-diffusion-v1-5"
DEVICE       = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE        = torch.float16 if DEVICE == "cuda" else torch.float32

IMG_SIZE     = 512        # SD 1.5 native resolution
STEPS        = 30         # More steps = cleaner lines
GUIDANCE     = 9.0        # Higher CFG = more prompt adherence
GIF_DURATION = 0.8        # Seconds per frame in GIF
SEED_BASE    = 42         # Reproducibility
# Post-processing threshold: pixels darker than this become black
BW_THRESHOLD = 180        # 0-255, lower = more black lines

print(f"Device: {DEVICE}")
print(f"PyTorch: {torch.__version__}")
if DEVICE == "cuda":
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

# ── Post-process to pure line art ────────────────────────────────────────────
def to_lineart(img: Image.Image, threshold: int = BW_THRESHOLD) -> Image.Image:
    """
    Convert any generated image to pure black-on-white line art:
    1. Grayscale
    2. Edge detection / threshold
    3. Invert (black lines on white)
    """
    # 1. Convert to grayscale
    gray = img.convert("L")
    # 2. Increase contrast before thresholding
    enhancer = ImageEnhance.Contrast(gray)
    gray = enhancer.enhance(2.0)
    # 3. Apply edge filter to pull out lines
    edges = gray.filter(ImageFilter.EDGE_ENHANCE_MORE)
    edges = gray.filter(ImageFilter.SHARPEN)
    # 4. Threshold to pure B&W
    bw = edges.point(lambda x: 0 if x < threshold else 255)
    # 5. Return as RGB white background with black lines
    return bw.convert("RGB")

# ── Load pipeline (once) ───────────────────────────────────────────────────
_pipe = None

def get_pipeline():
    global _pipe
    if _pipe is not None:
        return _pipe

    print(f"\n⏳ Loading SD pipeline ({SD_MODEL_ID})...")
    pipe = StableDiffusionPipeline.from_pretrained(
        SD_MODEL_ID,
        torch_dtype=DTYPE,
        safety_checker=None,
        requires_safety_checker=False,
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config,
        use_karras_sigmas=True,
    )
    pipe = pipe.to(DEVICE)

    if DEVICE == "cuda":
        pipe.enable_attention_slicing()
        try:
            pipe.enable_xformers_memory_efficient_attention()
            print("  xformers enabled ✓")
        except Exception:
            print("  xformers not available, using standard attention")

    print("✅ Pipeline loaded!\n")
    _pipe = pipe
    return pipe

# ── Name sanitization ──────────────────────────────────────────────────────
def sanitize_name(name: str) -> str:
    import re
    name = name.lower()
    name = re.sub(r'[^a-z0-9]+', '_', name)
    name = name.strip('_')
    return name[:80]

# ── Generate a single frame ────────────────────────────────────────────────
def generate_frame(pipe, prompt: str, negative_prompt: str, seed: int) -> Image.Image:
    generator = torch.Generator(device=DEVICE).manual_seed(seed)

    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_inference_steps=STEPS,
        guidance_scale=GUIDANCE,
        generator=generator,
        width=IMG_SIZE,
        height=IMG_SIZE,
    )
    raw = result.images[0]
    # Post-process to enforce pure B&W line art
    return to_lineart(raw)

# ── Assemble GIF from frames ───────────────────────────────────────────────
def make_gif(frames: list[Image.Image], out_path: str, duration: float = GIF_DURATION):
    """
    frames: list of PIL Images
    Creates a looping GIF with bounce effect (forward + reverse).
    """
    # Add bounce: forward then reverse
    bounce_frames = frames + frames[-2:0:-1]

    gif_frames = []
    for img in bounce_frames:
        # Convert to palette-mode for smaller file, retain quality
        frame_p = img.convert("P", palette=Image.ADAPTIVE, colors=128)
        gif_frames.append(frame_p)

    gif_frames[0].save(
        out_path,
        save_all=True,
        append_images=gif_frames[1:],
        loop=0,           # infinite loop
        duration=int(duration * 1000),
        optimize=True,
    )

# ── Process one exercise ───────────────────────────────────────────────────
def process_exercise(pipe, name: str, data: dict, out_base: str) -> bool:
    safe  = sanitize_name(name)
    frame_dir = os.path.join(FRAMES_DIR, safe)
    gif_path  = os.path.join(GIFS_DIR, f"{safe}.gif")

    os.makedirs(frame_dir, exist_ok=True)

    frames  = data["frames"]
    neg_p   = data["negative_prompt"]
    images  = []

    for i, frame in enumerate(frames):
        frame_path = os.path.join(frame_dir, f"frame_{i+1:02d}.png")

        # Use a consistent seed offset per frame so frames are related but distinct
        seed = SEED_BASE + hash(name) % 10000 + i * 97

        img = generate_frame(pipe, frame["prompt"], neg_p, seed)
        img.save(frame_path)
        images.append(img)
        print(f"  ✓ frame {i+1}/{len(frames)}: {frame['label'][:50]}")

    make_gif(images, gif_path)
    print(f"  🎞️  GIF saved → {gif_path}")
    return True

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="Generate local exercise GIFs")
    parser.add_argument("--only",   type=str,  default=None,  help="Generate only this exercise name")
    parser.add_argument("--batch",  type=int,  default=None,  help="Only process first N exercises")
    parser.add_argument("--resume", action="store_true", help="Skip exercises with existing GIF")
    args = parser.parse_args()

    with open(PROMPTS_PATH, "r", encoding="utf-8") as f:
        prompts = json.load(f)

    if args.only:
        prompts = {k: v for k, v in prompts.items() if k.lower() == args.only.lower()}
        if not prompts:
            print(f"❌ Exercise '{args.only}' not found in prompts JSON")
            sys.exit(1)

    items = list(prompts.items())
    if args.batch:
        items = items[:args.batch]

    if args.resume:
        items = [
            (name, data) for name, data in items
            if not os.path.exists(os.path.join(GIFS_DIR, f"{sanitize_name(name)}.gif"))
        ]
        print(f"Resume mode: {len(items)} exercises remaining")

    total   = len(items)
    success = 0
    failed  = []

    print(f"\n════════════════════════════════════════")
    print(f"Generating {total} exercise GIFs")
    print(f"════════════════════════════════════════\n")

    pipe = get_pipeline()
    t0   = time.time()

    for idx, (name, data) in enumerate(items):
        print(f"\n[{idx+1}/{total}] {name} ({data['num_frames']} frames)")
        try:
            process_exercise(pipe, name, data, BASE_DIR)
            success += 1
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            traceback.print_exc()
            failed.append(name)
        
        # Progress ETA
        elapsed = time.time() - t0
        per_ex  = elapsed / (idx + 1)
        remain  = per_ex * (total - idx - 1)
        print(f"  ⏱️  {elapsed/60:.1f} min elapsed | ETA {remain/60:.1f} min")

    print(f"\n════════════════════════════════════════")
    print(f"✅ Done: {success}/{total} exercises")
    if failed:
        print(f"❌ Failed ({len(failed)}): {failed}")
    print(f"Total time: {(time.time()-t0)/60:.1f} min")

if __name__ == "__main__":
    main()
