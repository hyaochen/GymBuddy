import { NextRequest, NextResponse } from "next/server"
import { verifyRegistrationResponse } from "@simplewebauthn/server"
import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { rpID, origin } from "@/lib/webauthn"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const cookieStore = await cookies()
    const challenge = cookieStore.get("webauthn-challenge")?.value
    cookieStore.delete("webauthn-challenge")

    if (!challenge) {
        return NextResponse.json({ error: "Challenge expired" }, { status: 400 })
    }

    const body = await req.json()
    const { attestation, deviceName } = body

    try {
        const verification = await verifyRegistrationResponse({
            response: attestation,
            expectedChallenge: challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        })

        if (!verification.verified || !verification.registrationInfo) {
            return NextResponse.json({ error: "Verification failed" }, { status: 400 })
        }

        const { credential } = verification.registrationInfo

        await prisma.passkey.create({
            data: {
                userId: user.id,
                credentialId: credential.id,
                publicKey: Buffer.from(credential.publicKey),
                counter: credential.counter,
                transports: credential.transports || [],
                deviceName: deviceName || null,
            },
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error("[webauthn] Registration verify error:", err)
        return NextResponse.json({ error: "Verification failed" }, { status: 400 })
    }
}
