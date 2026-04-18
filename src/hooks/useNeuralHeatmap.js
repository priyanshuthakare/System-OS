import { useMemo } from 'react'

/**
 * @intent Derives per-category completion ratio from the checklist items array.
 *         Returns a stable categoryProgress object that NeuralImpactMap uses
 *         to drive UV blob intensity. Pure memoized computation, zero side effects.
 * @param {Array} items - items[] from useChecklist(), each has { isDone, category }
 * @returns {{ physical: number, grounding: number, target: number }} ratios 0–1
 */
export function useNeuralHeatmap(items) {
    return useMemo(() => {
        const cats = ['physical', 'grounding', 'target']
        const progress = { physical: 0, grounding: 0, target: 0 }

        for (const cat of cats) {
            const catItems = items.filter(i => i.category === cat)
            if (!catItems.length) continue
            const done = catItems.filter(i => i.isDone).length
            progress[cat] = done / catItems.length
        }

        return progress
    }, [items])
}
