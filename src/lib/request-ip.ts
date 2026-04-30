export function forwardedClientIp(headers: Headers): string {
    const cf = headers.get('cf-connecting-ip')
    if (cf) return cf.trim()

    const xff = headers.get('x-forwarded-for')
    if (xff) return xff.split(',')[0]?.trim() || 'unknown'

    return headers.get('x-real-ip')?.trim() || 'unknown'
}
