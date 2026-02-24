/**
 * create-test-account.ts
 *
 * Creates a test/test user (name="test", email="test@gymbuddy.local", password="test")
 * and copies ALL existing workout plans to the test account.
 *
 * Run inside Docker:
 *   docker exec -i workout-app npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/create-test-account.ts
 */

import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
    console.log('=== Creating test/test account ===\n')

    const hash = await argon2.hash('test', { type: argon2.argon2id })

    // Upsert by email
    const existing = await prisma.user.findUnique({ where: { email: 'test@gymbuddy.local' } })
    let testUser
    if (existing) {
        console.log('Test user already exists, updating password hash...')
        testUser = await prisma.user.update({
            where: { email: 'test@gymbuddy.local' },
            data: { passwordHash: hash },
        })
    } else {
        testUser = await prisma.user.create({
            data: {
                name: 'test',
                email: 'test@gymbuddy.local',
                passwordHash: hash,
            },
        })
        console.log(`✓ Created user: test (id: ${testUser.id})`)
    }

    // Copy all plans from other users
    const otherUsers = await prisma.user.findMany({
        where: { id: { not: testUser.id } },
        select: { id: true, name: true },
    })
    console.log(`\nCopying plans from: ${otherUsers.map(u => u.name).join(', ')}`)

    const existingTestPlans = await prisma.workoutPlan.findMany({
        where: { userId: testUser.id },
        select: { name: true },
    })
    const plansToSkip = new Set(existingTestPlans.map(p => p.name))

    let copied = 0
    for (const otherUser of otherUsers) {
        const plans = await prisma.workoutPlan.findMany({
            where: { userId: otherUser.id },
            include: {
                days: {
                    include: { exercises: { orderBy: { orderIndex: 'asc' } } },
                    orderBy: { orderIndex: 'asc' },
                },
            },
        })

        for (const plan of plans) {
            if (plansToSkip.has(plan.name)) {
                console.log(`  ↩ Skip (exists): ${plan.name}`)
                continue
            }

            const newPlan = await prisma.workoutPlan.create({
                data: { userId: testUser.id, name: plan.name, description: plan.description },
            })

            for (const day of plan.days) {
                const newDay = await prisma.workoutPlanDay.create({
                    data: { planId: newPlan.id, dayName: day.dayName, orderIndex: day.orderIndex, dayOfWeek: day.dayOfWeek },
                })
                for (const ex of day.exercises) {
                    await prisma.workoutPlanExercise.create({
                        data: {
                            dayId: newDay.id, exerciseId: ex.exerciseId, orderIndex: ex.orderIndex,
                            defaultSets: ex.defaultSets, defaultRepsMin: ex.defaultRepsMin,
                            defaultRepsMax: ex.defaultRepsMax, defaultWeightKg: ex.defaultWeightKg,
                            restSeconds: ex.restSeconds,
                        },
                    })
                }
            }

            plansToSkip.add(plan.name)
            console.log(`  ✓ Copied: ${plan.name}`)
            copied++
        }
    }

    console.log(`\n✓ Done. ${copied} plans copied to test account.`)
    console.log('\n=== Test account ===')
    console.log('  Login: test  (or test@gymbuddy.local)')
    console.log('  Password: test')
}

main().catch(console.error).finally(() => prisma.$disconnect())
