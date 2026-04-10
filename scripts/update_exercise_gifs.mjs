/**
 * update_exercise_gifs.mjs
 * Scans the generated GIFs directory and updates each Exercise record
 * in the database with the gifUrl path.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const GIFS_DIR = path.join(process.cwd(), 'public', 'exercises', 'gifs');

// Sanitize: match the logic in generate_local_gif.py
function sanitizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80);
}

async function main() {
    if (!fs.existsSync(GIFS_DIR)) {
        console.error(`❌ GIFs directory not found: ${GIFS_DIR}`);
        process.exit(1);
    }

    const gifFiles = fs.readdirSync(GIFS_DIR).filter(f => f.endsWith('.gif'));
    console.log(`Found ${gifFiles.length} GIF files.`);

    const exercises = await prisma.exercise.findMany({ select: { id: true, name: true } });
    console.log(`Found ${exercises.length} exercises in DB.`);

    let updated = 0, skipped = 0;

    for (const ex of exercises) {
        const safe = sanitizeName(ex.name);
        const gifFile = `${safe}.gif`;
        const gifPath = `/exercises/gifs/${gifFile}`;
        const fullPath = path.join(GIFS_DIR, gifFile);

        if (!fs.existsSync(fullPath)) {
            skipped++;
            continue;
        }

        try {
            await prisma.exercise.update({
                where: { id: ex.id },
                data: { gifUrl: gifPath },
            });
            updated++;
            process.stdout.write(`\r  Updated: ${updated}`);
        } catch (err) {
            console.error(`\n  ⚠️  Failed to update ${ex.name}: ${err.message}`);
        }
    }

    console.log(`\n\n✅ Updated: ${updated} | Skipped (no GIF): ${skipped}`);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
