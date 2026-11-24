import Dexie from 'dexie';

export const db = new Dexie('StabilityOS');

// v1 → original schema
db.version(1).stores({
    profiles: '++id, phase_id, start_date',
    days: 'date, tasks_completed, violations, deep_work_minutes, compliance_score',
    time_blocks: '++id, name, start_time, end_time, is_keystone, is_sleep, ui_color, sort_order',
    checklist_templates: '++id, block_id, label, has_timer, time_estimate_mins, is_locked, sort_order',
    checklist_completions: '[template_id+date], template_id, date, completed_at',
    rules: '++id, title, violation_type, description',
    rule_violations: '++id, rule_id, date, time',
    urge_events: '++id, date, time, passed, trigger_note',
    failure_events: '++id, date, time, rule_broken_id, state_id, prior_emotion, action_taken',
    weekly_reviews: '++id, week_start_date, compliance_pct, relapse_count, deep_work_hrs, friction_note, unstable_note, increase_note, decrease_note',
    journal_entries: '++id, date, stress_note, avoidance_note, control_note',
    phases: '++id, name, required_compliance_pct, required_days',
    user_preferences: 'key',
});

// v2 → adds active_days (behavioral day counter) to profiles
db.version(2).stores({
    profiles: '++id, phase_id, start_date, active_days, last_active_date',
}).upgrade(tx => {
    return tx.table('profiles').toCollection().modify(profile => {
        if (profile.active_days === undefined) profile.active_days = 1
        if (profile.last_active_date === undefined) profile.last_active_date = null
    })
});

// v3 → adds brain_baseline (onboarding dysregulation capture) and region_streaks (healing progress)
db.version(3).stores({
    brain_baseline: '++id, capturedAt',
    region_streaks: 'region, streak_days, last_updated',
});

