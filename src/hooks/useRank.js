import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { parseProgressionConfigRows } from '../progression/config/progressionConfig'
import { calculateRankState } from '../progression/engines/rankEngine'
import { toDayKey } from '../progression/utils/time'
import { useAuthStore } from '../store/useAuthStore'

/**
 * @intent Resolves rank score and current rank from rolling XP windows
 */
export function useRank(referenceDayKey = toDayKey()) {
    const userId = useAuthStore(s => s.user?.id)

    const data = useLiveQuery(async () => {
        if (!userId) return null

        const [taskLogs, rankThresholdRows, configRows, userRow] = await Promise.all([
            db.task_logs.where('user_id').equals(userId).toArray(),
            db.rank_thresholds.toArray(),
            db.progression_config.toArray(),
            db.users.get(userId)
        ])

        const config = parseProgressionConfigRows(configRows)
        const rankState = calculateRankState({
            taskLogs,
            rankThresholdRows,
            referenceDayKey,
            weightLast7Days: config.rankWeightLast7Days,
            weightLast30Days: config.rankWeightLast30Days
        })

        return {
            ...rankState,
            storedRankScore: userRow?.rank_score ?? rankState.rankScore,
            storedRank: userRow?.current_rank ?? rankState.currentRank
        }
    }, [userId, referenceDayKey])

    return {
        rank: data || null,
        loading: userId ? data === undefined : false
    }
}
