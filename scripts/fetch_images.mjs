import fs from 'fs';
import path from 'path';
import https from 'https';

const exercisesToFind = [
    { name: 'Incline Bench Press', category: 'CHEST' },
    { name: 'Dumbbell Bench Press', category: 'CHEST' },
    { name: 'Dumbbell Fly', category: 'CHEST' },
    { name: 'Chest Press', category: 'CHEST' },
    { name: 'Push-up', category: 'CHEST' },
    { name: 'Pec Deck', category: 'CHEST' },
    { name: 'Overhead Press', category: 'SHOULDERS' },
    { name: 'Lateral Raise', category: 'SHOULDERS' },
    { name: 'Shoulder Press', category: 'SHOULDERS' },
    { name: 'Tricep Pushdown', category: 'ARMS' },
    { name: 'Skull Crusher', category: 'ARMS' },
    { name: 'Dips', category: 'ARMS' },
    { name: 'Deadlift', category: 'BACK' },
    { name: 'Pull-up', category: 'BACK' },
    { name: 'Lat Pulldown', category: 'BACK' },
    { name: 'Seated Cable Row', category: 'BACK' },
    { name: 'Barbell Row', category: 'BACK' },
    { name: 'Face Pull', category: 'BACK' },
    { name: 'Bicep Curl', category: 'ARMS' },
    { name: 'Hammer Curl', category: 'ARMS' },
    { name: 'Leg Press', category: 'LEGS' },
    { name: 'Romanian Deadlift', category: 'LEGS' },
    { name: 'Leg Curl', category: 'LEGS' },
    { name: 'Leg Extension', category: 'LEGS' },
    { name: 'Hack Squat', category: 'LEGS' },
    { name: 'Calf Raise', category: 'LEGS' },
    { name: 'Plank', category: 'CORE' },
    { name: 'Crunches', category: 'CORE' },
    { name: 'Cable Crunch', category: 'CORE' },
    { name: 'Russian Twist', category: 'CORE' }
];

const API_BASE = 'https://wger.de/api/v2';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse json from ${url}:\n${data.slice(0, 100)}`));
                }
            });
        }).on('error', reject);
    });
}

function downloadImage(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
}

async function main() {
    console.log('Fetching exercise info from Wger API...');

    // Fetch exerciseinfo
    let exercises = [];
    let nextUrl = `${API_BASE}/exerciseinfo/?limit=500`;

    while (nextUrl) {
        console.log(`Fetching ${nextUrl}...`);
        const res = await fetchJson(nextUrl);
        if (!res.results) break;

        for (const ex of res.results) {
            let name = "Unknown";
            if (ex.translations && ex.translations.length > 0) {
                const enTrans = ex.translations.find(t => t.language === 2);
                if (enTrans) name = enTrans.name;
                else name = ex.translations[0].name;
            }
            exercises.push({ id: ex.id, name });
        }
        nextUrl = res.next;
    }
    console.log(`Loaded ${exercises.length} exercises.`);

    // Fetch images
    let images = [];
    nextUrl = `${API_BASE}/exerciseimage/?limit=500`;

    while (nextUrl) {
        console.log(`Fetching ${nextUrl}...`);
        const res = await fetchJson(nextUrl);
        if (!res.results) break;
        images = images.concat(res.results);
        nextUrl = res.next;
    }
    console.log(`Loaded ${images.length} images.`);

    // Map images to exercises
    const exerciseImageMap = {};
    for (const img of images) {
        if (!exerciseImageMap[img.exercise]) {
            exerciseImageMap[img.exercise] = img.image;
        }
        if (img.exercise_base && !exerciseImageMap[img.exercise_base]) {
            exerciseImageMap[img.exercise_base] = img.image;
        }
    }

    // Match and Download
    const OUT_DIR = 'c:\\Users\\a0927\\Desktop\\workout\\public\\exercise-demos-review';

    for (const target of exercisesToFind) {
        const match = exercises.find(e => e.name && e.name.toLowerCase().includes(target.name.toLowerCase()));

        if (match) {
            console.log(`Found match for ${target.name}: ${match.name} (ID: ${match.id})`);
            const imageUrl = exerciseImageMap[match.id];

            if (imageUrl) {
                console.log(`  -> Found image: ${imageUrl}`);
                const ext = path.extname(new URL(imageUrl).pathname);
                const safeName = target.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const dest = path.join(OUT_DIR, target.category, `${safeName}${ext}`);

                const categoryDir = path.join(OUT_DIR, target.category);
                if (!fs.existsSync(categoryDir)) {
                    fs.mkdirSync(categoryDir, { recursive: true });
                }

                try {
                    await downloadImage(imageUrl, dest);
                    console.log(`  -> Downloaded to ${dest}`);
                } catch (err) {
                    console.error(`  -> Failed to download: ${err.message}`);
                }
            } else {
                console.log(`  -> No image found in API for ${match.name}`);
            }
        } else {
            console.log(`No match found for ${target.name}`);
        }
    }
    console.log('Done.');
}

main().catch(console.error);
