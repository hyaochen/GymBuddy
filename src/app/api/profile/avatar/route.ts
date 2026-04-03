import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { writeFile, mkdir, readdir, unlink } from "fs/promises"
import path from "path"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const EXT_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("avatar") as File | null

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
            { error: "Invalid file type. Only JPG, PNG, and WebP are allowed." },
            { status: 400 }
        )
    }

    // Validate size
    if (file.size > MAX_SIZE) {
        return NextResponse.json(
            { error: "File too large. Maximum size is 5MB." },
            { status: 400 }
        )
    }

    const ext = EXT_MAP[file.type]
    const fileName = `${user.id}.${ext}`
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars")

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true })

    // Remove any previous avatar for this user (different extension)
    try {
        const files = await readdir(uploadDir)
        for (const f of files) {
            if (f.startsWith(user.id + ".")) {
                await unlink(path.join(uploadDir, f))
            }
        }
    } catch {
        // Directory might not exist yet, that's fine
    }

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(path.join(uploadDir, fileName), buffer)

    // Build URL with cache-busting timestamp
    const avatarUrl = `/uploads/avatars/${fileName}?t=${Date.now()}`

    // Update database
    await prisma.userProfile.upsert({
        where: { userId: user.id },
        create: {
            userId: user.id,
            avatarUrl,
        },
        update: {
            avatarUrl,
        },
    })

    return NextResponse.json({ avatarUrl })
}
