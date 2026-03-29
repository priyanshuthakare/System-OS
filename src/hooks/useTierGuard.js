import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

const MAX_FREE_STATES = 3
const MAX_FREE_CHECKLIST_ITEMS = 5

/**
 * @intent Guards premium features based on user's subscription tier.
 * Free: 3 states, 5 checklist items per state, basic 7-day analytics, no Urge Engine, no AI.
 * Pro: Unlimited states, unlimited checklists, 90-day heatmap, Urge Engine, Adaptive AI.
 * @returns {{ isPro: boolean, tier: string, canAddState: function, canAddChecklist: function, canAccessUrgeEngine: function, canAccessFullAnalytics: function, canAccessAI: function, heatmapDays: number }}
 */
export function useTierGuard() {
    const profile = useLiveQuery(() => db.profiles.get(1))
    const blockCount = useLiveQuery(() => db.time_blocks.count())

    const tier = profile?.tier_status || 'free'
    const isPro = tier === 'pro' || tier === 'lifetime'

    const canAddState = () => isPro || (blockCount || 0) < MAX_FREE_STATES
    const canAddChecklist = (currentCountForBlock) => isPro || currentCountForBlock < MAX_FREE_CHECKLIST_ITEMS
    const canAccessUrgeEngine = () => isPro
    const canAccessFullAnalytics = () => isPro
    const canAccessAI = () => isPro

    return {
        isPro,
        tier,
        currentStateCount: blockCount || 0,
        maxFreeStates: MAX_FREE_STATES,
        maxFreeChecklistItems: MAX_FREE_CHECKLIST_ITEMS,
        heatmapDays: isPro ? 90 : 7,
        canAddState,
        canAddChecklist,
        canAccessUrgeEngine,
        canAccessFullAnalytics,
        canAccessAI
    }
}

