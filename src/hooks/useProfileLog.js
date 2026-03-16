import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

/**
 * @intent Fetch profile metadata and the 14-day identity log
 * @param None
 */
export function useProfileLog() {
    const data = useLiveQuery(async () => {
        // For V1, we just take the first profile
        const profData = await db.profiles.toCollection().first()

        // Get last 14 days of logs
        const daysData = await db.days.orderBy('date').reverse().limit(14).toArray()

        return {
            profile: profData,
            identityLog: daysData || []
        }
    }, [])

    return {
        profile: data?.profile || null,
        identityLog: data?.identityLog || [],
        loading: data === undefined
    }
}
