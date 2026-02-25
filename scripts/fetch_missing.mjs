import fs from 'fs';
import path from 'path';
import https from 'https';

const missingExercises = [
    { name: 'Dumbbell Fly', category: 'CHEST', altNames: ['Dumbbell Flyes', 'Fly'] },
    { name: 'Chest Press', category: 'CHEST', altNames: ['Machine Chest Press', 'Seated Chest Press', 'Cable Chest Press'] },
    { name: 'Push-up', category: 'CHEST', altNames: ['Push up', 'Push-Up'] },
    { name: 'Pec Deck', category: 'CHEST', altNames: ['Butterfly', 'Pec Dec', 'Machine Fly', 'Lever Pec Deck Fly'] },
    { name: 'Overhead Press', category: 'SHOULDERS', altNames: ['Barbell Overhead Press', 'Military Press', 'Shoulder Press'] },
    { name: 'Lateral Raise', category: 'SHOULDERS', altNames: ['Dumbbell Lateral Raise', 'Side Lateral Raise'] },
    { name: 'Shoulder Press Machine', category: 'SHOULDERS', altNames: ['Machine Shoulder Press', 'Lever Shoulder Press'] },
    { name: 'Tricep Pushdown', category: 'ARMS', altNames: ['Cable Triceps Pushdown', 'Triceps Pushdown', 'Pushdown'] },
    { name: 'Skull Crusher', category: 'ARMS', altNames: ['Lying Triceps Extension', 'EZ Bar Skullcrusher'] },
    { name: 'Hammer Curl', category: 'ARMS', altNames: ['Dumbbell Hammer Curl'] },
    { name: 'Deadlift', category: 'BACK', altNames: ['Barbell Deadlift'] },
    { name: 'Pull-up', category: 'BACK', altNames: ['Pull up', 'Pullups', 'Pull-Up'] },
    { name: 'Lat Pulldown', category: 'BACK', altNames: ['Cable Lat Pulldown', 'Front Pulldown', 'Lat Pull Down'] },
    { name: 'Barbell Row', category: 'BACK', altNames: ['Bent Over Row', 'Barbell Bent Over Row'] },
    { name: 'Romanian Deadlift', category: 'LEGS', altNames: ['RDL', 'Barbell Romanian Deadlift', 'Stiff Leg Deadlift'] },
    { name: 'Leg Extension', category: 'LEGS', altNames: ['Machine Leg Extension', 'Lever Leg Extension'] },
    { name: 'Hack Squat', category: 'LEGS', altNames: ['Machine Hack Squat', 'Sled Hack Squat'] },
    { name: 'Calf Raise', category: 'LEGS', altNames: ['Standing Calf Raise', 'Lever Standing Calf Raise'] },
    { name: 'Crunches', category: 'CORE', altNames: ['Crunch'] },
    { name: 'Cable Crunch', category: 'CORE', altNames: ['Kneeling Cable Crunch'] },
];

const JSON_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
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
                file.close();
                return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(destPath, () => { });
                reject(new Error(`Status ${res.statusCode}`));
                return;
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
    console.log('Fetching exercise DB from GitHub...');
    let exercisesDB;
    try {
        exercisesDB = await fetchJson(JSON_URL);
        console.log(`Loaded ${exercisesDB.length} exercises from GitHub DB.`);
    } catch (e) {
        console.error('Could not fetch JSON. Exiting.', e);
        return;
    }

    const OUT_DIR = 'c:\\Users\\a0927\\Desktop\\workout\\public\\exercise-demos-review';

    for (const target of missingExercises) {
        const tgtName = target.name.toLowerCase();
        const altNames = target.altNames.map(n => n.toLowerCase());

        let match = exercisesDB.find(e => e.name.toLowerCase() === tgtName);
        if (!match) {
            match = exercisesDB.find(e => altNames.includes(e.name.toLowerCase()));
        }
        if (!match) {
            match = exercisesDB.find(e => e.name.toLowerCase().includes(tgtName) || altNames.some(alt => e.name.toLowerCase().includes(alt)));
        }

        if (match) {
            console.log(`Found match for ${target.name}: ${match.name}`);

            if (match.images && match.images.length > 0) {
                // free-exercise-db paths are like "Barbell_Deadlift/0.jpg"
                // The actual raw URL is https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg
                const imgPath = match.images[0];
                const imageUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${imgPath}`;

                console.log(`  -> Downloading image: ${imageUrl}`);
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
                console.log(`  -> No images field in JSON for ${match.name}`);
            }
        } else {
            console.log(`No match found for ${target.name}`);
        }
    }
    console.log('Done searching GitHub db.');
}

main().catch(console.error);
