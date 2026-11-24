export const PROGRESSION_STAT_KEYS = Object.freeze([
    'strength',
    'focus',
    'discipline',
    'knowledge',
    'resilience',
    'social'
])

export const PROGRESSION_RANK_LABELS = Object.freeze([
    'E Rank',
    'D Rank',
    'C Rank',
    'B Rank',
    'A Rank',
    'S Rank',
    'Monarch'
])

export const EXPLICIT_FORMULA_DEFAULTS = Object.freeze({
    levelCurveBase: 100,
    levelCurveExponent: 1.5,
    repetitionPenaltyStep: 0.2,
    streakBonusPerDay: 0.05,
    rankWeightLast7Days: 0.7,
    rankWeightLast30Days: 0.3,
    recoveryMissedDayThreshold: 3
})

export const PROGRESSION_CONFIG_KEYS = Object.freeze({
    levelCurveBase: 'level_curve_base',
    levelCurveExponent: 'level_curve_exponent',
    repetitionPenaltyStep: 'xp_repetition_penalty_step',
    streakBonusPerDay: 'streak_bonus_per_day',
    rankWeightLast7Days: 'rank_weight_last_7_days',
    rankWeightLast30Days: 'rank_weight_last_30_days',
    recoveryMissedDayThreshold: 'recovery_missed_day_threshold'
})

export function toNumericConfigValue(rawValue, fallbackValue) {
    const parsed = Number(rawValue)
    return Number.isFinite(parsed) ? parsed : fallbackValue
}

export function normalizeStatTargets(statTargets) {
    if (!statTargets || typeof statTargets !== 'object') return {}

    const normalized = {}
    for (const statKey of PROGRESSION_STAT_KEYS) {
        const value = Number(statTargets[statKey])
        if (Number.isFinite(value) && value > 0) {
            normalized[statKey] = value
        }
    }
    return normalized
}

export function parseProgressionConfigRows(rows = []) {
    const asMap = rows.reduce((acc, row) => {
        if (row?.key) acc[row.key] = row.value
        return acc
    }, {})

    return {
        levelCurveBase: toNumericConfigValue(asMap[PROGRESSION_CONFIG_KEYS.levelCurveBase], EXPLICIT_FORMULA_DEFAULTS.levelCurveBase),
        levelCurveExponent: toNumericConfigValue(asMap[PROGRESSION_CONFIG_KEYS.levelCurveExponent], EXPLICIT_FORMULA_DEFAULTS.levelCurveExponent),
        repetitionPenaltyStep: toNumericConfigValue(asMap[PROGRESSION_CONFIG_KEYS.repetitionPenaltyStep], EXPLICIT_FORMULA_DEFAULTS.repetitionPenaltyStep),
        streakBonusPerDay: toNumericConfigValue(asMap[PROGRESSION_CONFIG_KEYS.streakBonusPerDay], EXPLICIT_FORMULA_DEFAULTS.streakBonusPerDay),
        rankWeightLast7Days: toNumericConfigValue(asMap[PROGRESSION_CONFIG_KEYS.rankWeightLast7Days], EXPLICIT_FORMULA_DEFAULTS.rankWeightLast7Days),
        rankWeightLast30Days: toNumericConfigValue(asMap[PROGRESSION_CONFIG_KEYS.rankWeightLast30Days], EXPLICIT_FORMULA_DEFAULTS.rankWeightLast30Days),
        recoveryMissedDayThreshold: toNumericConfigValue(
            asMap[PROGRESSION_CONFIG_KEYS.recoveryMissedDayThreshold],
            EXPLICIT_FORMULA_DEFAULTS.recoveryMissedDayThreshold
        ),
    }
}

export function parseRankThresholdRows(rows = []) {
    return rows
        .map(row => ({
            rank: row?.rank,
            min_score: Number(row?.min_score),
            sort_order: Number(row?.sort_order),
        }))
        .filter(row => PROGRESSION_RANK_LABELS.includes(row.rank) && Number.isFinite(row.min_score))
        .sort((a, b) => {
            if (Number.isFinite(a.sort_order) && Number.isFinite(b.sort_order)) {
                return a.sort_order - b.sort_order
            }
            return a.min_score - b.min_score
        })
}
