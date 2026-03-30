import { NextResponse } from "next/server"
import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { cookies } from "next/headers"
import { rpID } from "@/lib/webauthn"

export const runtime = "nodejs"

export async function GET() {
    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
    })

    const cookieStore = await cookies()
    cookieStore.set("webauthn-challenge", options.challenge, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        maxAge: 300,
        path: "/",
    })

    return NextResponse.json(options)
}
