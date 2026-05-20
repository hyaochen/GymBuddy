/**
 * cleanup-push-zombies.ts — Trim accumulated push_subscriptions per user.
 *
 * Context (T-GB-004 / audit-2026-05-20-push-half-missing):
 * iOS Safari rotates PushManager endpoints silently. T-PB-004's visibilitychange
 * resync builds a new subscription but T-GB-003 found that client never sends
 * `oldEndpoint`, so DB accumulates dead rows. owner currently has 39 rows.
 *
 * This script keeps the newest N rows per user (default 5 — enough for
 * iPhone + iPad + 2-3 spares) and deletes the rest.
 *
 * Usage:
 *   docker compose exec workout-app npx tsx scripts/cleanup-push-zombies.ts          # dry-run (default)
 *   docker compose exec workout-app npx tsx scripts/cleanup-push-zombies.ts --apply   # actually delete
 *   docker compose exec workout-app npx tsx scripts/cleanup-push-zombies.ts --keep 3  # custom cap
 *   docker compose exec workout-app npx tsx scripts/cleanup-push-zombies.ts --user <id>  # one user only
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Args {
    apply: boolean
    keep: number
    userId: string | null
}

function parseArgs(argv: string[]): Args {
    const out: Args = { apply: false, keep: 5, userId: null }
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a === '--apply') out.apply = true
        else if (a === '--keep') out.keep = Number(argv[++i])
        else if (a === '--user') out.userId = argv[++i]
    }
    if (!Number.isFinite(out.keep) || out.keep < 1) {
        throw new Error(`--keep must be a positive integer, got: ${out.keep}`)
    }
    return out
}

function endpointHash(endpoint: string): string {
    return `...${endpoint.slice(-24)}`
}

async function main() {
    const args = parseArgs(process.argv.slice(2))

    console.log('─'.repeat(72))
    console.log(`cleanup-push-zombies  mode=${args.apply ? 'APPLY (will DELETE)' : 'DRY-RUN'}  keep=${args.keep}${args.userId ? `  user=${args.userId}` : '  (all users)'}`)
    console.log('─'.repeat(72))

    const userFilter = args.userId ? { userId: args.userId } : {}

    const userIds: string[] = args.userId
        ? [args.userId]
        : (await prisma.pushSubscription.groupBy({
              by: ['userId'],
              where: userFilter,
              _count: { _all: true },
          })).map(r => r.userId)

    if (userIds.length === 0) {
        console.log('No users with push subscriptions found. Nothing to do.')
        return
    }

    let totalRows = 0
    let totalToDelete = 0
    let usersAffected = 0

    for (const uid of userIds) {
        const rows = await prisma.pushSubscription.findMany({
            where: { userId: uid },
            orderBy: { createdAt: 'desc' },
            select: { id: true, endpoint: true, createdAt: true, updatedAt: true },
        })
        totalRows += rows.length

        if (rows.length <= args.keep) {
            console.log(`user=${uid}  rows=${rows.length}  (≤ keep, skipped)`)
            continue
        }

        const keep = rows.slice(0, args.keep)
        const drop = rows.slice(args.keep)
        usersAffected++
        totalToDelete += drop.length

        console.log(`\nuser=${uid}  total=${rows.length}  keep=${keep.length}  drop=${drop.length}`)
        console.log(`  KEEP (newest ${args.keep} by createdAt):`)
        for (const r of keep) {
            console.log(`    ${r.createdAt.toISOString()}  ${endpointHash(r.endpoint)}  id=${r.id}`)
        }
        console.log(`  DROP:`)
        for (const r of drop) {
            console.log(`    ${r.createdAt.toISOString()}  ${endpointHash(r.endpoint)}  id=${r.id}`)
        }

        if (args.apply) {
            const dropIds = drop.map(r => r.id)
            const result = await prisma.pushSubscription.deleteMany({
                where: { id: { in: dropIds } },
            })
            console.log(`  → DELETED ${result.count} row(s)`)
        }
    }

    console.log('\n' + '─'.repeat(72))
    console.log(`Summary: users=${userIds.length}  total_rows=${totalRows}  users_over_cap=${usersAffected}  rows_${args.apply ? 'deleted' : 'would_delete'}=${totalToDelete}`)
    if (!args.apply && totalToDelete > 0) {
        console.log('Re-run with --apply to actually delete.')
    }
    console.log('─'.repeat(72))
}

main()
    .catch((err) => {
        console.error('cleanup-push-zombies failed:', err)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
