import { useEffect, useMemo, useRef } from 'react'
import { useRegionStreak } from './useRegionStreak'

/**
 * @intent Derives per-brain-region dysregulation intensity (0–1) using the
 *         streak-based healing model. Returns a regionProgress object consumed
 *         by NeuralImpactMap to drive UV blob intensity per anatomical region.
 *
 *         NEW MODEL (dysregulation → regulation arc):
 *         - Values represent DYSREGULATION level (1 = fully dysregulated, 0 = regulated)
 *         - Brain starts "hot" (high dysregulation from onboarding baseline)
 *         - Each day of execution heals the mapped region via exponential decay
 *         - The brain visually cools from red → blue over weeks
 *
 *         Region mapping:
 *           motorCortex       — physical task completion heals motor activation
 *           prefrontal        — target completion heals executive function
 *           insula            — grounding completion heals interoceptive awareness
 *           amygdala          — low violations heal threat response
 *           anteriorCingulate — compliance score heals conflict monitoring
 *           dorsolateralPFC   — deep work heals sustained attention
 *
 * @param {Array}  items      — items[] from useChecklist(), each has { isDone, category }
 * @param {object} dayMetrics — { deep_work_minutes, violations, compliance_score }
 * @returns {{ motorCortex, prefrontal, insula, amygdala, anteriorCingulate, dorsolateralPFC }} dysregulation 0–1
 */
export function useBrainRegionHeatmap(items, dayMetrics = {}) {
    const { computeDysregulation, updateStreaks } = useRegionStreak()

    // Compute the healing-model dysregulation state
    const dysregulation = computeDysregulation()

    // Also compute today's real-time behavioral signals as a "today overlay"
    // This gives immediate visual feedback before the streak updates at end-of-day
    const todaySignals = useMemo(() => {
        const ratio = (cat) => {
            const catItems = (items || []).filter(i => i.category === cat)
            if (!catItems.length) return 0
            return catItems.filter(i => i.isDone).length / catItems.length
        }

        const physical  = ratio('physical')
        const grounding = ratio('grounding')
        const target    = ratio('target')

        const deepWorkMinutes = dayMetrics.deep_work_minutes ?? 0
        const violations      = dayMetrics.violations ?? 0
        const compliance      = (dayMetrics.compliance_score ?? 100) / 100

        return {
            motorCortex:       physical,
            insula:            grounding,
            prefrontal:        target,
            dorsolateralPFC:   Math.min(deepWorkMinutes / 120, 1),
            anteriorCingulate: compliance,
            amygdala:          violations === 0 ? 1 : 1 / (1 + violations * 0.3),
        }
    }, [items, dayMetrics])

    // ── Auto-update streaks once per day when all categories are complete ─────
    // This triggers the streak increment so the healing model advances.
    const hasUpdatedStreaks = useRef(false)
    useEffect(() => {
        if (hasUpdatedStreaks.current) return
        if (!items?.length) return

        // Check if all categories have at least one completed item
        const ratio = (cat) => {
            const catItems = items.filter(i => i.category === cat)
            if (!catItems.length) return 0
            return catItems.filter(i => i.isDone).length / catItems.length
        }

        const categoryCompletion = {
            physical: ratio('physical') >= 1,
            grounding: ratio('grounding') >= 1,
            target: ratio('target') >= 1,
        }

        // Only update if at least one category is fully complete
        const anyComplete = Object.values(categoryCompletion).some(Boolean)
        if (!anyComplete) return

        const violations = dayMetrics.violations ?? 0
        const compliance = dayMetrics.compliance_score ?? 100

        updateStreaks(categoryCompletion, compliance, violations)
        hasUpdatedStreaks.current = true
    }, [items, dayMetrics, updateStreaks])

    // Blend: healing model (long-term) with today's signals (immediate feedback)
    // Today's execution reduces the displayed dysregulation in real-time
    const blended = useMemo(() => {
        const TODAY_WEIGHT = 0.3 // 30% today's progress, 70% cumulative healing
        const result = {}

        for (const region of Object.keys(dysregulation)) {
            const baselineDysreg = dysregulation[region] ?? 0.5
            const todayProgress = todaySignals[region] ?? 0

            // Today's progress reduces displayed dysregulation
            // If today's signal is 1.0 (fully completed), it reduces dysregulation by 30%
            result[region] = Math.max(0, Math.min(1,
                baselineDysreg * (1 - todayProgress * TODAY_WEIGHT)
            ))
        }

        return result
    }, [dysregulation, todaySignals])

    return blended
}
