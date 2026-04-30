import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { taipeiDateKey } from "@/lib/timezone"

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
    return d.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: 'short', day: 'numeric', weekday: 'short' })
}

export function formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// YYYY-MM-DD in the app's timezone (Asia/Taipei). Single source of truth for
// date-keying across streak, heatmap, charts, analytics — every previous copy
// used toISOString().split('T')[0] which is UTC and caused off-by-one for
// sessions finished past local midnight.
export function toDateKey(d: Date): string {
    return taipeiDateKey(d)
}

// Volume for a single set. Time-based sets (durationSeconds != null) don't
// contribute to weight-volume — returns 0.
interface VolumeSet {
    durationSeconds: number | null
    weightKg: number | string | { toNumber: () => number }
    repsPerformed: number
}
export function calcSetVolume(set: VolumeSet): number {
    if (set.durationSeconds) return 0
    return Number(set.weightKg) * set.repsPerformed
}

// Volume for an array of sets (or an array of sessionExercises each with .sets).
export function sumSetsVolume(sets: VolumeSet[]): number {
    return sets.reduce((acc, s) => acc + calcSetVolume(s), 0)
}

// Exercise name splits on " / " to grab the Chinese half when available.
// Shared convention across EquipmentStats, ProgressChart, history, session pages.
export function exName(name: string | null | undefined): string {
    if (!name) return ''
    const idx = name.indexOf(' / ')
    return idx >= 0 ? name.slice(idx + 3) : name
}
