import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'
import { db } from '../lib/db'
import {
    ensureChecklistProgressionTasks,
    ensureProgressionSeeds,
    getProgressionSnapshot,
    initializeProgressionUser
} from '../progression/services/progressionService'
import { useAuthStore } from '../store/useAuthStore'
import { useProgressionStore } from '../store/useProgressionStore'

export function useProgression() {
    const userId = useAuthStore(s => s.user?.id)
    const user = useAuthStore(s => s.user)
    const setSnapshot = useProgressionStore(s => s.setSnapshot)
    const initUserIdRef = useRef(null)

    useEffect(() => {
        if (!userId || initUserIdRef.current === userId) return
        initUserIdRef.current = userId

        const username =
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            user?.email?.split('@')[0] ||
            null

        ensureProgressionSeeds()
            .then(() => initializeProgressionUser(userId, username))
            .then(() => ensureChecklistProgressionTasks())
            .catch(err => console.warn('[useProgression] init failed:', err))
    }, [userId, user])

    const progression = useLiveQuery(async () => {
        if (!userId) return null

        const snapshot = await getProgressionSnapshot(userId)
        if (!snapshot?.user) return null

        const recentTaskLogs = await db.task_logs
            .where('[user_id+completed_at]')
            .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
            .reverse()
            .limit(20)
            .toArray()

        return {
            ...snapshot,
            recentTaskLogs
        }
    }, [userId])

    useEffect(() => {
        setSnapshot(progression || null)
    }, [progression, setSnapshot])

    return {
        progression: progression || null,
        loading: userId ? progression === undefined : false
    }
}
