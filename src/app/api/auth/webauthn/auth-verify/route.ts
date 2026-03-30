import { NextRequest, NextResponse } from "next/server"
import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { signSession } from "@/lib/session"
import { rpID, origin } from "@/lib/webauthn"

export const runtime = "nodejs"

const SESSION_COOKIE = "session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(req: NextRequest) {
    const cookieStore = await cookies()
    const challenge = cookieStore.get("webauthn-challenge")?.value
    cookieStore.delete("webauthn-challenge")

    if (!challenge) {
        return NextResponse.json({ error: "Challenge expired" }, { status: 400 })
    }

    const body = await req.json()

    try {
        // Look up the passkey by credential ID
        const credentialId = body.id
        const passkey = await prisma.passkey.findUnique({
            where: { credentialId },
        })

        if (!passkey) {
            return NextResponse.json({ error: "Passkey not found" }, { status: 400 })
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: passkey.credentialId,
                publicKey: passkey.publicKey,
                counter: Number(passkey.counter),
                transports: passkey.transports as AuthenticatorTransport[],
            },
        })

        if (!verification.verified) {
            return NextResponse.json({ error: "Verification failed" }, { status: 400 })
        }

        // Update counter for replay protection
        await prisma.passkey.update({
            where: { id: passkey.id },
            data: { counter: verification.authenticationInfo.newCounter },
        })

        // Create session
        const token = await signSession({ userId: passkey.userId, issuedAt: Date.now() })
        cookieStore.set(SESSION_COOKIE, token, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === "true",
            sameSite: "lax",
            maxAge: SESSION_MAX_AGE,
            path: "/",
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error("[webauthn] Auth verify error:", err)
        return NextResponse.json({ error: "Verification failed" }, { status: 400 })
    }
}

type AuthenticatorTransport = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb"
