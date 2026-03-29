import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'

/**
 * @intent Calls the adaptive-ai Edge Function with enriched user behavioral data.
 * No longer gated by compliance threshold — runs on manual user trigger.
 * @returns {{ suggestion: string|null, loading: boolean, error: string|null, statusMsg: string|null, diagnose: function }}
 */
export function useAdaptiveAI() {
    const [suggestion, setSuggestion] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [statusMsg, setStatusMsg] = useState(null)

    /**
     * @intent Gathers enriched behavioral context and sends to AI for structural analysis
     */
    const diagnose = async () => {
        setLoading(true)
        setError(null)
        setSuggestion(null)
        setStatusMsg(null)

        try {
            // Get last 7 days
            const today = new Date()
            const dates = []
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                dates.push(d.toISOString().split('T')[0])
            }

            // Get day records
            const dayRecords = []
            for (const dateStr of dates) {
                const day = await db.days.get(dateStr)
                if (day) dayRecords.push(day)
            }

            if (dayRecords.length < 1) {
                setStatusMsg('Not enough data yet — use the system for at least 1 day first.')
                setLoading(false)
                return
            }

            // Get all blocks and their checklist templates
            const blocks = await db.time_blocks.toArray()
            const templates = await db.checklist_templates.toArray()

            // Get completions for the period
            const completions = await db.checklist_completions
                .where('date')
                .anyOf(dates)
                .toArray()
            const completedIds = completions.map(c => c.template_id)

            // Find the worst-performing block
            let worstBlock = null
            let worstScore = Infinity
            for (const block of blocks) {
                const blockTemplates = templates.filter(t => t.block_id === block.id)
                if (blockTemplates.length === 0) continue
                const completedCount = blockTemplates.filter(t => completedIds.includes(t.id)).length
                const score = completedCount / blockTemplates.length
                if (score < worstScore) {
                    worstScore = score
                    worstBlock = block
                }
            }

            // Gather failure events from Dexie (last 7 days)
            let failureEvents = []
            try {
                failureEvents = await db.failure_events.toArray()
                failureEvents = failureEvents
                    .filter(e => dates.includes(e.date))
                    .map(e => ({
                        rule_broken: e.rule_broken_id,
                        state: e.state_id,
                        emotion: e.prior_emotion
                    }))
            } catch (_) { /* table might not have data */ }

            // Gather urge events count
            let urgeCount = 0
            try {
                const urges = await db.urge_events.toArray()
                urgeCount = urges.filter(u => dates.includes(u.date)).length
            } catch (_) { /* table might not have data */ }

            // Build the enriched context
            const failureHistory = dayRecords.map(d => ({
                date: d.date,
                compliance: d.compliance_score,
                violations: d.violations,
                tasksCompleted: d.tasks_completed,
                deepWorkMinutes: d.deep_work_minutes
            }))

            const stateConfig = worstBlock ? {
                name: worstBlock.name,
                trigger: worstBlock.trigger_type || 'time',
                steps: templates.filter(t => t.block_id === worstBlock.id).map(t => t.label)
            } : null

            const allStates = blocks.map(b => ({
                name: b.name,
                start: b.start_time,
                end: b.end_time,
                isSleep: b.is_sleep,
                steps: templates.filter(t => t.block_id === b.id).map(t => t.label)
            }))

            // Call the Edge Function
            const { data, error: fnError } = await supabase.functions.invoke('adaptive-ai', {
                body: {
                    failureHistory,
                    stateConfig,
                    allStates,
                    failureEvents,
                    urgeCount
                }
            })

            if (fnError) throw fnError
            if (data?.suggestion) {
                setSuggestion(data.suggestion)

                // Persist last suggestion so it survives reload
                await db.user_preferences.put({
                    key: 'last_ai_suggestion',
                    value: JSON.stringify({
                        text: data.suggestion,
                        timestamp: new Date().toISOString()
                    })
                })
            } else {
                setStatusMsg('Analysis complete — no structural issues detected in your current pattern.')
            }
        } catch (e) {
            console.error('[AdaptiveAI] Diagnosis failed:', e)
            setError('AI diagnosis unavailable — check your connection and try again.')
        } finally {
            setLoading(false)
        }
    }

    return { suggestion, loading, error, statusMsg, diagnose }
}
