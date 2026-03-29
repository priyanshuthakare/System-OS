import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'

/**
 * @intent Fetches past 7 daily reflections from Supabase (once, not on every render).
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
            try {
                const today = new Date()
                const sevenDaysAgo = new Date(today)
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

                const { data, error } = await supabase
                    .from('days')
                    .select('date, daily_reflection')
                    .eq('user_id', userId)
                    .not('daily_reflection', 'is', null)
                    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
                    .order('date', { ascending: false })
                    .limit(7)

                if (error) {
                    console.warn('[ClosureData] Fetch reflections failed:', error)
                    return
                }

                setReflections(
                    (data || [])
                        .filter(d => d.daily_reflection?.trim())
                        .map(d => ({
                            date: d.date,
                            text: d.daily_reflection
                        }))
                )
            } catch (e) {
                console.error('[ClosureData] Error:', e)
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
            setLoading(true)
        }
    }, [userId])

    return { reflections, loading }
}
