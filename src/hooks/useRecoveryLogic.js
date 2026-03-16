import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'

const RECOVERY_ACTIONS = [
    '10 pushups',
    'Drink a full glass of water',
    'Walk for 2 minutes',
    '30 seconds deep breathing',
    'Cold water face rinse'
]

/**
 * @intent Manages the Recovery Engine (System 4) — logs failures and forces a 20-second physical recovery
 * @param {string} activeStateId - The current state id when relapse occurred
 */
export function useRecoveryLogic(activeStateId) {
    const user = useAuthStore(s => s.user)
    const [step, setStep] = useState(0)
    const [trigger, setTrigger] = useState('')
    const [action, setAction] = useState(null)
    const [saving, setSaving] = useState(false)
    const [startTime] = useState(() => Date.now())

    const submit = async (onDone) => {
        if (!user || !action) return
        setSaving(true)

        const elapsed = Math.round((Date.now() - startTime) / 1000)

        try {
            await supabase.from('recovery_logs').insert({
                user_id: user.id,
                state_id: activeStateId || null,
                trigger_context: trigger || 'Not specified',
                action_taken: action,
                time_to_recover_seconds: elapsed
            })

            // Increment recovery count for today
            const today = new Date().toISOString().split('T')[0]
            const { data: dayRow } = await supabase
                .from('days')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)
                .single()

            if (dayRow) {
                await supabase.from('days')
                    .update({ recovery_count: (dayRow.recovery_count || 0) + 1 })
                    .eq('id', dayRow.id)
            } else {
                await supabase.from('days').insert({
                    user_id: user.id,
                    date: today,
                    recovery_count: 1
                })
            }
        } catch (e) {
            console.error('Recovery log failed:', e)
        } finally {
            setSaving(false)
            if (onDone) onDone()
        }
    }

    return { step, setStep, trigger, setTrigger, action, setAction, saving, submit, RECOVERY_ACTIONS }
}
