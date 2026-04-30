export function sessionCookieSecure(): boolean {
    const explicit = process.env.COOKIE_SECURE
    if (process.env.NODE_ENV === 'production' && explicit !== 'true') {
        if (process.env.ALLOW_INSECURE_COOKIES === 'true') return false
        throw new Error('COOKIE_SECURE=true is required in production')
    }
    return explicit === 'true'
}
