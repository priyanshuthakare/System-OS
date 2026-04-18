import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { db } from '../lib/db'

/** Map a raw days record (local or remote) to the reflections shape */
function toReflection(d) {
    return { date: d.date, text: d.daily_reflection }
}

/**
 * @intent Fetches past 7 daily reflections — local Dexie first (offline), Supabase as background refresh.
 * Uses a hasFetched ref to prevent re-fire loops from parent re-renders.
 * @returns {{ reflections: Array<{date: string, text: string}>, loading: boolean }}
 */
export function useClosureData() {
    const user = useAuthStore(s => s.user)
    const userId = user?.id
    const [reflections, setReflections] = useState([])
    const [loading, setLoading] = useState(true)
    const hasFetched = useRef(false)

    useEffect(() => {
        // Guard: only run once per user session
        if (!userId || hasFetched.current) {
            if (!userId) setLoading(false)
            return
        }

        hasFetched.current = true

        const fetchReflections = async () => {
            const today = new Date().toISOString().split('T')[0]
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const startDate = sevenDaysAgo.toISOString().split('T')[0]

            // 1. Offline-first: read from local Dexie immediately
            try {
                const localDays = await db.days
                    .where('date')
                    .between(startDate, today, true, true)
                    .toArray()

                const localReflections = localDays
                    .filter(d => d.daily_reflection?.trim())
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 7)
                    .map(toReflection)

                if (localReflections.length > 0) {
                    setReflections(localReflections)
                    setLoading(false)
                }
            } catch (e) {
                console.warn('[ClosureData] Local read failed:', e)
            }

            // 2. Background refresh from Supabase
            try {
                const { data, error } = await supabase
                    .from('days')
                    .select('date, daily_reflection')
                    .eq('user_id', userId)
                    .not('daily_reflection', 'is', null)
                    .gte('date', startDate)
                    .order('date', { ascending: false })
                    .limit(7)

                if (error) {
                    console.warn('[ClosureData] Supabase fetch failed (offline?):', error)
                    return
                }

                const remoteReflections = (data || [])
                    .filter(d => d.daily_reflection?.trim())
                    .map(toReflection)

                setReflections(remoteReflections)

                // Cache reflections to local Dexie for next offline load
                for (const day of (data || [])) {
                    if (day.daily_reflection?.trim()) {
                        const existing = await db.days.get(day.date)
                        if (existing) {
                            await db.days.update(day.date, { daily_reflection: day.daily_reflection })
                        } else {
                            await db.days.put({
                                date: day.date,
                                tasks_completed: 0,
                                violations: 0,
                                deep_work_minutes: 0,
                                compliance_score: 0,
                                recovery_count: 0,
                                daily_reflection: day.daily_reflection
                            })
                        }
                    }
                }
            } catch (e) {
                console.warn('[ClosureData] Supabase sync failed (offline?):', e.message || e)
            } finally {
                setLoading(false)
            }
        }

        fetchReflections()
    }, [userId])

    // Reset hasFetched when user changes (logout/login)
    useEffect(() => {
        if (!userId) {
            hasFetched.current = false
            setReflections([])
            setLoading(false)
        }
    }, [userId])

    return { reflections, loading }
}
