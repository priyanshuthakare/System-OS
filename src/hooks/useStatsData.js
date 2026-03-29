import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

/**
 * @intent Fetches the last 7 days of daily metrics from local Dexie for the weekly analytics section.
 * Guards against undefined on first useLiveQuery render to prevent cascade re-renders in Closure.
 * @returns {{ weekData: Array, avgCompliance: number, totalViolations: number, maxTasks: number, deepWorkHoursWeek: number }}
 */
export function useStatsData() {
    // useLiveQuery returns undefined on the very first render before Dexie resolves.
    // We handle this explicitly to prevent parent components from cascading.
    const result = useLiveQuery(async () => {
        const today = new Date()
        const dates = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today)
            d.setDate(d.getDate() - i)
            dates.push(d.toISOString().split('T')[0])
        }

        const days = []
        let totalDeepWorkMinutes = 0
        for (const dateStr of dates) {
            const day = await db.days.get(dateStr)
            totalDeepWorkMinutes += (day?.deep_work_minutes || 0)
            days.push({
                date: dateStr,
                dayLabel: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
                tasksCompleted: day?.tasks_completed || 0,
                violations: day?.violations || 0,
                complianceScore: day?.compliance_score || 0
            })
        }
        return { days, totalDeepWorkMinutes }
    }, [])

    // Guard: return stable defaults while useLiveQuery is resolving (first render = undefined)
    const data = result?.days || []
    const totalDeepWorkMinutes = result?.totalDeepWorkMinutes || 0

    const avgCompliance = data.length > 0
        ? Math.round(data.reduce((sum, d) => sum + d.complianceScore, 0) / data.length)
        : 0

    const totalViolations = data.reduce((sum, d) => sum + d.violations, 0)
    const maxTasks = Math.max(1, ...data.map(d => d.tasksCompleted))
    const deepWorkHoursWeek = Math.round((totalDeepWorkMinutes / 60) * 10) / 10

    return { weekData: data, avgCompliance, totalViolations, maxTasks, deepWorkHoursWeek }
}
