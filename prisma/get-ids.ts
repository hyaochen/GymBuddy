import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const eqs = await prisma.equipment.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    console.log('\n=== Equipment ===')
    eqs.forEach(e => console.log(e.id, '|', e.name))
    const mgs = await prisma.muscleGroup.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    console.log('\n=== Muscle Groups ===')
    mgs.forEach(m => console.log(m.id, '|', m.name))
}
main().catch(console.error).finally(() => prisma.$disconnect())
