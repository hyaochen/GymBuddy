import {
    Target,
    Dumbbell,
    Flame,
    Medal,
    Trophy,
    Zap,
    Handshake,
    ThumbsUp,
    Star,
    Tent,
    Award,
    Upload,
    type LucideIcon,
} from 'lucide-react'

/**
 * Badge icon keys (BadgeDefinition.icon in src/lib/badges.ts) -> lucide icon.
 * Keep this map in sync when adding a badge with a new icon key.
 */
export const BADGE_ICONS: Record<string, LucideIcon> = {
    target: Target,
    dumbbell: Dumbbell,
    flame: Flame,
    medal: Medal,
    trophy: Trophy,
    zap: Zap,
    handshake: Handshake,
    'thumbs-up': ThumbsUp,
    star: Star,
    tent: Tent,
    award: Award,
    upload: Upload,
}

interface BadgeIconProps {
    name: string | null | undefined
    className?: string
}

/** Renders a badge icon at 1em so it follows the surrounding font size. */
export default function BadgeIcon({ name, className }: BadgeIconProps) {
    const Icon = (name && BADGE_ICONS[name]) || Medal
    return <Icon className={className ?? 'inline-block h-[1em] w-[1em] align-[-0.125em]'} aria-hidden="true" />
}
