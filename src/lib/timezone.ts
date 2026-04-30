export const APP_TIME_ZONE = 'Asia/Taipei'

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
})

const MONTH_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
})

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    weekday: 'short',
})
const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
}

export function taipeiDateKey(date: Date = new Date()): string {
    return DATE_KEY_FORMATTER.format(date)
}

export function parseTaipeiDateInput(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) {
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date')
        return parsed
    }

    const [, y, m, d] = match
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), -8, 0, 0, 0))
}

export function startOfTaipeiDayUtc(date: Date = new Date()): Date {
    return parseTaipeiDateInput(taipeiDateKey(date))
}

export function addTaipeiDays(date: Date, days: number): Date {
    const start = startOfTaipeiDayUtc(date)
    start.setUTCDate(start.getUTCDate() + days)
    return start
}

export function startOfTaipeiWeekUtc(date: Date = new Date(), weekStartsOn = 0): Date {
    const start = startOfTaipeiDayUtc(date)
    const localDay = WEEKDAY_INDEX[WEEKDAY_FORMATTER.format(start)] ?? start.getUTCDay()
    const diff = (localDay - weekStartsOn + 7) % 7
    return addTaipeiDays(start, -diff)
}

export function formatTaipeiMonthDay(date: Date): string {
    return MONTH_DAY_FORMATTER.format(date)
}

export function diffTaipeiDateKeys(later: string, earlier: string): number {
    const laterDate = parseTaipeiDateInput(later)
    const earlierDate = parseTaipeiDateInput(earlier)
    return Math.round((laterDate.getTime() - earlierDate.getTime()) / 86400000)
}
