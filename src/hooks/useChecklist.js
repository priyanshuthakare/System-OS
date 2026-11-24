import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { syncDailyProgress } from '../lib/utils'
import { useTaskProgression } from './useTaskProgression'

const CATEGORY_ORDER = { physical: 0, grounding: 1, target: 2 }

/**
 * @intent Manage checklist state with neurological sequence enforcement
 * @param {string} dateString - "YYYY-MM-DD" target day
 * @param {number} blockId - ID of the time block / state
 */
export function useChecklist(dateString, blockId) {
    const { completeTask } = useTaskProgression()

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
            const completedAt = new Date().toISOString()
            await db.checklist_completions.put({
                template_id: templateId,
                date: dateString,
                completed_at: completedAt
            })

            try {
                const template = await db.checklist_templates.get(templateId)
                console.log('[useChecklist] template:', template)
                if (template) {
                    let taskId = template.progression_task_id

                    if (!taskId) {
                        taskId = `checklist_task_${template.id}`
                        const task = await db.tasks.get(taskId)
                        console.log('[useChecklist] existing task:', task)

                        if (!task) {
                            const category = template.category || 'target'
                            const categoryDefaults = {
                                physical: { base_xp: 15, difficulty_multiplier: 1.0, stat_targets: { strength: 0.5, resilience: 0.3, discipline: 0.2 } },
                                grounding: { base_xp: 10, difficulty_multiplier: 1.0, stat_targets: { focus: 0.4, resilience: 0.3, discipline: 0.3 } },
                                target: { base_xp: 20, difficulty_multiplier: 1.2, stat_targets: { focus: 0.3, knowledge: 0.3, discipline: 0.2, strength: 0.2 } }
                            }
                            const defaults = categoryDefaults[category] || categoryDefaults.target

                            const newTask = {
                                id: taskId,
                                title: template.label || `Task ${template.id}`,
                                category,
                                base_xp: defaults.base_xp,
                                difficulty_multiplier: defaults.difficulty_multiplier,
                                repeat_penalty_enabled: true,
                                stat_targets: defaults.stat_targets,
                                is_low_value: false,
                                max_repetitions_per_day: 1,
                                min_completion_interval_mins: null
                            }
                            console.log('[useChecklist] creating task:', newTask)
                            await db.tasks.put(newTask)
                        }

                        await db.checklist_templates.update(templateId, { progression_task_id: taskId })
                    }

                    console.log('[useChecklist] calling completeTask with taskId:', taskId)
                    if (taskId) {
                        const result = await completeTask({
                            taskId,
                            completedAt
                        })
                        console.log('[useChecklist] completeTask result:', result)
                    }
                }
            } catch (error) {
                console.error('[useChecklist] error:', error)
                // The checklist records the action even when its optional XP award fails.
            }
        } else {
            await db.checklist_completions
                .where({ template_id: templateId, date: dateString })
                .delete()
        }

        await syncDailyProgress(dateString)
    }

    return { items: items || [], loading, toggleItem }
}
