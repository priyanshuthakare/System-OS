import { toDayKey } from '../utils/time'

export const DEFAULT_TITLE_DEFINITIONS = Object.freeze([
    {
        id: 'night-conqueror',
        name: 'Night Conqueror',
        unlock_condition: {
            type: 'distinctDayCategoryCount',
            category: 'sleep_discipline',
            target: 14
        }
    },
    {
        id: 'iron-discipline',
        name: 'Iron Discipline',
        unlock_condition: {
            type: 'taskCategoryCount',
            category: 'workout',
            target: 30
        }
    },
    {
        id: 'mind-architect',
        name: 'Mind Architect',
        unlock_condition: {
            type: 'taskCategoryCount',
            category: 'deep_work',
            target: 50
        }
    }
])

function normalizeCondition(rawCondition) {
    if (!rawCondition) return null
    if (typeof rawCondition === 'string') {
        try {
            return JSON.parse(rawCondition)
        } catch {
            return null
        }
    }
    if (typeof rawCondition === 'object') return rawCondition
    return null
}

function countTaskCategory(taskLogs, category) {
    return taskLogs.filter(log => log.task_category === category).length
}

function countDistinctDaysForCategory(taskLogs, category) {
    const uniqueDays = new Set(
        taskLogs
            .filter(log => log.task_category === category)
            .map(log => log.day_key || toDayKey(log.completed_at))
    )
    return uniqueDays.size
}

export function evaluateUnlockCondition(taskLogs, unlockCondition) {
    const condition = normalizeCondition(unlockCondition)
    if (!condition?.type) return false

    const target = Number(condition.target)
    if (!Number.isFinite(target) || target <= 0) return false

    if (condition.type === 'taskCategoryCount') {
        return countTaskCategory(taskLogs, condition.category) >= target
    }

    if (condition.type === 'distinctDayCategoryCount') {
        return countDistinctDaysForCategory(taskLogs, condition.category) >= target
    }

    return false
}

export function evaluateTitleUnlocks({
    userId,
    existingTitles = [],
    taskLogs = [],
    titleDefinitions = DEFAULT_TITLE_DEFINITIONS,
    nowIso = new Date().toISOString()
}) {
    const unlockedNameSet = new Set((existingTitles || []).map(title => title.name))
    const newlyUnlocked = []

    for (const definition of titleDefinitions) {
        if (!definition?.name || unlockedNameSet.has(definition.name)) continue
        const unlocked = evaluateUnlockCondition(taskLogs, definition.unlock_condition)
        if (!unlocked) continue

        newlyUnlocked.push({
            id: `${userId}:${definition.id}`,
            user_id: userId,
            name: definition.name,
            unlock_condition: definition.unlock_condition,
            unlocked_at: nowIso
        })
    }

    return newlyUnlocked
}
