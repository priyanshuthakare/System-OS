import { roundToInt, safeNumber } from '../utils/math'

export function checkRepetitionLimit({
    repetitionCount,
    maxRepetitionsPerDay
}) {
    const max = Number(maxRepetitionsPerDay)
    if (!Number.isFinite(max) || max < 0) {
        return { allowed: true, reason: null }
    }

    const repetitions = Math.max(0, roundToInt(repetitionCount))
    if (repetitions >= max) {
        return {
            allowed: false,
            reason: 'repetition_limit',
            detail: {
                maxRepetitionsPerDay: max,
                repetitionCount: repetitions
            }
        }
    }

    return { allowed: true, reason: null }
}

export function checkTimePlausibility({
    latestCompletionAt,
    currentCompletionAt,
    minCompletionIntervalMins
}) {
    const minInterval = Number(minCompletionIntervalMins)
    if (!Number.isFinite(minInterval) || minInterval <= 0) {
        return { allowed: true, reason: null }
    }

    const latestMs = new Date(latestCompletionAt).getTime()
    const currentMs = new Date(currentCompletionAt).getTime()
    if (!Number.isFinite(latestMs) || !Number.isFinite(currentMs)) {
        return { allowed: true, reason: null }
    }

    const elapsedMs = currentMs - latestMs
    const minIntervalMs = minInterval * 60 * 1000

    if (elapsedMs < minIntervalMs) {
        return {
            allowed: false,
            reason: 'time_plausibility',
            detail: {
                min_completion_interval_mins: minInterval,
                elapsed_mins: Math.round((elapsedMs / (60 * 1000)) * 100) / 100
            }
        }
    }

    return { allowed: true, reason: null }
}

export function checkBurstActivity({
    completionTimes = [],
    currentCompletionAt,
    burstWindowMins,
    maxCompletionsInWindow
}) {
    const windowMins = Number(burstWindowMins)
    const maxCompletions = Number(maxCompletionsInWindow)

    if (!Number.isFinite(windowMins) || windowMins <= 0) {
        return { allowed: true, reason: null }
    }
    if (!Number.isFinite(maxCompletions) || maxCompletions <= 0) {
        return { allowed: true, reason: null }
    }

    const currentMs = new Date(currentCompletionAt).getTime()
    if (!Number.isFinite(currentMs)) return { allowed: true, reason: null }

    const windowMs = windowMins * 60 * 1000
    const recentCount = completionTimes.filter(timeValue => {
        const ms = new Date(timeValue).getTime()
        if (!Number.isFinite(ms)) return false
        return (currentMs - ms) <= windowMs
    }).length

    if (recentCount >= maxCompletions) {
        return {
            allowed: false,
            reason: 'burst_activity',
            detail: {
                burst_window_mins: safeNumber(windowMins, 0),
                max_completions_in_window: safeNumber(maxCompletions, 0),
                observed_completions_in_window: recentCount
            }
        }
    }

    return { allowed: true, reason: null }
}

export function formatManualOverrideLog({
    userId,
    entityType,
    entityId,
    reason,
    previousValue = null,
    nextValue = null,
    createdAt
}) {
    if (!reason) {
        throw new Error('Manual override requires a reason')
    }

    return {
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        reason,
        previous_value: previousValue,
        next_value: nextValue,
        created_at: createdAt
    }
}
