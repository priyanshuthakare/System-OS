const DAY_MS = 24 * 60 * 60 * 1000

export function toDayKey(input = new Date()) {
    const date = input instanceof Date ? input : new Date(input)
    return date.toISOString().split('T')[0]
}

export function parseDayKey(dayKey) {
    if (!dayKey) return null
    const parsed = new Date(`${dayKey}T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function daysBetweenDayKeys(startDayKey, endDayKey) {
    const start = parseDayKey(startDayKey)
    const end = parseDayKey(endDayKey)
    if (!start || !end) return 0
    return Math.floor((end.getTime() - start.getTime()) / DAY_MS)
}

export function subtractDays(dayKey, amount) {
    const date = parseDayKey(dayKey)
    if (!date) return dayKey
    date.setUTCDate(date.getUTCDate() - amount)
    return toDayKey(date)
}

export function addDays(dayKey, amount) {
    const date = parseDayKey(dayKey)
    if (!date) return dayKey
    date.setUTCDate(date.getUTCDate() + amount)
    return toDayKey(date)
}

export function isWithinRollingWindow(dayKey, referenceDayKey, windowDays) {
    const delta = daysBetweenDayKeys(dayKey, referenceDayKey)
    return delta >= 0 && delta < windowDays
}
