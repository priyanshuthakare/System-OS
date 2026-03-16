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

            // Map Supabase rules → Dexie rules
            if (rules?.length) {
                const localRules = rules.map(r => ({
                    id: r.id,
                    title: r.title,
                    violation_type: r.violation_type || 'Structural Failure',
                    description: r.description || ''
                }))
                await db.rules.bulkAdd(localRules)
            }

            // Seed phases (global, never user-editable)
            await db.phases.bulkAdd([
                { id: 1, name: 'Phase 1 - Stability', required_compliance_pct: 80, required_days: 30 },
                { id: 2, name: 'Phase 2 - Execution', required_compliance_pct: 80, required_days: 30 },
                { id: 3, name: 'Phase 3 - Expansion', required_compliance_pct: 90, required_days: 30 }
            ])

            // Create minimal local profile
            await db.profiles.add({
                id: 1,
                phase_id: 1,
                start_date: new Date().toISOString().split('T')[0]
            })

            console.log(`[SyncEngine] SUCCESS: Synced ${states?.length || 0} states, ${checklists?.length || 0} checklists, ${rules?.length || 0} rules`)
        } catch (e) {
            console.error('[SyncEngine] Sync failed:', e)
        }
    }, [user])

    return { syncAll }
}
