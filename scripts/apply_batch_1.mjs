import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updates = [
    { id: 'cmlzdcae5001v11jlx20nwifb', gifUrl: '/exercises/generated/barbell_back_squat.png' },
    { id: 'cmlzdcaay001f11jllfppnro4', gifUrl: '/exercises/generated/pushup.png' },
    { id: 'cmlzdcad0001p11jlpe0uoije', gifUrl: '/exercises/generated/lat_pulldown.png' },
    { id: 'cmlzdca9o001a11jl6e68w6k8', gifUrl: '/exercises/generated/barbell_bench_press.png' },
    { id: 'cmlzdcaa2001b11jljh08hwvo', gifUrl: '/exercises/generated/incline_barbell_bench_press.png' }
];

async function main() {
    for (const update of updates) {
        const res = await prisma.exercise.update({
            where: { id: update.id },
            data: { gifUrl: update.gifUrl }
        });
        console.log(`Updated ${res.name} with ${update.gifUrl}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
