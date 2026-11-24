import { resolveUsername } from '../lib/username'
import { useCallback } from 'react'
import { completeProgressionTask, getProgressionSnapshot } from '../progression/services/progressionService'
import { useAuthStore } from '../store/useAuthStore'
import { useProgressionStore } from '../store/useProgressionStore'

/**
 * @intent Completion adapter that applies progression logic and emits state/animation events
 */
export function useTaskProgression() {
    const user = useAuthStore(s => s.user)
    const profile = useAuthStore(s => s.profile)
    const isApplyingTask = useProgressionStore(s => s.isApplyingTask)
    const setApplyingTask = useProgressionStore(s => s.setApplyingTask)
    const setLastTaskResult = useProgressionStore(s => s.setLastTaskResult)
    const setSnapshot = useProgressionStore(s => s.setSnapshot)
    const queueEvent = useProgressionStore(s => s.queueEvent)

    const completeTask = useCallback(async ({
        taskId,
        completedAt,
        dynamicAdjustment = 1,
        manualOverride = null
    }) => {
        if (!taskId) throw new Error('completeTask requires taskId')
        if (!user?.id) throw new Error('completeTask requires authenticated user')

        setApplyingTask(true)
        try {
            const result = await completeProgressionTask({
                userId: user.id,
                username: resolveUsername(user, profile),
                taskId,
                completedAt,
                dynamicAdjustment,
                manualOverride
            })

            setLastTaskResult(result)

            const snapshot = await getProgressionSnapshot(user.id)
            setSnapshot(snapshot)

            if (result?.accepted) {
                queueEvent({
                    type: 'xp_gain',
                    payload: {
                        xpAwarded: result.xpAwarded,
                        xpBreakdown: result.xpBreakdown
                    }
                })

                if (result.leveledUp) {
                    queueEvent({
                        type: 'level_up',
                        payload: {
                            fromLevel: result.levelBefore,
                            toLevel: result.levelAfter
                        }
                    })
                }

                if (Array.isArray(result.titlesUnlocked) && result.titlesUnlocked.length) {
                    for (const unlockedTitle of result.titlesUnlocked) {
                        queueEvent({
                            type: 'title_unlock',
                            payload: unlockedTitle
                        })
                    }
                }

                queueEvent({
                    type: 'rank_update',
                    payload: {
                        rankScore: result.rankScore,
                        currentRank: result.currentRank
                    }
                })
            }

            return result
        } finally {
            setApplyingTask(false)
        }
    }, [
        user,
        profile,
        setApplyingTask,
        setLastTaskResult,
        setSnapshot,
        queueEvent
    ])

    return {
        completeTask,
        isApplyingTask
    }
}
