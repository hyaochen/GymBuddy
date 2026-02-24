import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const exs = await prisma.exercise.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    exs.forEach(e => console.log(`${e.id} | ${e.name}`))
}
main().catch(console.error).finally(() => prisma.$disconnect())
