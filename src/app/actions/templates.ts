"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { checkSocialBadge } from "@/lib/badges"

export type ShareTemplateActionState = {
    status: "idle" | "success" | "error"
    message: string
}

type TemplateDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

const DIFFICULTIES = new Set<TemplateDifficulty>(["BEGINNER", "INTERMEDIATE", "ADVANCED"])

function toDifficulty(value: string): TemplateDifficulty {
    return DIFFICULTIES.has(value as TemplateDifficulty) ? value as TemplateDifficulty : "INTERMEDIATE"
}

export async function shareTemplate(
    _prevState: ShareTemplateActionState,
    formData: FormData,
): Promise<ShareTemplateActionState> {
    const user = await requireAuth()
    const planId = String(formData.get("planId") ?? "")
    const name = String(formData.get("name") ?? "").trim()
    const rawDescription = String(formData.get("description") ?? "").trim()
    const rawDifficulty = String(formData.get("difficulty") ?? "INTERMEDIATE")
    const difficulty = toDifficulty(rawDifficulty)

    if (!planId) return { status: "error", message: "請選擇要分享的計畫" }

    const plan = await prisma.workoutPlan.findUnique({
        where: { id: planId },
        include: {
            days: {
                include: {
                    exercises: {
                        include: {
                            exercise: {
                                include: {
                                    muscles: {
                                        include: { muscleGroup: true },
                                        where: { isPrimary: true },
                                    },
                                },
                            },
                        },
                        orderBy: { orderIndex: "asc" },
                    },
                },
                orderBy: { orderIndex: "asc" },
            },
        },
    })

    if (!plan || plan.userId !== user.id) {
        return { status: "error", message: "計畫不存在" }
    }

    const days = plan.days.map(day => ({
        dayName: day.dayName,
        exercises: day.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exercise.name,
            sets: ex.defaultSets,
            repsMin: ex.defaultRepsMin,
            repsMax: ex.defaultRepsMax,
            weightKg: ex.defaultWeightKg ? Number(ex.defaultWeightKg) : null,
            restSeconds: ex.restSeconds,
        })),
    }))

    const muscleSet = new Set<string>()
    plan.days.forEach(day =>
        day.exercises.forEach(ex =>
            ex.exercise.muscles.forEach(m => muscleSet.add(m.muscleGroup.name))
        )
    )

    try {
        await prisma.sharedTemplate.create({
            data: {
                creatorId: user.id,
                name: name || plan.name,
                description: rawDescription || plan.description,
                daysPerWeek: plan.daysPerWeek,
                difficulty,
                targetMuscles: JSON.stringify(Array.from(muscleSet)),
                days: JSON.stringify(days),
            },
        })

        checkSocialBadge(user.id, "template_shared").catch(console.error)
        revalidatePath(`/plans/${planId}`)
        return { status: "success", message: "已成功分享為社群模板！" }
    } catch (err) {
        console.error("[templates] share failed:", err)
        return { status: "error", message: "分享失敗" }
    }
}
