/** Helpers for user-controlled strings that end up in URLs and <img src>. */

const AVATAR_PATH = /^\/api\/avatar\/([A-Za-z0-9_-]+)\.(jpg|png|webp)(\?t=\d+)?$/

/** Avatar path produced by /api/profile/avatar for exactly this user. */
export function isOwnAvatarUrl(value: unknown, userId: string): value is string {
    if (typeof value !== 'string') return false
    const m = AVATAR_PATH.exec(value)
    return !!m && m[1] === userId
}

/** Any local avatar path of the upload format; used before rendering somebody else's avatar. */
export function isLocalAvatarUrl(value: unknown): value is string {
    return typeof value === 'string' && AVATAR_PATH.test(value)
}

/** decodeURIComponent that returns null instead of throwing on malformed sequences. */
export function safeDecodeURIComponent(value: string): string | null {
    try {
        return decodeURIComponent(value)
    } catch {
        return null
    }
}

/** Link to a user's profile page; the nickname is free text so it must be encoded. */
export function profileHref(name: string): string {
    return `/profile/${encodeURIComponent(name)}`
}
