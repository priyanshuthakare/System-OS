import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'

export default function DeviceScore({ userId, username }) {
    const points = useLiveQuery(async () => {
        if (!userId) return 0
        const now = Date.now()
        const rows = await db.task_logs.where('[user_id+completed_at]').between(
            [userId, new Date(now - 7 * 86400000).toISOString()],
            [userId, new Date(now).toISOString()], true, true).toArray()
        return Math.round(rows.reduce((sum, row) => sum + Number(row.xp_awarded || 0), 0))
    }, [userId])
    return <div className="flex items-center justify-between gap-2 p-3 bg-black border border-border">
        <div className="min-w-0"><strong className="block truncate">{username}</strong><span className="block text-xs text-text2">Weekly XP from local activity</span></div>
        <strong className="shrink-0 text-amber">{points ?? '…'} XP</strong>
    </div>
}
