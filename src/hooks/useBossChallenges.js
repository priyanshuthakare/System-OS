import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef } from 'react'
import { db } from '../lib/db'
import { parseProgressionConfigRows } from '../progression/config/progressionConfig'
import { getLevelProgress } from '../progression/engines/levelEngine'
import { addDays, daysBetweenDayKeys, parseDayKey, toDayKey } from '../progression/utils/time'
import { useAuthStore } from '../store/useAuthStore'
import { useProgressionStore } from '../store/useProgressionStore'

function createId(prefix) {
    if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function computeAndStoreBossProgress(attempt, taskLogs, boss, userId) {
    if (!attempt || !boss || attempt.status !== 'in_progress') return null

    const startKey = toDayKey(attempt.started_at)
    const todayKey = toDayKey()
    const elapsedCalendarDays = daysBetweenDayKeys(startKey, todayKey) + 1
    const target = boss.duration_days || 7

    const daysWithActivity = new Set()
    for (const log of taskLogs) {
        const dayKey = log.day_key || toDayKey(log.completed_at)
        if (dayKey >= startKey) daysWithActivity.add(dayKey)
    }

    let consecutiveDays = 0
    let failed = false
    let currentKey = startKey

    for (let i = 0; i < elapsedCalendarDays; i++) {
        if (daysWithActivity.has(currentKey)) {
            consecutiveDays++
        } else if (currentKey < todayKey) {
            failed = true
            break
        }
        currentKey = addDays(startKey, i + 1)
    }

    const completed = consecutiveDays >= target
    const needsUpdate = (completed && !attempt.challenge_completed) || (failed && !attempt.challenge_failed)

    // Store completion/failure state in DB to make it reactive
    if (needsUpdate) {
        await db.boss_attempts.put({
            ...attempt,
            challenge_completed: completed || attempt.challenge_completed,
            challenge_failed: failed || attempt.challenge_failed,
            updated_at: new Date().toISOString()
        })
    }

    return {
        consecutiveDays,
        target,
        failed,
        completed: completed || attempt.challenge_completed,
        elapsedCalendarDays
    }
}

export function useBossChallenges() {
    const userId = useAuthStore(s => s.user?.id)
    const queueEvent = useProgressionStore(s => s.queueEvent)
    const processedRef = useRef(new Set())

    const data = useLiveQuery(async () => {
        if (!userId) return null

        const [allBosses, attempts, taskLogs] = await Promise.all([
            db.boss_challenges.toArray(),
            db.boss_attempts.where('user_id').equals(userId).toArray(),
            db.task_logs.where('user_id').equals(userId).toArray()
        ])

        const activeChallenges = allBosses.filter(b => b.is_active)
        const sortedAttempts = attempts.sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''))
        const activeAttempt = sortedAttempts.find(a => a.status === 'in_progress') || null

        let activeProgress = null
        if (activeAttempt) {
            const boss = allBosses.find(b => b.id === activeAttempt.boss_id)
            activeProgress = await computeAndStoreBossProgress(activeAttempt, taskLogs, boss, userId)
        }

        return {
            activeChallenges,
            attempts: sortedAttempts,
            activeAttempt,
            activeProgress,
            hasActiveChallenge: !!activeAttempt
        }
    }, [userId])

    const startChallenge = useCallback(async ({ bossId }) => {
        if (!userId) throw new Error('startChallenge requires authenticated user')
        if (!bossId) throw new Error('startChallenge requires bossId')

        const allAttempts = await db.boss_attempts.where('user_id').equals(userId).toArray()
        if (allAttempts.some(a => a.status === 'in_progress')) {
            throw new Error('You already have an active boss challenge. Complete or abandon it first.')
        }

        const boss = await db.boss_challenges.get(bossId)
        if (!boss) throw new Error(`Boss challenge ${bossId} not found`)
        if (!boss.is_active) throw new Error(`Boss challenge ${bossId} is not active`)

        const attempt = {
            id: createId('boss_attempt'),
            user_id: userId,
            boss_id: bossId,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            completed_at: null,
            reward_xp: 0,
            reward_rank_boost: 0
        }
        await db.boss_attempts.put(attempt)
        return attempt
    }, [userId])

    const completeChallenge = useCallback(async ({ attemptId, rewardXp, rewardRankBoost, rewardTitleName = null }) => {
        if (!userId) throw new Error('completeChallenge requires authenticated user')

        return db.transaction(
            'rw',
            db.boss_attempts,
            db.users,
            db.progression_config,
            db.titles,
            db.sync_outbox,
            async () => {
                const attempt = await db.boss_attempts.get(attemptId)
                if (!attempt || attempt.user_id !== userId || attempt.status !== 'in_progress') return

                const userRow = await db.users.get(userId)
                if (!userRow) return

                const configRows = await db.progression_config.toArray()
                const config = parseProgressionConfigRows(configRows)

                const numericXp = Number(rewardXp) || 0
                const numericBoost = Number(rewardRankBoost) || 0
                const nextTotalXp = Number(userRow.xp_total || 0) + numericXp
                const nextRankScore = Number(userRow.rank_score || 0) + numericBoost
                const levelState = getLevelProgress(nextTotalXp, {
                    levelCurveBase: config.levelCurveBase,
                    levelCurveExponent: config.levelCurveExponent
                })

                await db.users.put({
                    ...userRow,
                    xp_total: nextTotalXp,
                    level: levelState.currentLevel,
                    rank_score: nextRankScore
                })

                await db.boss_attempts.put({
                    ...attempt,
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    reward_xp: numericXp,
                    reward_rank_boost: numericBoost
                })

                if (rewardTitleName) {
                    await db.titles.put({
                        id: `${userId}:boss:${attemptId}`,
                        user_id: userId,
                        name: rewardTitleName,
                        unlock_condition: { type: 'boss_reward', boss_id: attempt.boss_id },
                        unlocked_at: new Date().toISOString()
                    })
                }

                await db.sync_outbox.put({
                    id: createId('sync'),
                    event_type: 'boss_completion',
                    payload: { userId, attemptId, bossId: attempt.boss_id, rewardXp: numericXp, rewardRankBoost: numericBoost, rewardTitleName },
                    status: 'pending',
                    attempts: 0,
                    created_at: new Date().toISOString(),
                    last_attempt_at: null
                })
            }
        )
    }, [userId])

    const failChallenge = useCallback(async ({ attemptId }) => {
        if (!userId) return
        const attempt = await db.boss_attempts.get(attemptId)
        if (!attempt || attempt.user_id !== userId || attempt.status !== 'in_progress') return
        await db.boss_attempts.put({ ...attempt, status: 'failed', completed_at: new Date().toISOString() })
    }, [userId])

    const abandonChallenge = useCallback(async ({ attemptId }) => {
        if (!userId) return
        const attempt = await db.boss_attempts.get(attemptId)
        if (!attempt || attempt.user_id !== userId || attempt.status !== 'in_progress') return
        await db.boss_attempts.put({ ...attempt, status: 'abandoned', completed_at: new Date().toISOString() })
    }, [userId])

    useEffect(() => {
        if (!data?.activeAttempt) return

        const attempt = data.activeAttempt
        if (processedRef.current.has(attempt.id)) return

        // Use stored DB flags for reactivity
        const isCompleted = attempt.challenge_completed
        const isFailed = attempt.challenge_failed

        if (isCompleted) {
            processedRef.current.add(attempt.id)
            const boss = data.activeChallenges.find(b => b.id === attempt.boss_id)
            if (boss) {
                completeChallenge({
                    attemptId: attempt.id,
                    rewardXp: boss.reward_xp,
                    rewardRankBoost: boss.reward_rank_boost,
                    rewardTitleName: boss.reward_title
                }).then(() => {
                    queueEvent({ type: 'xp_gain', payload: { xpAwarded: boss.reward_xp } })
                    if (boss.reward_title) {
                        queueEvent({ type: 'title_unlock', payload: { name: boss.reward_title } })
                    }
                }).catch(() => processedRef.current.delete(attempt.id))
            }
        } else if (isFailed) {
            processedRef.current.add(attempt.id)
            failChallenge({ attemptId: attempt.id }).catch(() => processedRef.current.delete(attempt.id))
        }
    }, [data?.activeAttempt?.id, data?.activeAttempt?.challenge_completed, data?.activeAttempt?.challenge_failed, data?.activeChallenges, completeChallenge, failChallenge, queueEvent])

    return {
        activeChallenges: data?.activeChallenges || [],
        attempts: data?.attempts || [],
        activeAttempt: data?.activeAttempt || null,
        activeProgress: data?.activeProgress || null,
        hasActiveChallenge: data?.hasActiveChallenge || false,
        loading: data === undefined,
        startChallenge,
        completeChallenge,
        failChallenge,
        abandonChallenge
    }
}
