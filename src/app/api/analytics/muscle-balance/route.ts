import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { resolveAnalyticsUser } from '@/lib/analytics-auth'
import { sumSetsVolume } from '@/lib/utils'

// Map bodyRegion enum to the 8 radar categories
const REGION_MAP: Record<string, string> = {
    CHEST: 'Chest',
    BACK: 'Back',
    SHOULDERS: 'Shoulders',
    ARMS: 'Arms',    // Will be split into Biceps/Triceps based on muscle name
    LEGS: 'Legs',    // Will be split into Quads/Hamstrings based on muscle name
    CORE: 'Core',
    FULL_BODY: 'Core',
    CARDIO: 'Core',
}

// Known muscle name patterns for splitting Arms and Legs
function mapMuscleToCategory(muscleName: string, bodyRegion: string): string {
    const lower = muscleName.toLowerCase()

    if (bodyRegion === 'ARMS') {
        if (lower.includes('bicep')) return 'Biceps'
        if (lower.includes('tricep')) return 'Triceps'
        if (lower.includes('forearm')) return 'Biceps'
        return 'Biceps' // default for arms
    }

    if (bodyRegion === 'LEGS') {
        if (lower.includes('quad') || lower.includes('rectus femoris') || lower.includes('vastus')) return 'Quads'
        if (lower.includes('hamstring') || lower.includes('biceps femoris') || lower.includes('glute') || lower.includes('calf') || lower.includes('calves')) return 'Hamstrings'
        return 'Quads' // default for legs
    }

    return REGION_MAP[bodyRegion] || 'Core'
}

export async function GET(request: Request) {
    const { userId, error } = await resolveAnalyticsUser(request)
    if (error) return NextResponse.json({ error }, { status: 401 })

    const now = new Date()
    const startOfThisWeek = new Date(now)
    startOfThisWeek.setDate(now.getDate() - now.getDay())
    startOfThisWeek.setHours(0, 0, 0, 0)

    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

    // Get all sessions from last 2 weeks
    const sessions = await prisma.workoutSession.findMany({
        where: {
            userId,
            completedAt: { not: null },
            startedAt: { gte: startOfLastWeek },
        },
        include: {
            exercises: {
                include: {
                    sets: true,
                    exercise: {
                        include: {
                            muscles: {
                                include: { muscleGroup: true },
                            },
                        },
                    },
                },
            },
        },
    })

    const categories = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Quads', 'Hamstrings']
    const thisWeek: Record<string, number> = Object.fromEntries(categories.map(c => [c, 0]))
    const lastWeek: Record<string, number> = Object.fromEntries(categories.map(c => [c, 0]))

    for (const s of sessions) {
        const isThisWeek = s.startedAt >= startOfThisWeek
        const target = isThisWeek ? thisWeek : lastWeek

        for (const se of s.exercises) {
            const setVolume = sumSetsVolume(se.sets)

            // Distribute volume to muscle groups
            const primaryMuscles = se.exercise.muscles.filter(m => m.isPrimary)
            const secondaryMuscles = se.exercise.muscles.filter(m => !m.isPrimary)

            // Primary muscles get 70% of volume (split equally), secondary get 30%
            const primaryShare = primaryMuscles.length > 0
                ? (setVolume * 0.7) / primaryMuscles.length
                : 0
            const secondaryShare = secondaryMuscles.length > 0
                ? (setVolume * 0.3) / secondaryMuscles.length
                : 0

            for (const m of primaryMuscles) {
                const cat = mapMuscleToCategory(m.muscleGroup.name, m.muscleGroup.bodyRegion)
                target[cat] = (target[cat] || 0) + primaryShare
            }
            for (const m of secondaryMuscles) {
                const cat = mapMuscleToCategory(m.muscleGroup.name, m.muscleGroup.bodyRegion)
                target[cat] = (target[cat] || 0) + secondaryShare
            }

            // If no muscles mapped, skip
            if (se.exercise.muscles.length === 0) {
                // Fallback: skip
            }
        }
    }

    const data = categories.map(cat => ({
        muscle: cat,
        thisWeek: Math.round(thisWeek[cat]),
        lastWeek: Math.round(lastWeek[cat]),
    }))

    return NextResponse.json({ data })
}
