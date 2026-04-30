import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'
import { db } from '../lib/db'

/**
 * @intent Healing rates per brain region — how fast each region recovers with consistent execution.
 *         Motor cortex responds fastest (physical habits stick quick), prefrontal slowest (executive function takes weeks).
 */
const HEALING_RATES = {
    motorCortex: 0.15,
    anteriorCingulate: 0.08,
    insula: 0.10,
    prefrontal: 0.07,
    amygdala: 0.12,
    dorsolateralPFC: 0.09,
}

/** @intent Penalty applied to streak when a region's associated behavior is missed */
const STREAK_PENALTY = 0.3

const REGIONS = ['motorCortex', 'prefrontal', 'insula', 'amygdala', 'anteriorCingulate', 'dorsolateralPFC']

/**
 * @intent Maps checklist categories to the brain regions they heal.
 *         physical → motorCortex, grounding → insula, target → prefrontal + dorsolateralPFC
 *         Compliance score → anteriorCingulate, low violations → amygdala
 */
const CATEGORY_TO_REGIONS = {
    physical: ['motorCortex'],
    grounding: ['insula'],
    target: ['prefrontal', 'dorsolateralPFC'],
}

/**
 * @intent Hook that manages per-region streak tracking and healing progress.
 *         Reads from brain_baseline + region_streaks tables.
 *         Returns current dysregulation state per region (0 = regulated, 1 = dysregulated).
 */
export function useRegionStreak() {
    const baseline = useLiveQuery(() => db.brain_baseline.toCollection().first())
    const streaks = useLiveQuery(() => db.region_streaks.toArray())

    /**
     * @intent Increment streaks for regions whose associated behaviors were completed today.
     * @param {Object} categoryCompletion - { physical: bool, grounding: bool, target: bool }
     * @param {number} complianceScore - 0–100
     * @param {number} violations - count of violations today
     */
    const updateStreaks = useCallback(async (categoryCompletion, complianceScore, violations) => {
        const today = new Date().toISOString().split('T')[0]

        for (const region of REGIONS) {
            const existing = await db.region_streaks.get(region)
            if (!existing) continue

            // Skip if already updated today
            if (existing.last_updated === today) continue

            let shouldIncrement = false
            let shouldPenalize = false

            // Determine if this region was "exercised" today
            if (region === 'motorCortex') {
                shouldIncrement = !!categoryCompletion.physical
                shouldPenalize = !categoryCompletion.physical
            } else if (region === 'insula') {
                shouldIncrement = !!categoryCompletion.grounding
                shouldPenalize = !categoryCompletion.grounding
            } else if (region === 'prefrontal' || region === 'dorsolateralPFC') {
                shouldIncrement = !!categoryCompletion.target
                shouldPenalize = !categoryCompletion.target
            } else if (region === 'anteriorCingulate') {
                shouldIncrement = complianceScore >= 70
                shouldPenalize = complianceScore < 50
            } else if (region === 'amygdala') {
                shouldIncrement = violations === 0
                shouldPenalize = violations > 2
            }

            const newStreak = shouldIncrement
                ? existing.streak_days + 1
                : shouldPenalize
                    ? Math.max(0, existing.streak_days - STREAK_PENALTY)
                    : existing.streak_days

            await db.region_streaks.update(region, {
                streak_days: newStreak,
                last_updated: today,
            })
        }
    }, [])

    /**
     * @intent Compute current dysregulation state per region using exponential healing model.
     *         regionState = baseline × (1 - healingProgress)
     *         where healingProgress = 1 - exp(-streak_days × healingRate)
     */
    const computeDysregulation = useCallback(() => {
        if (!baseline || !streaks || streaks.length === 0) {
            // No baseline captured yet — return moderate defaults
            return REGIONS.reduce((acc, r) => ({ ...acc, [r]: 0.5 }), {})
        }

        const result = {}
        for (const region of REGIONS) {
            const regionBaseline = baseline[region] ?? 0.5
            const streak = streaks.find(s => s.region === region)
            const streakDays = streak?.streak_days ?? 0

            const healingRate = HEALING_RATES[region] ?? 0.1
            const healingProgress = 1 - Math.exp(-streakDays * healingRate)
            result[region] = regionBaseline * (1 - healingProgress)
        }

        return result
    }, [baseline, streaks])

    return {
        baseline,
        streaks,
        updateStreaks,
        computeDysregulation,
        healingRates: HEALING_RATES,
        regions: REGIONS,
        categoryToRegions: CATEGORY_TO_REGIONS,
    }
}
