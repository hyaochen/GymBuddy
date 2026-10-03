/**
 * Kudo reactions.
 *
 * The kudos.emoji column (name is historical) now stores a short key. Rows
 * written before the emoji removal (2026-10) still hold the original emoji
 * characters, so every reader and the POST validator go through
 * normalizeKudoKey(), which accepts both forms. Those legacy rows are user
 * data and are intentionally left untouched in the database.
 */
export const KUDO_KEYS = ['flex', 'fire', 'clap', 'trophy', 'bolt'] as const
export type KudoKey = (typeof KUDO_KEYS)[number]

export const DEFAULT_KUDO: KudoKey = 'flex'

export const KUDO_LABELS: Record<KudoKey, string> = {
    flex: '加油',
    fire: '火熱',
    clap: '鼓掌',
    trophy: '冠軍',
    bolt: '爆發',
}

// Legacy stored values, written as code points on purpose (do not inline the
// characters: the repo bans emoji in source).
const LEGACY_KUDO_VALUES: Record<string, KudoKey> = {
    '\u{1F4AA}': 'flex',
    '\u{1F525}': 'fire',
    '\u{1F44F}': 'clap',
    '\u{1F3C6}': 'trophy',
    '\u26A1': 'bolt',
}

/** Maps a stored/submitted reaction (new key or legacy emoji) to a KudoKey. */
export function normalizeKudoKey(value: unknown): KudoKey | null {
    if (typeof value !== 'string') return null
    const v = value.replace(/\uFE0F/g, '').trim()
    if ((KUDO_KEYS as readonly string[]).includes(v)) return v as KudoKey
    return LEGACY_KUDO_VALUES[v] ?? null
}
