import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { syncDailyProgress } from '../lib/utils'

const CATEGORY_ORDER = { physical: 0, grounding: 1, target: 2 }

/**
 * @intent Manage checklist state with neurological sequence enforcement
 * @param {string} dateString - "YYYY-MM-DD" target day
 * @param {number} blockId - ID of the time block / state
 */
export function useChecklist(dateString, blockId) {
    const items = useLiveQuery(
        async () => {
            if (!blockId || !dateString) return []

            const tmplItems = await db.checklist_templates
                .where('block_id')
                .equals(blockId)
                .sortBy('sort_order')

            if (!tmplItems?.length) return []

            // Sort by category order first, then sort_order within category
            tmplItems.sort((a, b) => {
                const catA = CATEGORY_ORDER[a.category] ?? 99
                const catB = CATEGORY_ORDER[b.category] ?? 99
                if (catA !== catB) return catA - catB
                return (a.sort_order || 0) - (b.sort_order || 0)
            })

            const completions = await db.checklist_completions
                .where('date')
                .equals(dateString)
                .toArray()

            // Neurological enforcement: category must be fully complete before next unlocks
            const categoryDone = { physical: true, grounding: true, target: true }

            // First pass: check which categories are fully done
            for (const cat of ['physical', 'grounding', 'target']) {
                const catItems = tmplItems.filter(i => i.category === cat)
                const allDone = catItems.every(i => completions.some(c => c.template_id === i.id))
                categoryDone[cat] = allDone
            }

            // Second pass: merge with lock enforcement
            const merged = tmplItems.map((item) => {
                const isDone = completions.some(c => c.template_id === item.id)
                const cat = item.category || 'target'

                let strictlyLocked = false
                if (cat === 'grounding' && !categoryDone.physical) {
                    strictlyLocked = true
                } else if (cat === 'target' && (!categoryDone.physical || !categoryDone.grounding)) {
                    strictlyLocked = true
                }

                return {
                    ...item,
                    isDone,
                    is_locked: strictlyLocked,
                    category: cat
                }
            })

            return merged
        },
        [blockId, dateString]
    )

    const loading = items === undefined

    const toggleItem = async (templateId, currentState) => {
        const newState = !currentState

        if (newState) {
            await db.checklist_completions.put({
                template_id: templateId,
                date: dateString,
                completed_at: new Date().toISOString()
            })
        } else {
            await db.checklist_completions
                .where({ template_id: templateId, date: dateString })
                .delete()
        }

        await syncDailyProgress(dateString)
    }

    return { items: items || [], loading, toggleItem }
}
