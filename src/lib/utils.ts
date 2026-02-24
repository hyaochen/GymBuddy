import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} 分鐘`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h} 小時 ${m} 分鐘` : `${h} 小時`
}

export function formatWeight(kg: number | string): string {
    const n = Number(kg)
    return n % 1 === 0 ? `${n}` : n.toFixed(1)
}

export function epley1rm(weight: number, reps: number): number {
    if (reps === 1) return weight
    return Math.round(weight * (1 + reps / 30) * 4) / 4
}

export function formatRestSeconds(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m === 0) return `${s}秒`
    return s > 0 ? `${m}分${s}秒` : `${m}分鐘`
}

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' })
}

export function formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('zh-TW', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}
