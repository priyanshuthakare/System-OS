import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'

/**
 * @intent Calls the adaptive-ai Edge Function with richly structured behavioral data.
 *         Data sources: Dexie (local) for completions/violations, Supabase for reflections.
 * @returns {{ suggestion: string|null, loading: boolean, error: string|null, statusMsg: string|null, diagnose: function }}
 */
export function useAdaptiveAI() {
    const [suggestion, setSuggestion] = useState(null)
    const [loading, setLoading]       = useState(false)
    const [error, setError]           = useState(null)
    const [statusMsg, setStatusMsg]   = useState(null)


    const diagnose = async () => {
        setLoading(true)
        setError(null)
        setSuggestion(null)
        setStatusMsg(null)

        try {
            //──────────────────────────────────────────────────
            // 1. Build date range (last 7 calendar days)
            //──────────────────────────────────────────────────
            const today = new Date()
            const dates = []
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                dates.push(d.toISOString().split('T')[0])
            }

            //──────────────────────────────────────────────────
            // 2. Day-level records (compliance, violations, deep work)
            //──────────────────────────────────────────────────
            const dayRecords = []
            for (const ds of dates) {
                const day = await db.days.get(ds)
                if (day) dayRecords.push(day)
            }

            if (dayRecords.length < 1) {
                setStatusMsg('Not enough data yet — use the system for at least one day first.')
                setLoading(false)
                return
            }

            //──────────────────────────────────────────────────
            // 3. Templates + completions — per-day, per-category rates
            //──────────────────────────────────────────────────
            const blocks    = await db.time_blocks.toArray()
            const templates = await db.checklist_templates.toArray()

            const allCompletions = await db.checklist_completions
                .where('date').anyOf(dates).toArray()

            // Per-day category completion rates (physical / grounding / target)
            const dailyCategoryRates = dates.map(ds => {
                const dayCompletions = allCompletions.filter(c => c.date === ds)
                const completedIds   = new Set(dayCompletions.map(c => c.template_id))

                const rate = cat => {
                    const catItems = templates.filter(t => t.category === cat)
                    if (!catItems.length) return null
                    return Math.round((catItems.filter(t => completedIds.has(t.id)).length / catItems.length) * 100)
                }

                return {
                    date:     ds,
                    dayOfWeek: new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
                    physical:  rate('physical'),
                    grounding: rate('grounding'),
                    target:    rate('target'),
                }
            })

            // Worst-performing state: lowest AVERAGE per-day completion rate across 7 days
            let worstBlock = null
            let worstAvgRate = Infinity
            for (const block of blocks) {
                const blockTemplates = templates.filter(t => t.block_id === block.id)
                if (!blockTemplates.length) continue

                const perDayRates = dates.map(ds => {
                    const dayIds = new Set(allCompletions.filter(c => c.date === ds).map(c => c.template_id))
                    return blockTemplates.filter(t => dayIds.has(t.id)).length / blockTemplates.length
                })
                const avg = perDayRates.reduce((a, b) => a + b, 0) / perDayRates.length

                if (avg < worstAvgRate) {
                    worstAvgRate = avg
                    worstBlock   = block
                }
            }

            //──────────────────────────────────────────────────
            // 4. Streak (consecutive behavioral days)
            //──────────────────────────────────────────────────
            const allDatesWithActivity = new Set(
                (await db.checklist_completions.toArray()).map(c => c.date)
            )
            let streak = 1
            const cur = new Date(); cur.setDate(cur.getDate() - 1)
            while (allDatesWithActivity.has(cur.toISOString().split('T')[0])) {
                streak++
                cur.setDate(cur.getDate() - 1)
            }

            //──────────────────────────────────────────────────
            // 5. Rule violations — names + timing
            //──────────────────────────────────────────────────
            let ruleViolationDetail = []
            try {
                const rules       = await db.rules.toArray()
                const violations  = await db.rule_violations.toArray()
                const weekViolations = violations.filter(v => dates.includes(v.date))

                // Group by rule name — count occurrences
                const ruleMap = {}
                for (const v of weekViolations) {
                    const rule = rules.find(r => r.id === v.rule_id)
                    const key  = rule?.title || `Rule #${v.rule_id}`
                    ruleMap[key] = (ruleMap[key] || 0) + 1
                }
                ruleViolationDetail = Object.entries(ruleMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count]) => ({ name, count }))
            } catch (_) { /* table might not exist */ }

            //──────────────────────────────────────────────────
            // 6. Journal reflections (last 3) from Supabase
            //──────────────────────────────────────────────────
            let recentReflections = []
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    const { data: refRows } = await supabase
                        .from('days')
                        .select('date, daily_reflection')
                        .eq('user_id', session.user.id)
                        .in('date', dates)
                        .not('daily_reflection', 'is', null)
                        .order('date', { ascending: false })
                        .limit(3)
                    recentReflections = (refRows || [])
                        .filter(r => r.daily_reflection?.trim())
                        .map(r => ({ date: r.date, note: r.daily_reflection.trim() }))
                }
            } catch (_) { /* auth not available */ }

            //──────────────────────────────────────────────────
            // 7. Day-of-week failure pattern
            //──────────────────────────────────────────────────
            const dowCompliance = {}
            for (const d of dayRecords) {
                const dow = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
                if (!dowCompliance[dow]) dowCompliance[dow] = []
                dowCompliance[dow].push(d.compliance_score)
            }
            const dowPattern = Object.entries(dowCompliance).map(([day, scores]) => ({
                day,
                avgCompliance: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            })).sort((a, b) => a.avgCompliance - b.avgCompliance)

            //──────────────────────────────────────────────────
            // 8. Assemble payload
            //──────────────────────────────────────────────────
            const payload = {
                // Core 7-day window
                failureHistory: dayRecords.map(d => ({
                    date:            d.date,
                    compliance:      d.compliance_score,
                    violations:      d.violations,
                    tasksCompleted:  d.tasks_completed,
                    deepWorkMinutes: d.deep_work_minutes
                })),

                // Per-day neurological chain rates (physical → grounding → target)
                dailyCategoryRates,

                // Worst state by avg 7-day completion rate
                stateConfig: worstBlock ? {
                    name:       worstBlock.name,
                    avgRate:    Math.round(worstAvgRate * 100),
                    steps:      templates.filter(t => t.block_id === worstBlock.id).map(t => ({
                        label:    t.label,
                        category: t.category
                    }))
                } : null,

                // All states for full structure awareness
                allStates: blocks.map(b => ({
                    name:    b.name,
                    start:   b.start_time,
                    end:     b.end_time,
                    isSleep: b.is_sleep,
                    steps:   templates.filter(t => t.block_id === b.id)
                                      .map(t => `[${t.category}] ${t.label}`)
                })),

                // Behavioral streak
                currentStreak: streak,

                // Rule violations ranked by frequency
                ruleViolationDetail,

                // User's own structural notes
                recentReflections,

                // Day-of-week compliance (sorted worst first)
                dowPattern,

                // Legacy fields kept for Edge Function compatibility
                failureEvents: [],
                urgeCount: 0
            }

            //──────────────────────────────────────────────────
            // 9. Call Edge Function
            //──────────────────────────────────────────────────
            const { data, error: fnError } = await supabase.functions.invoke('adaptive-ai', {
                body: payload
            })

            if (fnError) throw fnError

            if (data?.suggestion) {
                setSuggestion(data.suggestion)
                await db.user_preferences.put({
                    key:   'last_ai_suggestion',
                    value: JSON.stringify({
                        text:      data.suggestion,
                        model:     data.model || 'unknown',
                        timestamp: new Date().toISOString()
                    })
                })
            } else {
                setStatusMsg('Analysis complete — no structural issues detected.')
            }

        } catch (e) {
            console.error('[AdaptiveAI] Diagnosis failed:', e)
            let msg = 'AI diagnosis unavailable — check your connection and try again.'
            try {
                const body = await e.context?.json?.()
                if (body?.detail) msg = `AI error: ${body.detail}`
                else if (body?.error) msg = `AI error: ${body.error}`
            } catch (_) { /* body not readable */ }
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return { suggestion, loading, error, statusMsg, diagnose }
}
