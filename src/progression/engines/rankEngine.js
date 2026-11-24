import {
    EXPLICIT_FORMULA_DEFAULTS,
    PROGRESSION_RANK_LABELS,
    parseRankThresholdRows
} from '../config/progressionConfig'
import { safeNumber } from '../utils/math'
import { isWithinRollingWindow, toDayKey } from '../utils/time'

export function calculateRankScore({
    xpLast7Days,
    xpLast30Days,
    weightLast7Days = EXPLICIT_FORMULA_DEFAULTS.rankWeightLast7Days,
    weightLast30Days = EXPLICIT_FORMULA_DEFAULTS.rankWeightLast30Days
}) {
    const score7 = Math.max(0, safeNumber(xpLast7Days, 0))
    const score30 = Math.max(0, safeNumber(xpLast30Days, 0))
    const weight7 = safeNumber(weightLast7Days, EXPLICIT_FORMULA_DEFAULTS.rankWeightLast7Days)
    const weight30 = safeNumber(weightLast30Days, EXPLICIT_FORMULA_DEFAULTS.rankWeightLast30Days)

    return (score7 * weight7) + (score30 * weight30)
}

export function sumRollingXp(taskLogs = [], referenceDayKey = toDayKey()) {
    let xpLast7Days = 0
    let xpLast30Days = 0

    for (const log of taskLogs) {
        const dayKey = log?.day_key || toDayKey(log?.completed_at)
        const xpAwarded = Math.max(0, safeNumber(log?.xp_awarded, 0))

        if (isWithinRollingWindow(dayKey, referenceDayKey, 7)) {
            xpLast7Days += xpAwarded
        }
        if (isWithinRollingWindow(dayKey, referenceDayKey, 30)) {
            xpLast30Days += xpAwarded
        }
    }

    return { xpLast7Days, xpLast30Days }
}

export function resolveRankLabel(rankScore, rankThresholdRows = []) {
    const normalizedScore = Math.max(0, safeNumber(rankScore, 0))
    const thresholds = parseRankThresholdRows(rankThresholdRows)

    if (thresholds.length === 0) return 'E Rank'

    let resolvedRank = thresholds[0].rank
    for (const threshold of thresholds) {
        if (normalizedScore >= threshold.min_score) {
            resolvedRank = threshold.rank
        } else {
            break
        }
    }

    return PROGRESSION_RANK_LABELS.includes(resolvedRank) ? resolvedRank : 'E Rank'
}

export function calculateRankState({
    taskLogs = [],
    rankThresholdRows = [],
    referenceDayKey = toDayKey(),
    weightLast7Days = EXPLICIT_FORMULA_DEFAULTS.rankWeightLast7Days,
    weightLast30Days = EXPLICIT_FORMULA_DEFAULTS.rankWeightLast30Days
}) {
    const { xpLast7Days, xpLast30Days } = sumRollingXp(taskLogs, referenceDayKey)
    const rankScore = calculateRankScore({
        xpLast7Days,
        xpLast30Days,
        weightLast7Days,
        weightLast30Days
    })
    const currentRank = resolveRankLabel(rankScore, rankThresholdRows)

    return {
        xpLast7Days,
        xpLast30Days,
        rankScore,
        currentRank
    }
}
