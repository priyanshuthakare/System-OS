import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { useAuthStore } from '../store/useAuthStore'

/**
 * @intent Cloud-Local sync engine — pulls user data from Supabase into Dexie for 0ms UI latency
 */
export function useSyncEngine() {
    const user = useAuthStore(s => s.user)

    /**
     * Full sync: Wipe local tables and repopulate from Supabase.
     * Call after login and after any mutation in SettingsView.
     */
    const syncAll = useCallback(async () => {
        if (!user) return

        try {
            // 1. Fetch remote states
            const { data: states, error: statesErr } = await supabase
                .from('states')
                .select('*')
                .eq('user_id', user.id)
                .order('sort_order')

            if (statesErr) {
                console.error('Sync states failed:', statesErr.message)
                return
            }

            // 2. Fetch remote checklists
            const { data: checklists, error: checkErr } = await supabase
                .from('checklists')
                .select('*')
                .eq('user_id', user.id)
                .order('sort_order')

            if (checkErr) {
                console.error('Sync checklists failed:', checkErr.message)
                return
            }

            // 3. Fetch remote rules
            const { data: rules, error: rulesErr } = await supabase
                .from('rules')
                .select('*')
                .eq('user_id', user.id)

            if (rulesErr) {
                console.error('Sync rules failed:', rulesErr.message)
            }

            // 4. Destructive overwrite of local Dexie tables (Without transaction wrapper to prevent Dexie zone lock-ups)
            console.log('[SyncEngine] Beginning local cache wipe...')
            
            // Clear existing local data
            await db.time_blocks.clear()
            await db.checklist_templates.clear()
            await db.rules.clear()
            await db.phases.clear()
            await db.profiles.clear()

            console.log('[SyncEngine] Applying remote data...')
            // Map Supabase states → Dexie time_blocks
            if (states?.length) {
                const blocks = states.map(s => ({
                    id: s.id,
                    name: s.name,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    is_keystone: s.is_keystone || false,
                    is_sleep: s.is_sleep || false,
                    ui_color: s.ui_color || 'bg-surface2',
                    sort_order: s.sort_order || 0,
                    // Extended fields from Supabase
                    trigger_type: s.trigger_type,
                    trigger_value: s.trigger_value,
                    risk_behavior: s.risk_behavior,
                    unlock_reward: s.unlock_reward,
                    lock_type: s.lock_type
                }))
                await db.time_blocks.bulkAdd(blocks)
            }

            // Map Supabase checklists → Dexie checklist_templates
            if (checklists?.length) {
                const templates = checklists.map(c => ({
                    id: c.id,
                    block_id: c.state_id,
                    label: c.label,
                    has_timer: c.has_timer || false,
                    time_estimate_mins: c.time_estimate_mins || 5,
                    is_locked: c.is_locked || false,
                    sort_order: c.sort_order || 0,
                    category: c.category
                }))
                await db.checklist_templates.bulkAdd(templates)
            }

            // Map Supabase rules → Dexie rules (seed defaults if empty)
            if (rules?.length) {
                const localRules = rules.map(r => ({
                    id: r.id,
                    title: r.title,
                    violation_type: r.violation_type || 'Structural Failure',
                    description: r.description || ''
                }))
                await db.rules.bulkAdd(localRules)
            } else {
                // Seed 4 default structural rules for new users
                const DEFAULT_RULES = [
                    { title: 'No laptop on bed', violation_type: 'Structural Failure', description: 'Laptop must stay at desk' },
                    { title: 'No screens lying down', violation_type: 'Structural Failure', description: 'All screen use must be seated upright' },
                    { title: 'WiFi off by shutdown', violation_type: 'Structural Failure', description: 'WiFi router off at shutdown time' },
                    { title: 'Reset before scroll', violation_type: 'Structural Failure', description: 'Complete 4PM reset before any social media' }
                ]

                const insertedRules = []
                for (const rule of DEFAULT_RULES) {
                    const { data, error: insertErr } = await supabase
                        .from('rules')
                        .insert({ user_id: user.id, ...rule })
                        .select('id')
                        .single()

                    if (!insertErr && data) {
                        insertedRules.push({ id: data.id, ...rule })
                    }
                }

                if (insertedRules.length) {
                    await db.rules.bulkAdd(insertedRules)
                }
                console.log(`[SyncEngine] Seeded ${insertedRules.length} default rules`)
            }

            // Seed phases (global, never user-editable)
            await db.phases.bulkAdd([
                { id: 1, name: 'Phase 1 - Stability', required_compliance_pct: 80, required_days: 30 },
                { id: 2, name: 'Phase 2 - Execution', required_compliance_pct: 80, required_days: 30 },
                { id: 3, name: 'Phase 3 - Expansion', required_compliance_pct: 90, required_days: 30 }
            ])

            // Pull profile from Supabase to get real phase_id, start_date, and tier_status
            const { data: remoteProfile } = await supabase
                .from('profiles')
                .select('phase_id, start_date, created_at, tier_status')
                .eq('id', user.id)
                .single()

            // Only insert local profile if it doesn't already exist (preserves start_date across syncs)
            const existingProfile = await db.profiles.get(1)
            const todayStr = new Date().toISOString().split('T')[0]
            if (!existingProfile) {
                await db.profiles.add({
                    id: 1,
                    phase_id: remoteProfile?.phase_id || 1,
                    start_date: remoteProfile?.start_date || remoteProfile?.created_at?.split('T')[0] || todayStr,
                    tier_status: remoteProfile?.tier_status || 'free',
                    active_days: 1,
                    last_active_date: todayStr
                })
            } else {
                // Update phase_id and tier_status if changed in Supabase, keep existing start_date + active_days
                await db.profiles.update(1, {
                    phase_id: remoteProfile?.phase_id || existingProfile.phase_id,
                    tier_status: remoteProfile?.tier_status || existingProfile.tier_status || 'free'
                })
            }

            // Seed user preferences from onboarding data (urge steps, recovery actions, diagnostics)
            await db.user_preferences.clear()

            // Derive physical anchors from the user's first state's checklists (onboarding "helps")
            const physicalChecklists = checklists?.filter(c => c.category === 'physical') || []
            const physicalAnchors = [...new Set(physicalChecklists.map(c => c.label))].slice(0, 3)
            const defaultAnchors = ['Stand up now', 'Drink water', 'Walk 2 minutes']
            const anchors = physicalAnchors.length > 0 ? physicalAnchors : defaultAnchors

            await db.user_preferences.bulkPut([
                {
                    key: 'urge_steps',
                    value: JSON.stringify([
                        anchors[0] || 'Stand up now',
                        anchors[1] || 'Cold water',
                        anchors[2] || '3-min breathe',
                        'Write what triggered this',
                        'Redirect to scheduled task'
                    ])
                },
                {
                    key: 'urge_timer_minutes',
                    value: '10'
                },
                {
                    key: 'recovery_actions',
                    value: JSON.stringify([
                        anchors[0] || '10 pushups',
                        'Drink a full glass of water',
                        anchors[1] || 'Walk for 2 minutes',
                        '30 seconds deep breathing',
                        'Cold water face rinse'
                    ])
                },
                {
                    key: 'failure_immediate_actions',
                    value: JSON.stringify([
                        `${anchors[0] || '10 pushups'}. Right now.`,
                        'Write 3 lines below',
                        'Resume scheduled block'
                    ])
                },
                {
                    key: 'failure_rules',
                    value: JSON.stringify(['Laptop on bed', 'Screens down', 'WiFi on', 'Scrolled early', 'None'])
                },
                {
                    key: 'failure_phases',
                    value: JSON.stringify((states || []).map(s => s.name).concat(['Other']))
                },
                {
                    key: 'failure_emotions',
                    value: JSON.stringify(['Boredom', 'Anxiety', 'Loneliness', 'Fatigue', 'Frustration'])
                }
            ])

            // Sync recent days (last 7 days) from Supabase to local Dexie for offline Closure page
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const syncStartDate = sevenDaysAgo.toISOString().split('T')[0]

            const { data: recentDays, error: daysErr } = await supabase
                .from('days')
                .select('date, states_executed, structural_violations, recovery_count, deep_work_minutes, daily_reflection')
                .eq('user_id', user.id)
                .gte('date', syncStartDate)

            if (daysErr) {
                console.warn('[SyncEngine] Days sync failed:', daysErr.message)
            } else if (recentDays?.length) {
                for (const day of recentDays) {
                    const localDay = await db.days.get(day.date)
                    await db.days.put({
                        date: day.date,
                        tasks_completed: localDay?.tasks_completed ?? (day.states_executed || 0),
                        violations: localDay?.violations ?? (day.structural_violations || 0),
                        deep_work_minutes: day.deep_work_minutes || localDay?.deep_work_minutes || 0,
                        compliance_score: localDay?.compliance_score || 0,
                        recovery_count: day.recovery_count || 0,
                        daily_reflection: day.daily_reflection || localDay?.daily_reflection || null
                    })
                }
                console.log(`[SyncEngine] Synced ${recentDays.length} recent days`)
            }

            console.log(`[SyncEngine] SUCCESS: Synced ${states?.length || 0} states, ${checklists?.length || 0} checklists, ${rules?.length || 0} rules`)

        } catch (e) {
            console.error('[SyncEngine] Sync failed:', e)
        }
    }, [user])

    return { syncAll }
}
