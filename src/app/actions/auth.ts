"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import * as argon2 from "argon2"
import prisma from "@/lib/prisma"
import { signSession } from "@/lib/session"
import { createRateLimiter } from "@/lib/rate-limiter"
import { sessionCookieSecure } from "@/lib/cookie-security"

const SESSION_COOKIE = "session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// 5 failed attempts per (IP + normalized identifier) → block for 15 minutes.
// Keying on IP+identifier prevents one attacker from locking out a real user's
// account by spamming failures against their email.
const loginLimiter = createRateLimiter({ namespace: "auth:login", maxAttempts: 5, windowMs: 15 * 60 * 1000 })
// 10 registrations per IP per hour
const registerLimiter = createRateLimiter({ namespace: "auth:register", maxAttempts: 10, windowMs: 60 * 60 * 1000 })

async function clientIp(): Promise<string> {
    const h = await headers()
    const xff = h.get("x-forwarded-for")
    if (xff) return xff.split(",")[0]!.trim()
    return h.get("x-real-ip") ?? "unknown"
}

export async function login(formData: FormData) {
    const rawEmail = formData.get("email") as string
    const password = formData.get("password") as string

    if (!rawEmail || !password) {
        redirect("/login?error=" + encodeURIComponent("請填寫所有欄位"))
    }

    const identifier = rawEmail.trim().toLowerCase()
    const ip = await clientIp()
    const limitKey = `${ip}|${identifier}`

    if (await loginLimiter.isBlocked(limitKey)) {
        const remaining = Math.ceil(await loginLimiter.remainingSeconds(limitKey) / 60)
        redirect("/login?error=" + encodeURIComponent(`登入嘗試過多，請 ${remaining} 分鐘後再試`))
    }

    // Support login by email OR by name (for test accounts). Case-insensitive match.
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: identifier, mode: "insensitive" } },
                { name: { equals: identifier, mode: "insensitive" } },
            ],
        },
    })
    if (!user || !user.passwordHash) {
        await loginLimiter.record(limitKey)
        redirect("/login?error=" + encodeURIComponent("帳號或密碼錯誤"))
    }

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) {
        await loginLimiter.record(limitKey)
        redirect("/login?error=" + encodeURIComponent("帳號或密碼錯誤"))
    }

    await loginLimiter.reset(limitKey)

    const token = await signSession({ userId: user.id, issuedAt: Date.now() })
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: sessionCookieSecure(),
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
    })

    redirect("/")
}

export async function register(formData: FormData) {
    const name = (formData.get("name") as string | null)?.trim() ?? ""
    const rawEmail = (formData.get("email") as string | null) ?? ""
    const email = rawEmail.trim().toLowerCase()
    const password = formData.get("password") as string

    if (!name || !email || !password) {
        redirect("/register?error=" + encodeURIComponent("請填寫所有欄位"))
    }

    if (password.length < 6) {
        redirect("/register?error=" + encodeURIComponent("密碼至少需要 6 個字元"))
    }

    const ip = await clientIp()
    if (await registerLimiter.isBlocked(ip)) {
        const remaining = Math.ceil(await registerLimiter.remainingSeconds(ip) / 60)
        redirect("/register?error=" + encodeURIComponent(`註冊過於頻繁，請 ${remaining} 分鐘後再試`))
    }
    await registerLimiter.record(ip)

    const existingEmail = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
    })
    const existingName = await prisma.user.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
    })
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
        secure: sessionCookieSecure(),
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
