import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const GENERATED_DIR = 'public/exercises/generated';

async function updateImages() {
    console.log("Starting bulk database update for generated images...");

    const files = fs.readdirSync(GENERATED_DIR);
    const imageFiles = files.filter(f => f.endsWith('.png'));

    let updatedCount = 0;

    for (const file of imageFiles) {
        // Filename is name_en.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.png'
        // We need to match this back to the database name or ID.
        // A more reliable way is to iterate through database exercises and check if a file exists for them.

        // For now, let's try to match by name pattern
        const namePattern = file.replace('.png', '').replace(/_/g, ' ');

        try {
            // Find exercise where name might match (fuzzy or exact)
            const exercises = await prisma.exercise.findMany({
                where: {
                    OR: [
                        { name: { contains: namePattern, mode: 'insensitive' } },
                        // Add more specific mapping if needed
                    ]
                }
            });

            if (exercises.length > 0) {
                for (const ex of exercises) {
                    // Update only if gifUrl is not already the generated one or is empty/old
                    if (ex.gifUrl !== `/exercises/generated/${file}`) {
                        await prisma.exercise.update({
                            where: { id: ex.id },
                            data: { gifUrl: `/exercises/generated/${file}` }
                        });
                        console.log(`Updated ${ex.name} -> /exercises/generated/${file}`);
                        updatedCount++;
                    }
                }
            }
        } catch (error) {
            console.error(`Error updating for file ${file}:`, error.message);
        }
    }

    console.log(`Bulk update finished. ${updatedCount} records updated.`);
}

updateImages()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
