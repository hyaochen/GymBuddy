import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const targets = [
    '槓鈴深蹲 Barbell Back Squat',
    '伏地挺身 Push-up',
    '滑輪下拉 Lat Pulldown',
    '槓鈴臥推 Barbell Bench Press',
    '上斜槓鈴臥推 Incline Barbell Bench Press'
];

async function main() {
    const exercises = await prisma.exercise.findMany({
        where: {
            name: { in: targets }
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
