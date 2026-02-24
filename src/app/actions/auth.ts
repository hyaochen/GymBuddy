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
    if (!user) {
        redirect("/login?error=" + encodeURIComponent("帳號或密碼錯誤"))
    }

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) {
        redirect("/login?error=" + encodeURIComponent("電子郵件或密碼錯誤"))
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

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        redirect("/register?error=" + encodeURIComponent("此電子郵件已被使用"))
    }

    const passwordHash = await argon2.hash(password)
    const user = await prisma.user.create({
        data: { name, email, passwordHash },
    })

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

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    redirect("/login")
}
