import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const passkey = await prisma.passkey.findUnique({ where: { id } })
    if (!passkey || passkey.userId !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.passkey.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
