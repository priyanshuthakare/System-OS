import { useCallback, useEffect, useRef } from 'react'
import { runProgressionSync } from '../progression/services/leaderboardSyncService'
import { useAuthStore } from '../store/useAuthStore'

const SYNC_INTERVAL_MS = 30 * 1000

export function useProgressionSync() {
    const userId = useAuthStore(s => s.user?.id)
    const syncInFlightRef = useRef(false)

    const syncNow = useCallback(async () => {
        if (!userId) return null
        if (syncInFlightRef.current) return null
        if (!navigator.onLine) return null

        syncInFlightRef.current = true
        try {
            console.log('[useProgressionSync] syncing...')
            return await runProgressionSync()
        } catch (err) {
            console.warn('[useProgressionSync] sync failed:', err)
            return null
        } finally {
            syncInFlightRef.current = false
        }
    }, [userId])

    useEffect(() => {
        if (!userId) return

        syncNow()
        const timer = setTimeout(() => syncNow(), 2000)
        const interval = setInterval(() => syncNow(), SYNC_INTERVAL_MS)

        const handleOnline = () => {
            console.log('[useProgressionSync] online, syncing')
            syncNow()
        }
        window.addEventListener('online', handleOnline)

        return () => {
            clearTimeout(timer)
            clearInterval(interval)
            window.removeEventListener('online', handleOnline)
        }
    }, [userId, syncNow])

    return { syncNow }
}
