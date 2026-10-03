import { Dumbbell, Flame, ThumbsUp, Trophy, Zap, type LucideIcon } from 'lucide-react'
import { DEFAULT_KUDO, normalizeKudoKey, type KudoKey } from '@/lib/kudos'

const KUDO_ICONS: Record<KudoKey, LucideIcon> = {
    flex: Dumbbell,
    fire: Flame,
    clap: ThumbsUp,
    trophy: Trophy,
    bolt: Zap,
}

interface KudoIconProps {
    /** New key or a legacy stored emoji; anything unknown falls back to the default reaction. */
    value: string | null | undefined
    className?: string
}

export default function KudoIcon({ value, className }: KudoIconProps) {
    const Icon = KUDO_ICONS[normalizeKudoKey(value) ?? DEFAULT_KUDO]
    return <Icon className={className ?? 'inline-block h-[1em] w-[1em] align-[-0.125em]'} aria-hidden="true" />
}
