import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { signSession } from "@/lib/session"
import { sessionCookieSecure } from "@/lib/cookie-security"

export const runtime = "nodejs"

const SESSION_COOKIE = "session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

interface GoogleTokenResponse {
    access_token: string
    id_token: string
    token_type: string
}

interface GoogleUserInfo {
    sub: string       // Google user ID
    email: string
    email_verified?: boolean
    name: string
    picture?: string
}

// GET /api/auth/google/callback — handle Google OAuth callback
export async function GET(req: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"
    const baseUrl = appUrl // Use public URL for redirects, not req.url (Docker internal address)

    const code = req.nextUrl.searchParams.get("code")
    if (!code) {
        return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("Google 登入失敗"), baseUrl))
    }

    // Verify OAuth state parameter to prevent CSRF
    const cookieStore = await cookies()
    const storedState = cookieStore.get("oauth-state")?.value
    cookieStore.delete("oauth-state")
    const returnedState = req.nextUrl.searchParams.get("state")
    if (!storedState || !returnedState || storedState !== returnedState) {
        return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("驗證失敗，請重新登入"), baseUrl))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
    const redirectUri = `${appUrl}/api/auth/google/callback`

    try {
        // Exchange code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        })

        if (!tokenRes.ok) {
            const err = await tokenRes.text()
            console.error("[google-auth] Token exchange failed:", err)
            console.error("[google-auth] Token exchange failed for redirect_uri mismatch or invalid credentials")
            return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("Google 驗證失敗"), baseUrl))
        }

        const tokens: GoogleTokenResponse = await tokenRes.json()

        // Get user info
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        })

        if (!userInfoRes.ok) {
            return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("無法取得 Google 帳號資訊"), baseUrl))
        }

        const googleUser: GoogleUserInfo = await userInfoRes.json()
        if (googleUser.email_verified !== true) {
            console.warn("[google-auth] Rejected unverified email", { googleId: googleUser.sub })
            return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("Google email is not verified"), baseUrl))
        }
        const verifiedEmail = googleUser.email.trim().toLowerCase()

        // Find or create user
        let user = await prisma.user.findUnique({ where: { googleId: googleUser.sub } })
        if (!user) {
            user = await prisma.user.findUnique({ where: { email: verifiedEmail } })
        }

        if (user) {
            if (user.googleId && user.googleId !== googleUser.sub) {
                console.warn("[google-auth] Rejected mismatched Google account link", { userId: user.id })
                return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("Google account mismatch"), baseUrl))
            }
            // Link Google ID if not yet linked
            if (!user.googleId) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId: googleUser.sub },
                })
            }
        } else {
            // Create new user with Google account
            // Generate a unique name if needed
            let name = googleUser.name || verifiedEmail.split("@")[0]
            const existingName = await prisma.user.findUnique({ where: { name } })
            if (existingName) {
                name = `${name}_${googleUser.sub.slice(-4)}`
            }

            user = await prisma.user.create({
                data: {
                    email: verifiedEmail,
                    name,
                    googleId: googleUser.sub,
                    passwordHash: null,
                },
            })
            console.log(`[google-auth] New user created: ${user.id}`)

            // Copy starter plans in background
            copyStarterPlans(user.id).catch(e => console.error("[google-auth] copyStarterPlans failed:", e))
        }

        // Create session
        const token = await signSession({ userId: user.id, issuedAt: Date.now() })
        cookieStore.set(SESSION_COOKIE, token, {
            httpOnly: true,
            secure: sessionCookieSecure(),
            sameSite: "lax",
            maxAge: SESSION_MAX_AGE,
            path: "/",
        })

        return NextResponse.redirect(new URL("/", baseUrl))
    } catch (err) {
        console.error("[google-auth] Error:", err)
        return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("Google 登入發生錯誤"), baseUrl))
    }
}

/** Copy starter plans from the first user to a new user */
async function copyStarterPlans(newUserId: string) {
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
    console.log(`[google-auth] Copied ${plans.length} starter plans to user ${newUserId}`)
}
