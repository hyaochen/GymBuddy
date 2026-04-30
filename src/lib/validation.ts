import { NextResponse } from 'next/server'
import { z } from 'zod'

export const cuidSchema = z.string().min(8).max(64).regex(/^[a-z0-9]+$/i)

export async function parseJsonBody<T>(
    req: Request,
    schema: z.ZodType<T>,
): Promise<{ data: T } | { response: NextResponse }> {
    let json: unknown
    try {
        json = await req.json()
    } catch {
        return { response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    }

    const parsed = schema.safeParse(json)
    if (!parsed.success) {
        return {
            response: NextResponse.json(
                { error: 'Invalid request body', issues: parsed.error.issues.map(i => i.message) },
                { status: 400 },
            ),
        }
    }

    return { data: parsed.data }
}

export function parseRouteId(id: string): string | null {
    const parsed = cuidSchema.safeParse(id)
    return parsed.success ? parsed.data : null
}
