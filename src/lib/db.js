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
