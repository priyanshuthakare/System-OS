/**
 * @typedef {'strength' | 'focus' | 'discipline' | 'knowledge' | 'resilience' | 'social'} ProgressionStatKey
 */

/**
 * @typedef {'E Rank' | 'D Rank' | 'C Rank' | 'B Rank' | 'A Rank' | 'S Rank' | 'Monarch'} RankLabel
 */

/**
 * @typedef {Object} ProgressionUser
 * @property {string} id
 * @property {string} username
 * @property {number} xp_total
 * @property {number} level
 * @property {number} rank_score
 * @property {RankLabel | null} current_rank
 * @property {number} streak_days
 * @property {string} created_at
 * @property {string | null} last_active_date
 */

/**
 * @typedef {Object} ProgressionStats
 * @property {string} user_id
 * @property {number} strength
 * @property {number} focus
 * @property {number} discipline
 * @property {number} knowledge
 * @property {number} resilience
 * @property {number} social
 * @property {string} updated_at
 */

/**
 * @typedef {Object} ProgressionTask
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {number} base_xp
 * @property {number} difficulty_multiplier
 * @property {boolean} repeat_penalty_enabled
 * @property {Object<string, number>} stat_targets
 * @property {boolean} [is_low_value]
 * @property {number} [max_repetitions_per_day]
 * @property {number} [min_completion_interval_mins]
 */

/**
 * @typedef {Object} ProgressionTaskLog
 * @property {string} id
 * @property {string} user_id
 * @property {string} task_id
 * @property {string} completed_at
 * @property {string} day_key
 * @property {number} xp_awarded
 * @property {number} repetition_count_same_day
 * @property {Object<string, number | string | boolean>} bonus_applied
 */

/**
 * @typedef {Object} ProgressionTitle
 * @property {string} id
 * @property {string} user_id
 * @property {string} name
 * @property {Object<string, unknown>} unlock_condition
 * @property {string} unlocked_at
 */

/**
 * @typedef {Object} LeaderboardSnapshot
 * @property {string} id
 * @property {string} user_id
 * @property {number} score
 * @property {number} weekly_score
 * @property {number} monthly_score
 * @property {string} captured_at
 * @property {string} [board_type]
 * @property {string} [board_scope]
 */

/**
 * @typedef {Object} RankThreshold
 * @property {RankLabel} rank
 * @property {number} min_score
 * @property {number} [sort_order]
 */

/**
 * @typedef {Object} StatProgress
 * @property {string} id
 * @property {string} user_id
 * @property {ProgressionStatKey} stat_key
 * @property {number} xp_total
 * @property {number} level
 * @property {string} updated_at
 */

export const PROGRESSION_MODEL_VERSION = 1

export function createEmptyStatsRow(userId, nowIso = new Date().toISOString()) {
    return {
        user_id: userId,
        strength: 0,
        focus: 0,
        discipline: 0,
        knowledge: 0,
        resilience: 0,
        social: 0,
        updated_at: nowIso
    }
}

export function createInitialProgressionUser(userId, username, nowIso = new Date().toISOString()) {
    return {
        id: userId,
        username: username || 'Hunter',
        xp_total: 0,
        level: 1,
        rank_score: 0,
        current_rank: 'E Rank',
        streak_days: 0,
        created_at: nowIso,
        last_active_date: null
    }
}
