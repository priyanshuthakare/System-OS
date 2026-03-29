import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { db } from '../../lib/db'

const DEFAULT_STEPS = ['Stand up now', 'Cold water', '3-min breathe', 'Write what triggered this', 'Redirect to scheduled task']

/**
 * @intent Screen 3: Urge Protocol Fullscreen Override — sequential steps, timer-gated
 * @param None
 */
export default function UrgeOverlay() {
    const setUrgeActive = useAppStore(state => state.setUrgeActive)
    const user = useAuthStore(s => s.user)

    // Dynamic preferences from Dexie
    const stepsPref = useLiveQuery(() => db.user_preferences.get('urge_steps'))
    const timerPref = useLiveQuery(() => db.user_preferences.get('urge_timer_minutes'))

    const STEPS = stepsPref ? JSON.parse(stepsPref.value) : DEFAULT_STEPS
    const timerMinutes = timerPref ? parseInt(timerPref.value, 10) : 10

    const [timeLeft, setTimeLeft] = useState(timerMinutes * 60)
    const [isRunning, setIsRunning] = useState(false)
    const [logging, setLogging] = useState(false)
    const [completed, setCompleted] = useState({})

    // Reset timer if preference changes
    useEffect(() => {
        if (!isRunning) setTimeLeft(timerMinutes * 60)
    }, [timerMinutes, isRunning])

    const allDone = Object.keys(completed).length === STEPS.length

    useEffect(() => {
        if (!isRunning) return
        const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
        return () => clearInterval(id)
    }, [isRunning])

    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
    const secs = String(timeLeft % 60).padStart(2, '0')

    /**
     * @intent Enforce sequential step completion — only the next uncompleted step can be marked done
     */
    const toggleStep = (idx) => {
        // Can only complete steps sequentially — no skipping, no un-checking
        if (!isRunning) return
        const nextIdx = Object.keys(completed).length
        if (idx !== nextIdx) return
        if (completed[idx]) return

        setCompleted(prev => ({ ...prev, [idx]: true }))
    }

    const handleStart = async () => {
        setIsRunning(true)
        setLogging(true)
        try {
            if (user) {
                await supabase.from('recovery_logs').insert({
                    user_id: user.id,
                    trigger_context: 'Urge Protocol Activated',
                    action_taken: 'Started urge timer',
                    time_to_recover_seconds: 0
                })
            }
        } catch (e) {
            console.error('Urge log failed:', e)
        }
        setLogging(false)
    }

    const handleDismiss = () => {
        setUrgeActive(false)
    }

    return (
        <div className="absolute inset-0 bg-black z-[100] flex flex-col">
            <div className="bg-red px-6 py-6 pb-5 shrink-0 relative">
                <button
                    onClick={handleDismiss}
                    className="absolute top-6 right-6 font-mono text-white/50 text-[10px] tracking-[2px]"
                >
                    DISMISS ✕
                </button>
                <div className="font-mono text-[9px] tracking-[3px] text-white/50 mb-2">
                    PROTOCOL ACTIVE
                </div>
                <div className="font-condensed font-black text-[48px] uppercase tracking-[-1px] text-white leading-[0.9]">
                    URGE<br />WAVE
                </div>
                <div className="font-mono text-[10px] text-white/60 mt-2.5 tracking-[1px]">
                    8–15 minutes. This will pass. Execute the steps.
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="text-center py-8 mb-6 border border-border bg-surface">
                    <div className="font-mono font-bold text-[64px] text-red tracking-[-2px] leading-none">
                        {mins}:{secs}
                    </div>
                    <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mt-2">
                        Estimated wave duration
                    </div>
                    {!isRunning && (
                        <button
                            onClick={handleStart}
                            disabled={logging}
                            className="inline-block bg-red text-white font-condensed font-bold text-[14px] tracking-[3px] uppercase px-7 py-2.5 mt-4 disabled:opacity-50"
                        >
                            {logging ? 'INJECTING...' : 'START TIMER'}
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-0.5 mb-6">
                    {STEPS.map((step, i) => {
                        const isDone = !!completed[i]
                        const nextIdx = Object.keys(completed).length
                        const isCurrent = !isDone && i === nextIdx
                        const isLocked = !isDone && i > nextIdx
                        const isClickable = isRunning && isCurrent

                        return (
                            <button
                                key={i}
                                onClick={() => toggleStep(i)}
                                disabled={!isClickable}
                                className={cn(
                                    "border p-4 flex items-center gap-4 transition-all text-left",
                                    isDone
                                        ? "bg-green/10 border-green/30 opacity-60"
                                        : isCurrent && isRunning
                                            ? "bg-red-dim border-red"
                                            : "bg-surface border-border",
                                    !isClickable && !isDone && "opacity-40"
                                )}
                            >
                                <div className={cn(
                                    "font-mono font-bold text-[22px] w-7 shrink-0",
                                    isDone ? "text-green" : isCurrent && isRunning ? "text-red" : "text-text3"
                                )}>
                                    0{i + 1}
                                </div>
                                <div className={cn(
                                    "flex-1 font-condensed font-bold text-[16px] uppercase tracking-[1px]",
                                    isDone ? "text-green line-through" : isCurrent && isRunning ? "text-white" : "text-text2"
                                )}>
                                    {step}
                                </div>
                                <div className={cn(
                                    "w-[18px] h-[18px] border-[1.5px] shrink-0 flex items-center justify-center transition-colors",
                                    isDone ? "border-green bg-green" : isLocked ? "border-border2 opacity-30" : "border-border2"
                                )}>
                                    {isDone && <Check size={12} className="text-black" />}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {allDone && (
                    <button
                        onClick={handleDismiss}
                        className="w-full p-4 bg-green text-black font-mono text-[11px] tracking-[2px] uppercase font-bold mb-4 hover:bg-green/90 transition-colors"
                    >
                        ALL STEPS DONE — RETURN TO SYSTEM
                    </button>
                )}

                <div className="border border-border p-4 font-mono text-[10px] text-text3 leading-[1.7] tracking-[0.5px]">
                    The urge is information, not a command.<br />
                    You are not the urge.<br />
                    You are the one who watches it pass.
                </div>
            </div>
        </div>
    )
}
