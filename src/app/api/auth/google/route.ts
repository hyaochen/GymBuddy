import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"

// GET /api/auth/google — redirect to Google OAuth consent screen
export async function GET() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"
    const redirectUri = `${appUrl}/api/auth/google/callback`

    // Generate random state parameter to prevent CSRF attacks
    const stateBytes = new Uint8Array(32)
    crypto.getRandomValues(stateBytes)
    const state = Array.from(stateBytes, b => b.toString(16).padStart(2, '0')).join('')

    // Store state in cookie for verification in callback
    const cookieStore = await cookies()
    cookieStore.set("oauth-state", state, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        maxAge: 600, // 10 minutes
        path: "/",
    })

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
        state,
    })

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
