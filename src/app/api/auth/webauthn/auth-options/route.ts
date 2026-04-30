import { NextRequest, NextResponse } from "next/server"
import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { cookies } from "next/headers"
import { rpID } from "@/lib/webauthn"
import { createRateLimiter } from "@/lib/rate-limiter"
import { sessionCookieSecure } from "@/lib/cookie-security"
import { forwardedClientIp } from "@/lib/request-ip"

export const runtime = "nodejs"

const passkeyOptionsLimiter = createRateLimiter({
    namespace: "webauthn:auth-options",
    maxAttempts: 20,
    windowMs: 15 * 60 * 1000,
})

export async function GET(req: NextRequest) {
    const ip = forwardedClientIp(req.headers)
    if (await passkeyOptionsLimiter.isBlocked(ip)) {
        return NextResponse.json({ error: "Too many passkey attempts" }, { status: 429 })
    }
    await passkeyOptionsLimiter.record(ip)

    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
    })

    const cookieStore = await cookies()
    cookieStore.set("webauthn-challenge", options.challenge, {
        httpOnly: true,
        secure: sessionCookieSecure(),
        sameSite: "lax",
        maxAge: 300,
        path: "/",
    })

    return NextResponse.json(options)
}
