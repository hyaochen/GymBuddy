import { NextResponse } from "next/server"

export const runtime = "nodejs"

// GET /api/auth/google — redirect to Google OAuth consent screen
export async function GET() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"
    const redirectUri = `${appUrl}/api/auth/google/callback`

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
    })

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
