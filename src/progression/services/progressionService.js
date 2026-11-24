import Dexie from 'dexie'
import { db } from '../../lib/db'
import {
    PROGRESSION_STAT_KEYS,
    normalizeStatTargets,
    parseProgressionConfigRows
} from '../config/progressionConfig'
import { getLevelFromTotalXp, getLevelProgress } from '../engines/levelEngine'
import { calculateRankState } from '../engines/rankEngine'
import {
    calculateRecoveryBonusMultiplier,
    calculateStreakBonusMultiplier,
    getMissedDays,
    resolveStreakState
} from '../engines/streakEngine'
import { evaluateTitleUnlocks } from '../engines/titleEngine'
import { calculateXpAward } from '../engines/xpEngine'
import {
    checkBurstActivity,
    checkRepetitionLimit,
    checkTimePlausibility,
    formatManualOverrideLog
} from './antiCheatService'
import { createEmptyStatsRow, createInitialProgressionUser } from '../models/progressionModels'
import { roundToInt, safeNumber, weightedDistribution } from '../utils/math'
import { toDayKey } from '../utils/time'

function createId(prefix) {
    if (globalThis.crypto?.randomUUID) {
        return `${prefix}_${globalThis.crypto.randomUUID()}`
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeUsername(username, userId) {
    if (typeof username === 'string' && username.trim()) return username.trim()
    if (typeof userId === 'string' && userId.includes('@')) return userId.split('@')[0]
    return 'Hunter'
}

function mapConfigRows(configRows) {
    return configRows.reduce((acc, row) => {
        if (row?.key) acc[row.key] = row.value
        return acc
    }, {})
}

function getConfigNumber(configMap, key, fallbackValue) {
    const parsed = Number(configMap[key])
    return Number.isFinite(parsed) ? parsed : fallbackValue
}

function getConfigString(configMap, key, fallbackValue) {
    if (typeof configMap[key] === 'string' && configMap[key].trim()) return configMap[key]
    return fallbackValue
}

function roundToTwo(value) {
    return Math.round(safeNumber(value, 0) * 100) / 100
}

function validateTaskForCompletion(task) {
    if (!task || typeof task !== 'object') {
        throw new Error('Task not found for progression completion')
    }
    if (!task.id || !task.title || !task.category) {
        throw new Error('Task must include id, title, and category')
    }
    if (!Number.isFinite(Number(task.base_xp)) || Number(task.base_xp) < 0) {
        throw new Error('Task must include a valid base_xp')
    }
    if (!Number.isFinite(Number(task.difficulty_multiplier)) || Number(task.difficulty_multiplier) < 0) {
        throw new Error('Task must include a valid difficulty_multiplier')
    }
}

async function ensureUserRows(userId, username, nowIso) {
    let userRow = await db.users.get(userId)
    if (!userRow) {
        userRow = createInitialProgressionUser(userId, normalizeUsername(username, userId), nowIso)
        await db.users.put(userRow)
    }

    let statsRow = await db.stats.get(userId)
    if (!statsRow) {
        statsRow = createEmptyStatsRow(userId, nowIso)
        await db.stats.put(statsRow)
    }

    const existingStatProgress = await db.stat_progress.where('user_id').equals(userId).toArray()
    const existingStatKeys = new Set(existingStatProgress.map(entry => entry.stat_key))

    const missingRows = PROGRESSION_STAT_KEYS
        .filter(statKey => !existingStatKeys.has(statKey))
        .map(statKey => ({
            id: `${userId}:${statKey}`,
            user_id: userId,
            stat_key: statKey,
            xp_total: 0,
            level: 1,
            updated_at: nowIso
        }))

    if (missingRows.length) {
        await db.stat_progress.bulkPut(missingRows)
    }

    return {
        userRow,
        statsRow
    }
}

function enrichTaskLogsWithCategory(taskLogs, taskById) {
    return taskLogs.map(log => ({
        ...log,
        task_category: taskById.get(log.task_id)?.category || null
    }))
}

function buildOutboxEvent(eventType, payload, createdAt) {
    return {
        id: createId('sync'),
        event_type: eventType,
        payload,
        status: 'pending',
        attempts: 0,
        created_at: createdAt,
        last_attempt_at: null
    }
}

async function logAntiCheatEvent({
    userId,
    taskId,
    eventType,
    detail,
    createdAt
}) {
    await db.anti_cheat_events.put({
        id: createId('cheat'),
        user_id: userId,
        task_id: taskId,
        event_type: eventType,
        detail,
        created_at: createdAt
    })
}

export async function upsertProgressionTask(taskInput) {
    const normalizedTask = {
        ...taskInput,
        base_xp: Number(taskInput?.base_xp),
        difficulty_multiplier: Number(taskInput?.difficulty_multiplier),
        repeat_penalty_enabled: Boolean(taskInput?.repeat_penalty_enabled),
        stat_targets: normalizeStatTargets(taskInput?.stat_targets),
        is_low_value: Boolean(taskInput?.is_low_value),
        max_repetitions_per_day: taskInput?.max_repetitions_per_day == null
            ? null
            : Math.max(0, roundToInt(taskInput.max_repetitions_per_day)),
        min_completion_interval_mins: taskInput?.min_completion_interval_mins == null
            ? null
            : Math.max(0, roundToInt(taskInput.min_completion_interval_mins))
    }

    validateTaskForCompletion(normalizedTask)
    await db.tasks.put(normalizedTask)
    return normalizedTask
}

export async function completeProgressionTask({
    userId,
    username,
    taskId,
    completedAt = new Date().toISOString(),
    dynamicAdjustment = 1,
    manualOverride = null
}) {
    if (!userId) throw new Error('completeProgressionTask requires userId')
    if (!taskId) throw new Error('completeProgressionTask requires taskId')

    const completedDayKey = toDayKey(completedAt)

    return db.transaction(
        'rw',
        db.users,
        db.stats,
        db.tasks,
        db.task_logs,
        db.rank_thresholds,
        db.progression_config,
        db.stat_progress,
        db.titles,
        db.leaderboard_snapshots,
        db.manual_override_logs,
        db.anti_cheat_events,
        db.sync_outbox,
        async () => {
            const task = await db.tasks.get(taskId)
            validateTaskForCompletion(task)

            const configRows = await db.progression_config.toArray()
            const configValues = parseProgressionConfigRows(configRows)
            const rawConfig = mapConfigRows(configRows)
            const rankThresholdRows = await db.rank_thresholds.toArray()

            const { userRow, statsRow } = await ensureUserRows(userId, username, completedAt)

            const dayLogs = await db.task_logs
                .where('[user_id+day_key]')
                .equals([userId, completedDayKey])
                .toArray()

            const sameTaskLogsToday = dayLogs.filter(log => log.task_id === taskId)
            const repetitionCount = sameTaskLogsToday.length
            // A daily checklist step can only earn its reward once, including on rapid taps.
            if (taskId.startsWith('checklist_task_') && repetitionCount > 0) {
                return { accepted: false, reason: 'already_completed_today' }
            }

            const repetitionCheck = checkRepetitionLimit({
                repetitionCount,
                maxRepetitionsPerDay: task.max_repetitions_per_day
            })
            if (!repetitionCheck.allowed) {
                await logAntiCheatEvent({
                    userId,
                    taskId,
                    eventType: repetitionCheck.reason,
                    detail: repetitionCheck.detail,
                    createdAt: completedAt
                })

                return {
                    accepted: false,
                    reason: repetitionCheck.reason
                }
            }

            if (Number.isFinite(Number(task.min_completion_interval_mins)) && Number(task.min_completion_interval_mins) > 0) {
                const sameTaskAllDays = await db.task_logs
                    .where('[user_id+task_id+day_key]')
                    .between([userId, taskId, Dexie.minKey], [userId, taskId, Dexie.maxKey])
                    .toArray()

                let latestCompletionMs = null
                for (const log of sameTaskAllDays) {
                    const ms = new Date(log.completed_at).getTime()
                    if (!Number.isFinite(ms)) continue
                    if (latestCompletionMs == null || ms > latestCompletionMs) {
                        latestCompletionMs = ms
                    }
                }

                if (latestCompletionMs != null) {
                    const plausibilityCheck = checkTimePlausibility({
                        latestCompletionAt: new Date(latestCompletionMs).toISOString(),
                        currentCompletionAt: completedAt,
                        minCompletionIntervalMins: task.min_completion_interval_mins
                    })
                    if (!plausibilityCheck.allowed) {
                        await logAntiCheatEvent({
                            userId,
                            taskId,
                            eventType: plausibilityCheck.reason,
                            detail: plausibilityCheck.detail,
                            createdAt: completedAt
                        })

                        return {
                            accepted: false,
                            reason: plausibilityCheck.reason
                        }
                    }
                }
            }

            const burstCheck = checkBurstActivity({
                completionTimes: dayLogs.map(log => log.completed_at),
                currentCompletionAt: completedAt,
                burstWindowMins: getConfigNumber(rawConfig, 'anti_cheat_burst_window_mins', NaN),
                maxCompletionsInWindow: getConfigNumber(rawConfig, 'anti_cheat_max_completions_in_window', NaN)
            })
            if (!burstCheck.allowed) {
                await logAntiCheatEvent({
                    userId,
                    taskId,
                    eventType: burstCheck.reason,
                    detail: burstCheck.detail,
                    createdAt: completedAt
                })

                return {
                    accepted: false,
                    reason: burstCheck.reason
                }
            }

            const uniqueTaskIdsForDay = [...new Set(dayLogs.map(log => log.task_id))]
            const tasksForDay = uniqueTaskIdsForDay.length
                ? await db.tasks.bulkGet(uniqueTaskIdsForDay)
                : []
            const taskByIdForDay = new Map()
            for (const taskRow of tasksForDay) {
                if (taskRow?.id) taskByIdForDay.set(taskRow.id, taskRow)
            }

            let lowValueXpToday = 0
            let nonLowValueXpToday = 0
            for (const log of dayLogs) {
                const sourceTask = taskByIdForDay.get(log.task_id)
                const xp = Math.max(0, safeNumber(log.xp_awarded, 0))
                if (sourceTask?.is_low_value) lowValueXpToday += xp
                else nonLowValueXpToday += xp
            }

            const missedDays = getMissedDays(userRow.last_active_date, completedDayKey)
            const isFirstCompletionOfDay = dayLogs.length === 0
            const recoveryBonusMultiplierFromConfig = getConfigNumber(rawConfig, 'recovery_bonus_multiplier', 1)
            const fallbackRecoveryBonusMultiplier = 1 + (Math.max(0, missedDays) * configValues.streakBonusPerDay)
            const recoveryMultiplier = calculateRecoveryBonusMultiplier({
                missedDays,
                isFirstCompletionOfDay,
                recoveryMissedDayThreshold: configValues.recoveryMissedDayThreshold,
                recoveryBonusMultiplier: recoveryBonusMultiplierFromConfig > 1
                    ? recoveryBonusMultiplierFromConfig
                    : fallbackRecoveryBonusMultiplier
            })

            const streakMultiplier = calculateStreakBonusMultiplier(
                userRow.streak_days,
                configValues.streakBonusPerDay
            )
            const consistencyMultiplier = streakMultiplier * recoveryMultiplier
            const repetitionForPenalty = task.repeat_penalty_enabled ? repetitionCount : 0

            const xpBreakdown = calculateXpAward({
                baseXp: task.base_xp,
                difficultyMultiplier: task.difficulty_multiplier,
                consistencyMultiplier,
                repetitionCount: repetitionForPenalty,
                dynamicAdjustment,
                penaltyStep: configValues.repetitionPenaltyStep,
                isLowValueTask: Boolean(task.is_low_value),
                lowValueXpToday,
                nonLowValueXpToday
            })

            const xpAwarded = xpBreakdown.xpAwarded

            const logRow = {
                id: createId('log'),
                user_id: userId,
                task_id: taskId,
                completed_at: completedAt,
                day_key: completedDayKey,
                xp_awarded: xpAwarded,
                repetition_count_same_day: repetitionForPenalty,
                bonus_applied: {
                    streakMultiplier,
                    recoveryMultiplier,
                    consistencyMultiplier,
                    dynamicAdjustment,
                    repetitionPenaltyApplied: task.repeat_penalty_enabled
                }
            }
            await db.task_logs.put(logRow)

            const nextTotalXp = Math.max(0, safeNumber(userRow.xp_total, 0)) + xpAwarded
            const levelState = getLevelProgress(nextTotalXp, {
                levelCurveBase: configValues.levelCurveBase,
                levelCurveExponent: configValues.levelCurveExponent
            })

            const todayXpTotal = dayLogs.reduce((sum, log) => sum + safeNumber(log.xp_awarded, 0), 0) + xpAwarded
            const streakState = resolveStreakState({
                currentStreakDays: userRow.streak_days,
                lastActiveDayKey: userRow.last_active_date,
                currentDayKey: completedDayKey,
                todayXpTotal,
                minDailyXpThreshold: getConfigNumber(rawConfig, 'streak_min_daily_xp', 1),
                decayMode: getConfigString(rawConfig, 'streak_decay_mode', 'reset'),
                decayStep: getConfigNumber(rawConfig, 'streak_decay_step', 1)
            })

            const userLogsAfterInsert = await db.task_logs.where('user_id').equals(userId).toArray()
            const rankState = calculateRankState({
                taskLogs: userLogsAfterInsert,
                rankThresholdRows,
                referenceDayKey: completedDayKey,
                weightLast7Days: configValues.rankWeightLast7Days,
                weightLast30Days: configValues.rankWeightLast30Days
            })

            const nextUserRow = {
                ...userRow,
                username: normalizeUsername(userRow.username || username, userId),
                xp_total: nextTotalXp,
                level: levelState.currentLevel,
                rank_score: rankState.rankScore,
                current_rank: rankState.currentRank,
                streak_days: streakState.nextStreakDays,
                last_active_date: completedDayKey
            }
            await db.users.put(nextUserRow)

            const statTargets = normalizeStatTargets(task.stat_targets)
            const statDistribution = weightedDistribution(xpAwarded, statTargets)
            const nextStatsRow = {
                ...statsRow,
                updated_at: completedAt
            }

            for (const statKey of PROGRESSION_STAT_KEYS) {
                const currentStatValue = safeNumber(nextStatsRow[statKey], 0)
                const gainedValue = safeNumber(statDistribution[statKey], 0)
                nextStatsRow[statKey] = roundToTwo(currentStatValue + gainedValue)
            }
            await db.stats.put(nextStatsRow)

            const existingStatRows = await db.stat_progress.where('user_id').equals(userId).toArray()
            const statRowByKey = new Map(existingStatRows.map(row => [row.stat_key, row]))
            const statRowsToPut = []

            for (const statKey of PROGRESSION_STAT_KEYS) {
                const existing = statRowByKey.get(statKey) || {
                    id: `${userId}:${statKey}`,
                    user_id: userId,
                    stat_key: statKey,
                    xp_total: 0,
                    level: 1,
                    updated_at: completedAt
                }

                const statXpGain = safeNumber(statDistribution[statKey], 0)
                const nextStatXp = Math.max(0, safeNumber(existing.xp_total, 0) + statXpGain)
                statRowsToPut.push({
                    ...existing,
                    xp_total: roundToTwo(nextStatXp),
                    level: getLevelFromTotalXp(nextStatXp, {
                        levelCurveBase: configValues.levelCurveBase,
                        levelCurveExponent: configValues.levelCurveExponent
                    }),
                    updated_at: completedAt
                })
            }

            if (statRowsToPut.length) {
                await db.stat_progress.bulkPut(statRowsToPut)
            }

            const existingTitles = await db.titles.where('user_id').equals(userId).toArray()
            const uniqueTaskIds = [...new Set(userLogsAfterInsert.map(log => log.task_id))]
            const taskRows = uniqueTaskIds.length ? await db.tasks.bulkGet(uniqueTaskIds) : []
            const taskById = new Map()
            for (const taskRow of taskRows) {
                if (taskRow?.id) taskById.set(taskRow.id, taskRow)
            }

            const titleEvaluationLogs = enrichTaskLogsWithCategory(userLogsAfterInsert, taskById)
            const newlyUnlockedTitles = evaluateTitleUnlocks({
                userId,
                existingTitles,
                taskLogs: titleEvaluationLogs,
                nowIso: completedAt
            })

            if (newlyUnlockedTitles.length) {
                await db.titles.bulkPut(newlyUnlockedTitles)
            }

            const snapshot = {
                id: createId('leaderboard'),
                user_id: userId,
                username: nextUserRow.username,
                rank_label: rankState.currentRank,
                level: levelState.currentLevel,
                score: rankState.xpLast7Days,
                weekly_score: rankState.xpLast7Days,
                monthly_score: rankState.xpLast30Days,
                captured_at: completedAt,
                board_type: 'global',
                board_scope: 'global'
            }
            await db.leaderboard_snapshots.put(snapshot)

            const outboxEvents = [
                buildOutboxEvent('task_completion', {
                    userId,
                    taskId,
                    completedAt,
                    dayKey: completedDayKey,
                    xpAwarded
                }, completedAt),
                buildOutboxEvent('leaderboard_snapshot', snapshot, completedAt),
            ]

            if (newlyUnlockedTitles.length) {
                outboxEvents.push(buildOutboxEvent('title_unlock', {
                    userId,
                    titles: newlyUnlockedTitles.map(title => title.name)
                }, completedAt))
            }

            await db.sync_outbox.bulkPut(outboxEvents)

            if (manualOverride?.reason) {
                const overrideLog = formatManualOverrideLog({
                    userId,
                    entityType: 'task_completion',
                    entityId: logRow.id,
                    reason: manualOverride.reason,
                    previousValue: manualOverride.previousValue ?? null,
                    nextValue: manualOverride.nextValue ?? null,
                    createdAt: completedAt
                })
                await db.manual_override_logs.put({
                    id: createId('override'),
                    ...overrideLog
                })
            }

            return {
                accepted: true,
                taskLogId: logRow.id,
                xpAwarded,
                xpBreakdown,
                levelBefore: safeNumber(userRow.level, 1),
                levelAfter: levelState.currentLevel,
                leveledUp: levelState.currentLevel > safeNumber(userRow.level, 1),
                streakDays: streakState.nextStreakDays,
                rankScore: rankState.rankScore,
                currentRank: rankState.currentRank,
                titlesUnlocked: newlyUnlockedTitles,
                leaderboardSnapshot: snapshot
            }
        }
    )
}

export async function setChecklistTemplateProgressionTask({
    templateId,
    taskId
}) {
    if (templateId == null) throw new Error('setChecklistTemplateProgressionTask requires templateId')
    if (!taskId) throw new Error('setChecklistTemplateProgressionTask requires taskId')

    const templateRow = await db.checklist_templates.get(templateId)
    if (!templateRow) throw new Error(`Checklist template ${templateId} not found`)

    const taskRow = await db.tasks.get(taskId)
    validateTaskForCompletion(taskRow)

    await db.checklist_templates.update(templateId, { progression_task_id: taskId })
    return { ...templateRow, progression_task_id: taskId }
}

export async function ensureProgressionSeeds() {
    const thresholdCount = await db.rank_thresholds.count()
    if (thresholdCount === 0) {
        await db.rank_thresholds.bulkPut([
            { rank: 'E Rank', min_score: 0, sort_order: 0 },
            { rank: 'D Rank', min_score: 50, sort_order: 1 },
            { rank: 'C Rank', min_score: 200, sort_order: 2 },
            { rank: 'B Rank', min_score: 500, sort_order: 3 },
            { rank: 'A Rank', min_score: 1200, sort_order: 4 },
            { rank: 'S Rank', min_score: 3000, sort_order: 5 },
            { rank: 'Monarch', min_score: 8000, sort_order: 6 },
        ])
    }

    const configCount = await db.progression_config.count()
    if (configCount === 0) {
        await db.progression_config.bulkPut([
            { key: 'level_curve_base', value: '100' },
            { key: 'level_curve_exponent', value: '1.5' },
            { key: 'xp_repetition_penalty_step', value: '0.2' },
            { key: 'streak_bonus_per_day', value: '0.05' },
            { key: 'rank_weight_last_7_days', value: '0.7' },
            { key: 'rank_weight_last_30_days', value: '0.3' },
            { key: 'recovery_missed_day_threshold', value: '3' },
            { key: 'rank_labels', value: JSON.stringify(['E Rank', 'D Rank', 'C Rank', 'B Rank', 'A Rank', 'S Rank', 'Monarch']) }
        ])
    }

    const bossCount = await db.boss_challenges.count()
    if (bossCount === 0) {
        const nowIso = new Date().toISOString()
        await db.boss_challenges.bulkPut([
            {
                id: 'boss_no_procrastination_7d',
                name: '7-Day No Procrastination',
                description: 'Complete all daily tasks for 7 consecutive days without skipping any.',
                category: 'discipline',
                duration_days: 7,
                reward_xp: 500,
                reward_rank_boost: 100,
                reward_title: 'Willbreaker',
                is_active: true,
                created_at: nowIso
            },
            {
                id: 'boss_30d_consistency',
                name: '30-Day Consistency',
                description: 'Maintain an active streak for 30 days straight.',
                category: 'resilience',
                duration_days: 30,
                reward_xp: 2000,
                reward_rank_boost: 400,
                reward_title: 'Unbreakable',
                is_active: true,
                created_at: nowIso
            },
            {
                id: 'boss_deep_focus_14d',
                name: '14-Day Deep Focus',
                description: 'Complete at least one deep work session every day for 14 days.',
                category: 'focus',
                duration_days: 14,
                reward_xp: 800,
                reward_rank_boost: 200,
                reward_title: 'Mind Fortress',
                is_active: true,
                created_at: nowIso
            }
        ])
    }
}

export async function initializeProgressionUser(userId, username) {
    if (!userId) return null
    const nowIso = new Date().toISOString()
    const { userRow } = await ensureUserRows(userId, username, nowIso)

    const normalizedName = normalizeUsername(username, userId)
    if (normalizedName !== userRow.username && normalizedName !== 'Hunter') {
        await db.users.update(userId, { username: normalizedName })
        userRow.username = normalizedName
    }

    const existingSnapshots = await db.leaderboard_snapshots
        .where('user_id')
        .equals(userId)
        .count()

    if (existingSnapshots === 0) {
        const snapshot = {
            id: createId('leaderboard'),
            user_id: userId,
            username: userRow.username,
            rank_label: userRow.current_rank || 'E Rank',
            level: userRow.level || 1,
            score: 0,
            weekly_score: 0,
            monthly_score: 0,
            captured_at: nowIso,
            board_type: 'global',
            board_scope: 'global'
        }

        await db.leaderboard_snapshots.put(snapshot)

        await db.sync_outbox.put({
            id: createId('sync'),
            event_type: 'leaderboard_snapshot',
            payload: snapshot,
            status: 'pending',
            attempts: 0,
            created_at: nowIso,
            last_attempt_at: null
        })
    }

    return userRow
}

const CATEGORY_XP_DEFAULTS = {
    physical: { base_xp: 15, difficulty_multiplier: 1.0, stat_targets: { strength: 0.5, resilience: 0.3, discipline: 0.2 } },
    grounding: { base_xp: 10, difficulty_multiplier: 1.0, stat_targets: { focus: 0.4, resilience: 0.3, discipline: 0.3 } },
    target: { base_xp: 20, difficulty_multiplier: 1.2, stat_targets: { focus: 0.3, knowledge: 0.3, discipline: 0.2, strength: 0.2 } }
}

export async function ensureChecklistProgressionTasks() {
    const templates = await db.checklist_templates.toArray()
    const unlinked = templates.filter(t => !t.progression_task_id)
    if (!unlinked.length) return 0

    let linked = 0
    for (const template of unlinked) {
        const taskId = `checklist_task_${template.id}`
        const category = template.category || 'target'
        const defaults = CATEGORY_XP_DEFAULTS[category] || CATEGORY_XP_DEFAULTS.target

        const existingTask = await db.tasks.get(taskId)
        if (!existingTask) {
            await db.tasks.put({
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
            })
        }

        await db.checklist_templates.update(template.id, { progression_task_id: taskId })
        linked++
    }

    return linked
}

export async function getProgressionSnapshot(userId) {
    if (!userId) throw new Error('getProgressionSnapshot requires userId')

    const userRow = await db.users.get(userId)

    const [statsRow, statProgressRows, titleRows, configRows, rankThresholdRows] = await Promise.all([
        db.stats.get(userId),
        db.stat_progress.where('user_id').equals(userId).toArray(),
        db.titles.where('user_id').equals(userId).toArray(),
        db.progression_config.toArray(),
        db.rank_thresholds.toArray(),
    ])

    if (!userRow) {
        return {
            user: null,
            stats: null,
            statProgress: [],
            titles: [],
            levelProgress: null,
            config: parseProgressionConfigRows(configRows),
            rankThresholds: rankThresholdRows
        }
    }

    const config = parseProgressionConfigRows(configRows)
    const levelProgress = getLevelProgress(userRow.xp_total, {
        levelCurveBase: config.levelCurveBase,
        levelCurveExponent: config.levelCurveExponent
    })

    return {
        user: userRow,
        stats: statsRow || createEmptyStatsRow(userId),
        statProgress: statProgressRows,
        titles: titleRows.sort((a, b) => (b.unlocked_at || '').localeCompare(a.unlocked_at || '')),
        levelProgress,
        config,
        rankThresholds: rankThresholdRows
    }
}
