"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import * as argon2 from "argon2"
import prisma from "@/lib/prisma"
import { signSession } from "@/lib/session"

const SESSION_COOKIE = "session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function login(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) {
        redirect("/login?error=" + encodeURIComponent("請填寫所有欄位"))
    }

    // Support login by email OR by name (for test accounts)
    const user = await prisma.user.findFirst({
        where: { OR: [{ email }, { name: email }] },
    })
    if (!user || !user.passwordHash) {
        redirect("/login?error=" + encodeURIComponent("帳號或密碼錯誤"))
    }

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) {
        redirect("/login?error=" + encodeURIComponent("帳號或密碼錯誤"))
    }

    const token = await signSession({ userId: user.id, issuedAt: Date.now() })
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
    })

    redirect("/")
}

export async function register(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!name || !email || !password) {
        redirect("/register?error=" + encodeURIComponent("請填寫所有欄位"))
    }

    if (password.length < 6) {
        redirect("/register?error=" + encodeURIComponent("密碼至少需要 6 個字元"))
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } })
    const existingName = await prisma.user.findUnique({ where: { name } })
    if (existingEmail || existingName) {
        redirect("/register?error=" + encodeURIComponent("此帳號資訊已被使用，請更換電子郵件或暱稱"))
    }

    const passwordHash = await argon2.hash(password)
    const user = await prisma.user.create({
        data: { name, email, passwordHash },
    })

    // 複製第一位用戶（admin）的訓練計劃給新用戶作為參考（不阻塞註冊流程）
    copyStarterPlans(user.id).catch(e => console.error("[register] copyStarterPlans failed:", e))

    const token = await signSession({ userId: user.id, issuedAt: Date.now() })
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
    })

    redirect("/")
}

/** 複製第一位用戶的所有訓練計劃給新註冊的用戶 */
async function copyStarterPlans(newUserId: string) {
    try {
        const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } })
        if (!firstUser || firstUser.id === newUserId) return

        const plans = await prisma.workoutPlan.findMany({
            where: { userId: firstUser.id, isActive: true },
            include: {
                days: {
                    include: { exercises: { orderBy: { orderIndex: "asc" } } },
                    orderBy: { orderIndex: "asc" },
                },
            },
        })

        for (const plan of plans) {
            const newPlan = await prisma.workoutPlan.create({
                data: { userId: newUserId, name: plan.name, description: plan.description, daysPerWeek: plan.daysPerWeek },
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
        }
        console.log(`[register] Copied ${plans.length} starter plans to user ${newUserId}`)
    } catch (e) {
        console.error("[register] Failed to copy starter plans:", e)
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    redirect("/login")
}
