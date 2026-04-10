import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const keywords = ['Squat', 'Push-up', 'Pulldown', 'Bench Press'];

async function main() {
    const exercises = await prisma.exercise.findMany({
        where: {
            OR: keywords.map(kw => ({ name: { contains: kw, mode: 'insensitive' } }))
        },
        select: { id: true, name: true }
    });
    console.log(JSON.stringify(exercises, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
