import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const exercises = await prisma.exercise.findMany({
        select: { name: true }
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
