import { EXPLICIT_FORMULA_DEFAULTS } from '../config/progressionConfig'
import { roundToInt, safeNumber } from '../utils/math'
import { daysBetweenDayKeys } from '../utils/time'

export function getMissedDays(lastActiveDayKey, currentDayKey) {
    if (!lastActiveDayKey || !currentDayKey) return 0
    const delta = daysBetweenDayKeys(lastActiveDayKey, currentDayKey)
    if (delta <= 0) return 0
    return Math.max(0, delta - 1)
}

export function calculateStreakBonusMultiplier(
    streakDays,
    streakBonusPerDay = EXPLICIT_FORMULA_DEFAULTS.streakBonusPerDay
) {
    const normalizedStreakDays = Math.max(0, roundToInt(streakDays))
    const normalizedBonus = Math.max(0, safeNumber(streakBonusPerDay, EXPLICIT_FORMULA_DEFAULTS.streakBonusPerDay))
    return 1 + (normalizedStreakDays * normalizedBonus)
}

export function calculateRecoveryBonusMultiplier({
    missedDays,
    isFirstCompletionOfDay,
    recoveryMissedDayThreshold = EXPLICIT_FORMULA_DEFAULTS.recoveryMissedDayThreshold,
    recoveryBonusMultiplier = 1
}) {
    const normalizedMissedDays = Math.max(0, roundToInt(missedDays))
    const threshold = Math.max(0, roundToInt(recoveryMissedDayThreshold))
    const multiplier = Math.max(1, safeNumber(recoveryBonusMultiplier, 1))

    if (!isFirstCompletionOfDay) return 1
    if (normalizedMissedDays < threshold) return 1

    return multiplier
}

/**
 * Resolves streak update after today XP changes.
 * - Streak extends only when `todayXpTotal >= minDailyXpThreshold`.
 * - Decay logic is configurable through decayMode.
 */
export function resolveStreakState({
    currentStreakDays,
    lastActiveDayKey,
    currentDayKey,
    todayXpTotal,
    minDailyXpThreshold,
    decayMode = 'reset',
    decayStep = 1
}) {
    const threshold = safeNumber(minDailyXpThreshold, NaN)
    if (!Number.isFinite(threshold) || threshold <= 0) {
        throw new Error('resolveStreakState requires a positive minDailyXpThreshold')
    }

    const normalizedCurrentStreak = Math.max(0, roundToInt(currentStreakDays))
    const todayXp = Math.max(0, safeNumber(todayXpTotal, 0))
    const qualifiedToday = todayXp >= threshold

    if (!lastActiveDayKey) {
        return {
            qualifiedToday,
            missedDays: 0,
            nextStreakDays: qualifiedToday ? 1 : 0
        }
    }

    if (lastActiveDayKey === currentDayKey) {
        return {
            qualifiedToday,
            missedDays: 0,
            nextStreakDays: normalizedCurrentStreak
        }
    }

    const missedDays = getMissedDays(lastActiveDayKey, currentDayKey)
    let streakAfterDecay = normalizedCurrentStreak

    if (missedDays > 0) {
        if (decayMode === 'linear') {
            const step = Math.max(0, roundToInt(decayStep))
            streakAfterDecay = Math.max(0, normalizedCurrentStreak - (missedDays * step))
        } else if (decayMode === 'none') {
            streakAfterDecay = normalizedCurrentStreak
        } else {
            streakAfterDecay = 0
        }
    }

    const nextStreakDays = qualifiedToday ? streakAfterDecay + 1 : streakAfterDecay

    return {
        qualifiedToday,
        missedDays,
        nextStreakDays
    }
}
