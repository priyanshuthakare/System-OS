import { EXPLICIT_FORMULA_DEFAULTS } from '../config/progressionConfig'
import { roundToInt, safeNumber } from '../utils/math'

function resolveLevelConfig(config) {
    return {
        levelCurveBase: safeNumber(config?.levelCurveBase, EXPLICIT_FORMULA_DEFAULTS.levelCurveBase),
        levelCurveExponent: safeNumber(config?.levelCurveExponent, EXPLICIT_FORMULA_DEFAULTS.levelCurveExponent),
    }
}

/**
 * XP needed to advance from `level` to `level + 1`.
 * Formula: XP_needed = 100 × level^1.5
 */
export function getXpNeededForLevel(level, config) {
    const { levelCurveBase, levelCurveExponent } = resolveLevelConfig(config)
    const numericLevel = Math.max(1, roundToInt(level))
    return roundToInt(levelCurveBase * Math.pow(numericLevel, levelCurveExponent))
}

export function getCumulativeXpForLevel(level, config) {
    const numericLevel = Math.max(1, roundToInt(level))
    let total = 0
    for (let current = 1; current < numericLevel; current++) {
        total += getXpNeededForLevel(current, config)
    }
    return total
}

export function getLevelFromTotalXp(totalXp, config) {
    let remainingXp = Math.max(0, safeNumber(totalXp, 0))
    let level = 1
    let guard = 0

    while (guard < 100000) {
        const requiredXp = getXpNeededForLevel(level, config)
        if (remainingXp < requiredXp) break
        remainingXp -= requiredXp
        level += 1
        guard += 1
    }

    return level
}

export function getLevelProgress(totalXp, config) {
    const xp = Math.max(0, safeNumber(totalXp, 0))
    const currentLevel = getLevelFromTotalXp(xp, config)
    const xpAtCurrentLevel = getCumulativeXpForLevel(currentLevel, config)
    const xpForNextLevel = getXpNeededForLevel(currentLevel, config)
    const xpIntoCurrentLevel = Math.max(0, xp - xpAtCurrentLevel)
    const progressPercentage = xpForNextLevel > 0
        ? Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpForNextLevel) * 100))
        : 100

    return {
        currentLevel,
        xpAtCurrentLevel,
        xpForNextLevel,
        xpToNextLevel: Math.max(0, xpForNextLevel - xpIntoCurrentLevel),
        xpIntoCurrentLevel,
        progressPercentage: Math.round(progressPercentage * 100) / 100
    }
}
