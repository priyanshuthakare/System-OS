import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { buildLeaderboard, sortLeaderboardEntries } from '../progression/engines/leaderboardEngine'
import { useAuthStore } from '../store/useAuthStore'

export function useLeaderboard({
    type = 'global',
    friendUserIds = [],
    category = null
} = {}) {
    const userId = useAuthStore(s => s.user?.id)
    const normalizedFriendIds = [...new Set(friendUserIds)].sort()
    const friendIdsKey = normalizedFriendIds.join('|')

    const data = useLiveQuery(async () => {
        const snapshots = await db.leaderboard_snapshots.orderBy('captured_at').reverse().toArray()
        const entriesByUser = new Map()

        for (const snapshot of snapshots) {
            const key = snapshot.user_id
            if (!key) continue
            if (!entriesByUser.has(key)) {
                entriesByUser.set(key, snapshot)
            }
        }

        const latestEntries = Array.from(entriesByUser.values())

        const entries = buildLeaderboard({
            entries: latestEntries,
            previousRanksByUserId: {},
            type,
            friendUserIds: normalizedFriendIds,
            category
        })

        return {
            entries,
            total: entries.length,
            currentUserEntry: userId ? entries.find(entry => entry.user_id === userId) || null : null
        }
    }, [type, category, friendIdsKey, userId])

    return {
        entries: data?.entries || [],
        total: data?.total || 0,
        currentUserEntry: data?.currentUserEntry || null,
        loading: data === undefined
    }
}
