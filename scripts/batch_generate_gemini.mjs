import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = "imagen-4.0-generate-001"; // Confirmed from listModels
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:predict?key=${API_KEY}`;

// Load master list
const masterList = JSON.parse(fs.readFileSync('C:/tmp/final_master_list.json', 'utf8'));

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), 'public/exercises/generated');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateImage(exercise) {
    const filename = `${exercise.name_en.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(filepath)) {
        console.log(`Skipping ${exercise.name_zh} (Already exists)`);
        return true;
    }

    console.log(`Generating image for: ${exercise.name_zh}...`);

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt: exercise.prompt }]
            })
        });

        const data = await response.json();

        if (data.predictions && data.predictions[0].bytesBase64Encoded) {
            const buffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
            fs.writeFileSync(filepath, buffer);
            console.log(`Successfully generated and saved ${filename}`);
            return true;
        } else {
            console.error(`Failed for ${exercise.name_zh}:`, JSON.stringify(data, null, 2));
            return false;
        }
    } catch (error) {
        console.error(`Fetch error for ${exercise.name_zh}:`, error.message);
        return false;
    }
}

async function batchProcess() {
    console.log(`Starting Full Generation (Imagen 4.0) for all remaining images...`);
    let successCount = 0;
    let attempted = 0;
    let skipped = 0;

    for (const ex of masterList) {
        const filename = `${ex.name_en.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        if (fs.existsSync(filepath)) {
            skipped++;
            continue;
        }

        const success = await generateImage(ex);
        attempted++;
        if (success) {
            successCount++;
        }

        // Rate limiting (Safe 10s delay to avoid 429 errors)
        await new Promise(r => setTimeout(r, 10000));
    }
    console.log(`Full batch finished. New images: ${successCount}. Skipped: ${skipped}. Total attempted in this run: ${attempted}.`);
}

batchProcess();
