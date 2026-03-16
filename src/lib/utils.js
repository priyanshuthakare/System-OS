import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { db, getOrCreateDay } from './db'

/**
 * @intent Merge Tailwind classes safely (The Gravity-Well Utility)
 * @param {...any} inputs - Class strings, objects, or arrays
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

import { supabase } from './supabase'

/**
 * @intent Calculates how many of the Core Blocks are fully completed,
 * computes the compliance score, and synchronizes this to the `days` DB table for Identity logging.
 * Logs are synced to both local Dexie and remote Supabase.
 * @param {string} dateString 'YYYY-MM-DD'
 */
export async function syncDailyProgress(dateString) {
    if (!dateString) return

    try {
        // 1. Fetch all templates
        const templates = await db.checklist_templates.toArray();
        if (!templates || templates.length === 0) return;

        // 2. Fetch today's completions
        const completions = await db.checklist_completions.where('date').equals(dateString).toArray();
        const completedIds = completions.map(c => c.template_id);

        // 3. Group templates by block
        const blockRequirements = {}
        templates.forEach(t => {
            if (!blockRequirements[t.block_id]) blockRequirements[t.block_id] = []
            blockRequirements[t.block_id].push(t.id)
        })

        // 4. Count fully completed states/blocks
        let statesExecuted = 0
        const totalStates = Object.keys(blockRequirements).length
        
        Object.keys(blockRequirements).forEach(blockId => {
            const requiredItems = blockRequirements[blockId]
            const isFullyComplete = requiredItems.every(id => completedIds.includes(id))
            if (isFullyComplete) statesExecuted++
        })

        // 5. Hard limit to 5 (the core 5 responsibilities tracking limit per phase rules)
        const finalCount = Math.min(statesExecuted, 5)

        // 6. Calculate Compliance Score
        const day = await getOrCreateDay(dateString);
        let baseCompliance = totalStates > 0 ? (statesExecuted / totalStates) * 100 : 100;
        
        // Each violation deducts 5% (example logic)
        const violationsCount = day.violations || 0;
        const complianceScore = Math.max(0, Math.round(baseCompliance - (violationsCount * 5)));

        // 7. Push to local Dexie
        await db.days.update(dateString, { 
            tasks_completed: finalCount, // Note: DB schema retains "tasks_completed" for executed states locally
            compliance_score: complianceScore
        });

        // 8. Push to Supabase
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
            
            // Fetch exist day from Supabase to retain reflection & recovery data
            const { data: remoteDay } = await supabase
                .from('days')
                .select('id, recovery_count, daily_reflection, structural_violations')
                .eq('user_id', session.user.id)
                .eq('date', dateString)
                .single()

            const payload = {
                user_id: session.user.id,
                date: dateString,
                states_executed: finalCount,
                structural_violations: violationsCount,
                compliance_score: complianceScore,
                recovery_count: remoteDay?.recovery_count || 0,
                daily_reflection: remoteDay?.daily_reflection || null
            }

            if (remoteDay) {
                await supabase.from('days').update(payload).eq('id', remoteDay.id)
            } else {
                await supabase.from('days').insert(payload)
            }
        }
    } catch (e) {
        console.error("Failed to sync daily progress:", e)
    }
}
