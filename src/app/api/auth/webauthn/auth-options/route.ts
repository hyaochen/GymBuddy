import { NextRequest, NextResponse } from "next/server"
import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { cookies } from "next/headers"
import { rpID } from "@/lib/webauthn"
import prisma from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
    // Optional: narrow to a specific user's credentials when username known.
    // Omitted (discoverable credential flow) for the silent Face-ID login.
    const username = req.nextUrl.searchParams.get("username")?.trim()

    let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] | undefined
    if (username) {
        const passkeys = await prisma.passkey.findMany({
            where: {
                user: {
                    OR: [
                        { name: { equals: username, mode: "insensitive" } },
                        { email: { equals: username, mode: "insensitive" } },
                    ],
                },
            },
            select: { credentialId: true, transports: true },
        })
        allowCredentials = passkeys.map((pk) => ({
            id: pk.credentialId,
            transports: pk.transports as AuthenticatorTransport[],
        }))
    }

    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
        ...(allowCredentials ? { allowCredentials } : {}),
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
