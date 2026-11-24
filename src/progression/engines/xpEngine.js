import { EXPLICIT_FORMULA_DEFAULTS } from '../config/progressionConfig'
import { clamp, roundToInt, safeNumber } from '../utils/math'

export function calculateRawXp({
    baseXp,
    difficultyMultiplier,
    consistencyMultiplier,
    dynamicAdjustment = 1
}) {
    const base = Math.max(0, safeNumber(baseXp, 0))
    const difficulty = Math.max(0, safeNumber(difficultyMultiplier, 0))
    const consistency = Math.max(0, safeNumber(consistencyMultiplier, 1))
    const adjustment = Math.max(0, safeNumber(dynamicAdjustment, 1))
    return base * difficulty * consistency * adjustment
}

/**
 * Diminishing returns:
 * XP_final = XP / (1 + repetition_count * 0.2)
 * where repetition_count is prior completions of the same task on the same day.
 */
export function applyRepetitionPenalty({
    xp,
    repetitionCount = 0,
    penaltyStep = EXPLICIT_FORMULA_DEFAULTS.repetitionPenaltyStep
}) {
    const normalizedXp = Math.max(0, safeNumber(xp, 0))
    const normalizedRepetitionCount = Math.max(0, roundToInt(repetitionCount))
    const normalizedPenaltyStep = Math.max(0, safeNumber(penaltyStep, EXPLICIT_FORMULA_DEFAULTS.repetitionPenaltyStep))

    const denominator = 1 + (normalizedRepetitionCount * normalizedPenaltyStep)
    if (denominator <= 0) return 0
    return normalizedXp / denominator
}

/**
 * Low-value anti-domination rule:
 * cumulative low-value XP for the day must never exceed non-low-value XP.
 */
export function applyLowValueDominanceGuard({
    xp,
    isLowValueTask = false,
    lowValueXpToday = 0,
    nonLowValueXpToday = 0
}) {
    const normalizedXp = Math.max(0, safeNumber(xp, 0))
    if (!isLowValueTask) return normalizedXp

    const lowValueTotal = Math.max(0, safeNumber(lowValueXpToday, 0))
    const nonLowValueTotal = Math.max(0, safeNumber(nonLowValueXpToday, 0))
    const remainingAllowance = Math.max(0, nonLowValueTotal - lowValueTotal)

    return clamp(normalizedXp, 0, remainingAllowance)
}

export function calculateXpAward({
    baseXp,
    difficultyMultiplier,
    consistencyMultiplier,
    repetitionCount,
    dynamicAdjustment = 1,
    penaltyStep = EXPLICIT_FORMULA_DEFAULTS.repetitionPenaltyStep,
    isLowValueTask = false,
    lowValueXpToday = 0,
    nonLowValueXpToday = 0
}) {
    const rawXp = calculateRawXp({
        baseXp,
        difficultyMultiplier,
        consistencyMultiplier,
        dynamicAdjustment
    })

    const repetitionAdjustedXp = applyRepetitionPenalty({
        xp: rawXp,
        repetitionCount,
        penaltyStep
    })

    const guardedXp = applyLowValueDominanceGuard({
        xp: repetitionAdjustedXp,
        isLowValueTask,
        lowValueXpToday,
        nonLowValueXpToday
    })

    const xpAwarded = roundToInt(Math.max(0, guardedXp))

    return {
        rawXp,
        repetitionAdjustedXp,
        guardedXp,
        xpAwarded
    }
}
