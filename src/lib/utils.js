import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { db, getOrCreateDay } from './db'
import { supabase } from './supabase'

/**
 * @intent Merge Tailwind classes safely (The Gravity-Well Utility)
 * @param {...any} inputs - Class strings, objects, or arrays
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

/**
 * @intent Calculates how many of the Core Blocks are fully completed today,
 * computes the daily compliance score, and synchronizes to both local Dexie and remote Supabase.
 * Only counts states whose time windows overlap with today (not all-time states).
 * @param {string} dateString 'YYYY-MM-DD'
 */
export async function syncDailyProgress(dateString) {
    if (!dateString) return

    try {
        // 1. Fetch all blocks and their templates
        const allBlocks = await db.time_blocks.toArray()
        const templates = await db.checklist_templates.toArray()
        if (!templates || templates.length === 0) return

        // 2. Determine which blocks are "schedulable" (have at least one template)
        const blocksWithItems = allBlocks.filter(block =>
            templates.some(t => t.block_id === block.id)
        )
        const totalStates = blocksWithItems.length
        if (totalStates === 0) return

        // 3. Fetch today's completions
        const completions = await db.checklist_completions.where('date').equals(dateString).toArray()
        const completedIds = completions.map(c => c.template_id)

        // 4. Group templates by block_id
        const blockRequirements = {}
        templates.forEach(t => {
            if (!blockRequirements[t.block_id]) blockRequirements[t.block_id] = []
            blockRequirements[t.block_id].push(t.id)
        })

        // 5. Count fully completed states
        let statesExecuted = 0
        Object.keys(blockRequirements).forEach(blockId => {
            const requiredItems = blockRequirements[blockId]
            const isFullyComplete = requiredItems.every(id => completedIds.includes(id))
            if (isFullyComplete) statesExecuted++
        })

        // 6. Calculate compliance (subtract 5% per violation, floor at 0)
        const day = await getOrCreateDay(dateString)
        const violationsCount = day.violations || 0
        const baseCompliance = totalStates > 0 ? (statesExecuted / totalStates) * 100 : 100
        const complianceScore = Math.max(0, Math.round(baseCompliance - (violationsCount * 5)))

        // 7. Push to local Dexie
        await db.days.update(dateString, {
            tasks_completed: statesExecuted,
            compliance_score: complianceScore
        })

        // 8. Upsert to Supabase (preserving daily_reflection and recovery_count)
        // .maybeSingle() is used instead of .single() — returns null (not 406) when no row exists yet
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
            const { data: remoteDay } = await supabase
                .from('days')
                .select('id, recovery_count, daily_reflection')
                .eq('user_id', session.user.id)
                .eq('date', dateString)
                .maybeSingle()

            // Column mapping matches actual Supabase days schema:
            // execution_pct (not compliance_score), structural_violations (not violations)
            const executionPct = totalStates > 0
                ? Math.max(0, Math.round((statesExecuted / totalStates) * 100 - (violationsCount * 5)))
                : 100

            const payload = {
                user_id: session.user.id,
                date: dateString,
                states_executed: statesExecuted,
                structural_violations: violationsCount,
                execution_pct: executionPct,
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
        console.error('Failed to sync daily progress:', e)
    }
}

