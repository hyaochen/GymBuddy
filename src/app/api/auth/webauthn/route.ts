import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const passkeys = await prisma.passkey.findMany({
        where: { userId: user.id },
        select: { id: true, deviceName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(passkeys)
}
