import { useMemo } from 'react'

/**
 * @intent Derives per-brain-region activation intensity (0–1) from behavioral
 *         and system signals. Returns a stable regionProgress object consumed by
 *         NeuralImpactMap to drive UV blob intensity per anatomical region.
 *
 *         Signal mapping (each region combines multiple inputs so no single
 *         checklist category maps 1:1 to a region):
 *
 *   motorCortex  — physical task completion (motor/movement items)
 *   prefrontal   — goal-directed performance: target completion × compliance
 *   limbic       — emotional-regulation coverage: grounding completion
 *   cerebellum   — coordination composite: mean of physical + grounding
 *   tempora      — temporal processing: deep-work minutes normalised to 2 h cap
 *   amygdala     — threat-response inverse: decreases with violations
 *
 * @param {Array}  items      — items[] from useChecklist(), each has { isDone, category }
 * @param {object} dayMetrics — { deep_work_minutes?: number, violations?: number, compliance_score?: number }
 * @returns {{ motorCortex, prefrontal, limbic, cerebellum, tempora, amygdala }} intensities 0–1
 */
export function useBrainRegionHeatmap(items, dayMetrics = {}) {
    return useMemo(() => {
        // ── Category completion ratios (intermediate signals, not final output)
        const ratio = (cat) => {
            const catItems = items.filter(i => i.category === cat)
            if (!catItems.length) return 0
            return catItems.filter(i => i.isDone).length / catItems.length
        }

        const physical   = ratio('physical')
        const grounding  = ratio('grounding')
        const target     = ratio('target')

        // ── Day-level signals (default to neutral/zero if absent)
        const deepWorkMinutes = dayMetrics.deep_work_minutes ?? 0
        const violations      = dayMetrics.violations        ?? 0
        const compliance      = (dayMetrics.compliance_score ?? 100) / 100  // 0–1

        // ── Region derivations
        // motorCortex: driven by physical task completion
        const motorCortex = physical

        // prefrontal: executive-function signal — target completion weighted by compliance
        const prefrontal = target * compliance

        // limbic: emotional-regulation proxy — grounding completion
        const limbic = grounding

        // cerebellum: motor-coordination composite — mean of physical and grounding
        const cerebellum = (physical + grounding) / 2

        // tempora: temporal-processing signal — deep-work time normalised to a 2-hour ceiling
        const DEEP_WORK_CAP_MINUTES = 120
        const tempora = Math.min(deepWorkMinutes / DEEP_WORK_CAP_MINUTES, 1)

        // amygdala: threat-response signal — increases with violations (stress response)
        // Formula: 1 - 1/(1 + violations * 0.25) starts at 0 and rises asymptotically toward 1
        const amygdala = violations === 0 ? 0 : 1 - 1 / (1 + violations * 0.25)

        return {
            motorCortex: Math.max(0, Math.min(1, motorCortex)),
            prefrontal:  Math.max(0, Math.min(1, prefrontal)),
            limbic:      Math.max(0, Math.min(1, limbic)),
            cerebellum:  Math.max(0, Math.min(1, cerebellum)),
            tempora:     Math.max(0, Math.min(1, tempora)),
            amygdala:    Math.max(0, Math.min(1, amygdala)),
        }
    }, [items, dayMetrics])
}
