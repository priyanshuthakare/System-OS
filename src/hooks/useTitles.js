import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { useAuthStore } from '../store/useAuthStore'

/**
 * @intent Returns unlocked titles for the active user
 */
export function useTitles() {
    const userId = useAuthStore(s => s.user?.id)

    const titles = useLiveQuery(async () => {
        if (!userId) return []
        const rows = await db.titles.where('user_id').equals(userId).toArray()
        return rows.sort((a, b) => (b.unlocked_at || '').localeCompare(a.unlocked_at || ''))
    }, [userId])

    return {
        titles: titles || [],
        loading: userId ? titles === undefined : false
    }
}