// v4 → progression engine schema (local-first RPG progression + anti-cheat + leaderboard snapshots)
db.version(4).stores({
    profiles: '++id, phase_id, start_date, active_days, last_active_date, tier_status',
    days: 'date, tasks_completed, violations, deep_work_minutes, compliance_score',
    time_blocks: '++id, name, start_time, end_time, is_keystone, is_sleep, ui_color, sort_order',
    checklist_templates: '++id, block_id, label, has_timer, time_estimate_mins, is_locked, sort_order, category, progression_task_id',
    checklist_completions: '[template_id+date], template_id, date, completed_at',
    rules: '++id, title, violation_type, description',
    rule_violations: '++id, rule_id, date, time',
    urge_events: '++id, date, time, passed, trigger_note',
    failure_events: '++id, date, time, rule_broken_id, state_id, prior_emotion, action_taken',
    weekly_reviews: '++id, week_start_date, compliance_pct, relapse_count, deep_work_hrs, friction_note, unstable_note, increase_note, decrease_note',
    journal_entries: '++id, date, stress_note, avoidance_note, control_note',
    phases: '++id, name, required_compliance_pct, required_days',
    user_preferences: 'key',
    brain_baseline: '++id, capturedAt',
    region_streaks: 'region, streak_days, last_updated',

    // Requested core progression tables
    users: 'id, username, xp_total, level, rank_score, current_rank, streak_days, created_at, last_active_date',
    stats: 'user_id, strength, focus, discipline, knowledge, resilience, social, updated_at',
    tasks: 'id, title, category, base_xp, difficulty_multiplier, repeat_penalty_enabled, is_low_value, max_repetitions_per_day',
    task_logs: 'id, user_id, task_id, completed_at, day_key, xp_awarded, repetition_count_same_day, bonus_applied, [user_id+task_id+day_key], [user_id+day_key], [user_id+completed_at]',
    titles: 'id, user_id, name, unlocked_at',
    leaderboard_snapshots: 'id, user_id, captured_at, score, weekly_score, monthly_score, board_type, board_scope, [user_id+captured_at], [board_type+captured_at]',

    // Supporting production tables
    rank_thresholds: 'rank, min_score, sort_order',
    progression_config: 'key',
    stat_progress: 'id, user_id, stat_key, xp_total, level, updated_at, [user_id+stat_key]',
    boss_challenges: 'id, category, created_at',
    boss_attempts: 'id, user_id, boss_id, status, started_at, completed_at, [user_id+boss_id]',
    manual_override_logs: 'id, user_id, entity_type, entity_id, created_at',
    anti_cheat_events: 'id, user_id, task_id, event_type, created_at, [user_id+event_type], [user_id+task_id+created_at]',
    sync_outbox: 'id, event_type, status, created_at, attempts, last_attempt_at',
}).upgrade(async tx => {
    const configRows = await tx.table('progression_config').toArray()
    const existingKeys = new Set(configRows.map(row => row.key))
    const seedRows = [
        { key: 'level_curve_base', value: '100' },
        { key: 'level_curve_exponent', value: '1.5' },
        { key: 'xp_repetition_penalty_step', value: '0.2' },
        { key: 'streak_bonus_per_day', value: '0.05' },
        { key: 'rank_weight_last_7_days', value: '0.7' },
        { key: 'rank_weight_last_30_days', value: '0.3' },
        { key: 'recovery_missed_day_threshold', value: '3' },
        { key: 'rank_labels', value: JSON.stringify(['E Rank', 'D Rank', 'C Rank', 'B Rank', 'A Rank', 'S Rank', 'Monarch']) }
    ].filter(row => !existingKeys.has(row.key))

    if (seedRows.length) {
        await tx.table('progression_config').bulkPut(seedRows)
    }

    const thresholdRows = await tx.table('rank_thresholds').toArray()
    if (thresholdRows.length === 0) {
        await tx.table('rank_thresholds').bulkPut([
            { rank: 'E Rank', min_score: 0, sort_order: 0 },
            { rank: 'D Rank', min_score: 50, sort_order: 1 },
            { rank: 'C Rank', min_score: 200, sort_order: 2 },
            { rank: 'B Rank', min_score: 500, sort_order: 3 },
            { rank: 'A Rank', min_score: 1200, sort_order: 4 },
            { rank: 'S Rank', min_score: 3000, sort_order: 5 },
            { rank: 'Monarch', min_score: 8000, sort_order: 6 },
        ])
    }

    const bossRows = await tx.table('boss_challenges').toArray()
    if (bossRows.length === 0) {
        await tx.table('boss_challenges').bulkPut([
            {
                id: 'boss_no_procrastination_7d',
                name: '7-Day No Procrastination',
                description: 'Complete all daily tasks for 7 consecutive days without skipping any.',
                category: 'discipline',
                duration_days: 7,
                reward_xp: 500,
                reward_rank_boost: 100,
                reward_title: 'Willbreaker',
                is_active: true,
                created_at: new Date().toISOString()
            },
            {
                id: 'boss_30d_consistency',
                name: '30-Day Consistency',
                description: 'Maintain an active streak for 30 days straight.',
                category: 'resilience',
                duration_days: 30,
                reward_xp: 2000,
                reward_rank_boost: 400,
                reward_title: 'Unbreakable',
                is_active: true,
                created_at: new Date().toISOString()
            },
            {
                id: 'boss_deep_focus_14d',
                name: '14-Day Deep Focus',
                description: 'Complete at least one deep work session every day for 14 days.',
                category: 'focus',
                duration_days: 14,
                reward_xp: 800,
                reward_rank_boost: 200,
                reward_title: 'Mind Fortress',
                is_active: true,
                created_at: new Date().toISOString()
            }
        ])
    }
});

/**
 * @intent Get or create a day record for local metrics tracking
 * @param {string} dateString - YYYY-MM-DD format
 */
export async function getOrCreateDay(dateString) {
    let day = await db.days.get(dateString);
    if (!day) {
        day = { date: dateString, tasks_completed: 0, violations: 0, deep_work_minutes: 0, compliance_score: 100 };
        await db.days.add(day);
    }
    return day;
}

/**
 * @intent Increments the active_days counter in the user's Dexie profile.
 * Only fires once per calendar day. Guards with last_active_date comparison.
 * @param {string} todayStr - YYYY-MM-DD
 */
export async function incrementActiveDayIfNeeded(todayStr) {
    try {
        const profile = await db.profiles.get(1)
        if (!profile) return

        if (profile.last_active_date === todayStr) return // already counted today

        await db.profiles.update(1, {
            active_days: (profile.active_days || 1) + 1,
            last_active_date: todayStr
        })
    } catch (e) {
        console.warn('[db] incrementActiveDayIfNeeded failed:', e)
    }
}
