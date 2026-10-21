"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import * as argon2 from "argon2"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { signSession } from "@/lib/session"
import { createRateLimiter } from "@/lib/rate-limiter"
import { sessionCookieSecure } from "@/lib/cookie-security"

const SESSION_COOKIE = "session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// 目前密碼輸錯 5 次 → 鎖 15 分鐘（以 userId 為 key）
const passwordLimiter = createRateLimiter({ namespace: "account:password", maxAttempts: 5, windowMs: 15 * 60 * 1000 })

export type ChangePasswordState = {
    error?: string
    success?: boolean
}

/** 設定頁用：該帳號是否已有密碼（Google 專用帳號沒有） */
export async function getPasswordStatus(): Promise<{ hasPassword: boolean }> {
    const me = await requireAuth()
    const user = await prisma.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } })
    return { hasPassword: !!user?.passwordHash }
}

export async function changePassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
    const me = await requireAuth()
    const currentPassword = (formData.get("currentPassword") as string | null) ?? ""
    const newPassword = (formData.get("newPassword") as string | null) ?? ""
    const confirmPassword = (formData.get("confirmPassword") as string | null) ?? ""

    if (newPassword.length < 8) return { error: "新密碼至少需要 8 個字元" }
    if (newPassword !== confirmPassword) return { error: "兩次輸入的新密碼不一致" }

    const limitKey = me.id
    if (await passwordLimiter.isBlocked(limitKey)) {
        const remaining = Math.ceil(await passwordLimiter.remainingSeconds(limitKey) / 60)
        return { error: `嘗試次數過多，請 ${remaining} 分鐘後再試` }
    }

    const user = await prisma.user.findUnique({
        where: { id: me.id },
        select: { passwordHash: true },
    })
    if (!user) return { error: "找不到帳號" }

    // 有密碼的帳號必須驗證目前密碼；只用 Google 登入（無密碼）的帳號可直接設定
    if (user.passwordHash) {
        if (!currentPassword) return { error: "請輸入目前密碼" }
        const valid = await argon2.verify(user.passwordHash, currentPassword)
        if (!valid) {
            await passwordLimiter.record(limitKey)
            return { error: "目前密碼錯誤" }
        }
    }

    const passwordHash = await argon2.hash(newPassword)
    const updated = await prisma.user.update({
        where: { id: me.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
        select: { tokenVersion: true },
    })
    await passwordLimiter.reset(limitKey)

    // 其他裝置的 cookie 因版本不符失效；目前裝置重發新 cookie 保持登入
    const token = await signSession({ userId: me.id, issuedAt: Date.now(), tokenVersion: updated.tokenVersion })
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: sessionCookieSecure(),
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
    })

    return { success: true }
}

/** 登出所有裝置（含目前這台） */
export async function logoutAllDevices() {
    const me = await requireAuth()
    await prisma.user.update({
        where: { id: me.id },
        data: { tokenVersion: { increment: 1 } },
    })
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    redirect("/login")
}
