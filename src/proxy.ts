import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth protection is handled by requireAuth() in the (app) layout (Node.js runtime).
// The Edge runtime cannot reliably access process.env.SESSION_SECRET from compiled modules,
// so we skip session verification here and rely on server-side requireAuth() instead.

export function proxy(request: NextRequest) {
    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
