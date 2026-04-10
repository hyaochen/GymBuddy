import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_INPUT = "C:/tmp/final_master_list.json";
const DEFAULT_COUNT = 10;
const DEFAULT_START = 0;
const DEFAULT_MODEL = "gpt-image-1";
const DEFAULT_SIZE = "1024x1024";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function nowStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}${m}${day}_${h}${min}`;
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "exercise";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAscii(text) {
  return String(text || "")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPrompt(item) {
  const name = item?.name_en || "Unknown Exercise";
  const equipment = Array.isArray(item?.equipment) && item.equipment.length > 0
    ? item.equipment.join(", ")
    : "Bodyweight";
  const sourcePrompt = toAscii(item?.prompt || "");

  const parts = [
    "Professional minimalist vector line art fitness illustration.",
    "Black lines on white background only.",
    "No text, no labels, no logos, no watermark, no color fills, no gradients, no shadows, no complex background.",
    "Clean SVG-like line quality with clear silhouette and readable joints.",
    "Anatomically accurate: exactly one head, two arms, two hands, two legs, two feet.",
    "No extra limbs, no duplicated body parts, no deformed hands, no distorted joints.",
    "Single subject only, full body visible.",
    "Exercise must show physically plausible posture and correct form.",
    `Exercise: ${name}.`,
    `Equipment to depict clearly and correctly: ${equipment}.`,
    "Camera angle: simple three-quarter or side view to maximize movement clarity.",
    "High-contrast black ink line drawing style.",
  ];

  if (sourcePrompt.length > 0) {
    parts.push(`Original prompt context: ${sourcePrompt.slice(0, 400)}.`);
  }

  return parts.join(" ");
}

async function fetchImageBase64({ apiKey, model, size, prompt }) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n: 1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${text}`);
  }

  const payload = await response.json();
  const first = payload?.data?.[0];
  if (!first) throw new Error("OpenAI API returned empty data array.");

  if (first.b64_json) return first.b64_json;

  if (first.url) {
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) {
      throw new Error(`Could not download image URL: ${imgRes.status}`);
    }
    const arr = new Uint8Array(await imgRes.arrayBuffer());
    return Buffer.from(arr).toString("base64");
  }

  throw new Error("OpenAI API response has neither b64_json nor url.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input || DEFAULT_INPUT;
  const start = Number.parseInt(args.start ?? DEFAULT_START, 10);
  const count = Number.parseInt(args.count ?? DEFAULT_COUNT, 10);
  const model = args.model || DEFAULT_MODEL;
  const size = args.size || DEFAULT_SIZE;
  const outDir = args.out || path.join("public", "exercises", "generated", `openai_preview_${nowStamp()}`);
  const dryRun = Boolean(args["dry-run"]);

  if (Number.isNaN(start) || start < 0) throw new Error("--start must be >= 0");
  if (Number.isNaN(count) || count <= 0) throw new Error("--count must be > 0");

  const raw = await fs.readFile(input, "utf8");
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) throw new Error("Input JSON must be an array.");

  const slice = list.slice(start, start + count);
  if (slice.length === 0) {
    throw new Error(`No records found in range start=${start}, count=${count}.`);
  }

  await fs.mkdir(outDir, { recursive: true });
  const manifest = [];

  console.log(`Input: ${input}`);
  console.log(`Output: ${outDir}`);
  console.log(`Range: [${start}..${start + slice.length - 1}] (${slice.length} items)`);
  console.log(`Model: ${model}, Size: ${size}`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !dryRun) {
    throw new Error("OPENAI_API_KEY is missing. Set it before running this script.");
  }

  for (let i = 0; i < slice.length; i += 1) {
    const item = slice[i];
    const absoluteIndex = start + i;
    const number = String(absoluteIndex + 1).padStart(3, "0");
    const name = item?.name_en || `exercise_${number}`;
    const filename = `${number}_${slugify(name)}.png`;
    const outputPath = path.join(outDir, filename);
    const prompt = buildPrompt(item);

    console.log(`[${i + 1}/${slice.length}] Generating: ${name}`);

    if (dryRun) {
      manifest.push({
        index: absoluteIndex,
        name_en: name,
        output: outputPath,
        prompt_preview: prompt.slice(0, 220),
      });
      continue;
    }

    try {
      const b64 = await fetchImageBase64({ apiKey, model, size, prompt });
      await fs.writeFile(outputPath, Buffer.from(b64, "base64"));
      manifest.push({
        index: absoluteIndex,
        name_en: name,
        output: outputPath,
      });
      await sleep(500);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  Failed: ${message}`);
      manifest.push({
        index: absoluteIndex,
        name_en: name,
        output: outputPath,
        error: message,
      });
    }
  }

  const manifestPath = path.join(outDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Done. Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
