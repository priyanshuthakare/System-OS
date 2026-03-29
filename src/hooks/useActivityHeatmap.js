import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

/**
 * @intent Generates activity data for the GitHub-style heatmap grid — always 90 slots for all users.
 * Free users see data only for the last 7 days; remaining slots are empty.
 * @param {number} dataDays - How many days of actual data to populate (7 for free, 90 for Pro)
 * @returns {{ days: Array<{date: string, level: number}>, totalActive: number, currentStreak: number }}
 */
export function useActivityHeatmap(dataDays = 90) {
    const GRID_DAYS = 90 // Always render 90 slots

    const heatmapData = useLiveQuery(async () => {
        const today = new Date()
        const days = []

        // Generate 90 grid slots always
        for (let i = GRID_DAYS - 1; i >= 0; i--) {
            const d = new Date(today)
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]

            // Only fetch real data within the dataDays window
            const isWithinDataWindow = i < dataDays
            let completed = 0

            if (isWithinDataWindow) {
                const dayRecord = await db.days.get(dateStr)
                completed = dayRecord?.tasks_completed || 0
            }

            // Level 0-4 based on tasks completed
            let level = 0
            if (completed >= 5) level = 4
            else if (completed >= 4) level = 3
            else if (completed >= 2) level = 2
            else if (completed >= 1) level = 1

            days.push({
                date: dateStr,
                level,
                completed,
                dayOfWeek: d.getDay()
            })
        }

        // Calculate current streak (only within data window)
        let streak = 0
        for (let i = days.length - 1; i >= 0; i--) {
            if (days[i].level > 0) streak++
            else break
        }

        const totalActive = days.filter(d => d.level > 0).length

        return { days, totalActive, currentStreak: streak }
    }, [dataDays])

    return heatmapData || { days: [], totalActive: 0, currentStreak: 0 }
}
