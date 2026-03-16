import Dexie from 'dexie';

export const db = new Dexie('StabilityOS');

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
});

// No hardcoded seeds — Supabase is the source of truth.
// The useSyncEngine hook pulls user data from Supabase into these local tables on login.

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
