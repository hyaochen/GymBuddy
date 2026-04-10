"""
extract_pdf_steps.py
Reads both PDF books with PyMuPDF and tries to extract per-exercise step text.
Outputs scripts/exercise_steps.json as a mapping of:
  exercise_name_en -> { steps: [...], notes: [...] }

Strategy:
  1. Extract all text from both PDFs
  2. Try to match known exercise names (from _final_master_list_snapshot.json)
  3. Pull the surrounding numbered-list text as steps
  4. For exercises without matches, flag them so prompts use generic steps
"""

import fitz  # PyMuPDF
import json
import re
import os

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_PATHS  = [
    os.path.join(BASE_DIR, "photo", "BOOK.pdf"),
    os.path.join(BASE_DIR, "photo", "肌力訓練.pdf"),
]
LIST_PATH  = os.path.join(BASE_DIR, "scripts", "_final_master_list_snapshot.json")
OUT_PATH   = os.path.join(BASE_DIR, "scripts", "exercise_steps.json")

# ── Load exercise names ────────────────────────────────────────────────────
with open(LIST_PATH, "r", encoding="utf-8") as f:
    master_list = json.load(f)

exercises = {ex["name_en"].lower(): ex for ex in master_list}
zh_to_en  = {ex["name_zh"]: ex["name_en"] for ex in master_list}

# ── Extract all text from PDFs ────────────────────────────────────────────
def extract_text_from_pdf(path):
    if not os.path.exists(path):
        print(f"  [SKIP] {path} not found")
        return ""
    doc  = fitz.open(path)
    text = []
    for page in doc:
        text.append(page.get_text())
    return "\n".join(text)

combined_text = ""
for path in PDF_PATHS:
    print(f"Reading {os.path.basename(path)}...")
    combined_text += extract_text_from_pdf(path) + "\n\n"

print(f"Total text extracted: {len(combined_text):,} chars")

# ── Split into paragraphs ─────────────────────────────────────────────────
paragraphs = [p.strip() for p in re.split(r'\n{2,}', combined_text) if p.strip()]

# ── Try to match exercise sections ────────────────────────────────────────
def extract_numbered_steps(text_block):
    """Extract lines that look like numbered steps."""
    lines  = text_block.split("\n")
    steps  = []
    for line in lines:
        line = line.strip()
        if re.match(r'^[\d①②③④⑤⑥⑦⑧⑨]+[\.\)、]?\s+\S', line):
            # Clean up step number
            step = re.sub(r'^[\d①②③④⑤⑥⑦⑧⑨]+[\.\)、]?\s*', '', line).strip()
            if len(step) > 5:
                steps.append(step)
    return steps

results = {}

for para in paragraphs:
    # Check if this paragraph contains a known exercise name (Chinese or English)
    matched_en = None
    for zh, en in zh_to_en.items():
        if zh in para:
            matched_en = en
            break
    if matched_en is None:
        for en_key in exercises:
            if en_key in para.lower():
                matched_en = exercises[en_key]["name_en"]
                break

    if matched_en:
        if matched_en not in results:
            results[matched_en] = {"steps": [], "notes": [], "source_text": ""}
        steps = extract_numbered_steps(para)
        if steps:
            results[matched_en]["steps"].extend(steps)
        # Grab any note-like sentences
        note_lines = [l.strip() for l in para.split("\n")
                      if len(l.strip()) > 10 and not re.match(r'^[\d①-⑨]', l.strip())]
        results[matched_en]["notes"].extend(note_lines[:3])
        results[matched_en]["source_text"] = para[:500]

# Deduplicate steps
for name in results:
    results[name]["steps"] = list(dict.fromkeys(results[name]["steps"]))[:8]
    results[name]["notes"] = list(dict.fromkeys(results[name]["notes"]))[:5]

# Report
print(f"\n=== Extraction Results ===")
print(f"Exercises with extracted steps: {len(results)} / {len(master_list)}")
matched_names = sorted(results.keys())
for name in matched_names[:20]:
    print(f"  ✓ {name}: {len(results[name]['steps'])} steps")
unmatched = [ex["name_en"] for ex in master_list if ex["name_en"] not in results]
print(f"\nUnmatched ({len(unmatched)}): {unmatched[:10]} ...")

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\n✅ Saved to {OUT_PATH}")
