import { NextResponse } from "next/server"
import { generateRegistrationOptions } from "@simplewebauthn/server"
import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { rpName, rpID } from "@/lib/webauthn"
import { sessionCookieSecure } from "@/lib/cookie-security"

export const runtime = "nodejs"

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const existingPasskeys = await prisma.passkey.findMany({
        where: { userId: user.id },
        select: { credentialId: true, transports: true },
    })

    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: user.email,
        userDisplayName: user.name,
        excludeCredentials: existingPasskeys.map(pk => ({
            id: pk.credentialId,
            transports: pk.transports as AuthenticatorTransport[],
        })),
        authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "preferred",
        },
    })

    const cookieStore = await cookies()
    cookieStore.set("webauthn-challenge", options.challenge, {
        httpOnly: true,
        secure: sessionCookieSecure(),
        sameSite: "lax",
        maxAge: 300, // 5 minutes
        path: "/",
    })

    return NextResponse.json(options)
}

type AuthenticatorTransport = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb"
