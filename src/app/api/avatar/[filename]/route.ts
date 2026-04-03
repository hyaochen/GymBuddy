import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

const MIME_MAP: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params

    // Sanitize filename — only allow alphanumeric, dash, underscore, dot
    if (!/^[\w.-]+$/.test(filename)) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
    }

    const ext = filename.split(".").pop()?.toLowerCase() || ""
    const mime = MIME_MAP[ext]
    if (!mime) {
        return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), "public", "uploads", "avatars", filename)

    try {
        const buffer = await readFile(filePath)
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": mime,
                "Cache-Control": "public, max-age=3600, must-revalidate",
            },
        })
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
}
