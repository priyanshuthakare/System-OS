import { HABITS, OTHER_HABIT } from '../../lib/habits'
import { useState } from 'react'
import { ChevronRight, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/utils'

const TIMES = ['Morning (6-9 AM)', 'Afternoon (12-4 PM)', 'Evening (5-8 PM)', 'Night (9 PM+)']
const RISKS = [...HABITS, OTHER_HABIT]
const HELPS = ['Water', 'Walk', 'Breathing', 'Work', 'Pushups']

const TIME_MAP = {
    'Morning (6-9 AM)': { start: '06:00:00', end: '09:00:00' },
    'Afternoon (12-4 PM)': { start: '12:00:00', end: '16:00:00' },
    'Evening (5-8 PM)': { start: '17:00:00', end: '20:00:00' },
    'Night (9 PM+)': { start: '21:00:00', end: '23:59:00' }
}

export default function OnboardingView() {
    const user = useAuthStore(s => s.user)
    const setOnboarded = useAuthStore(s => s.setOnboarded)
    const [step, setStep] = useState(0)
    const [selectedTime, setSelectedTime] = useState(null)
    const [selectedRisk, setSelectedRisk] = useState(null)
    const [customHabit, setCustomHabit] = useState('')
    const habit = selectedRisk === OTHER_HABIT ? customHabit.trim() : selectedRisk
    const [selectedHelps, setSelectedHelps] = useState([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)

    const toggleHelp = (h) => {
        setSelectedHelps(prev =>
            prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h].slice(0, 3)
        )
    }

    const TOTAL_DOTS = 4
    const handleFinish = async () => {
        if (!user || !selectedTime || !habit || selectedHelps.length === 0) return
        setBusy(true)
        setError(null)

        try {
            const timeWindow = TIME_MAP[selectedTime]
            const stateName = selectedTime.split(' (')[0] + ' Reset'

            // Create the state
            const { data: state, error: stateErr } = await supabase.from('states').insert({
                user_id: user.id,
                name: stateName,
                start_time: timeWindow.start,
                end_time: timeWindow.end,
                trigger_type: 'time',
                trigger_value: timeWindow.start,
                risk_behavior: habit,
                unlock_reward: '15 min free time',
                lock_type: 'soft',
                ui_color: 'bg-amber',
                sort_order: 1
            }).select().single()

            if (stateErr) throw new Error(stateErr.message)

            // Create checklist items from selected helps
            if (state) {
                const items = selectedHelps.map((label, i) => ({
                    state_id: state.id,
                    user_id: user.id,
                    label,
                    category: i === 0 ? 'physical' : i === 1 ? 'grounding' : 'target',
                    has_timer: label === 'Work',
                    time_estimate_mins: label === 'Work' ? 15 : 2,
                    sort_order: i + 1
                }))
                const { error: checkErr } = await supabase.from('checklists').insert(items)
                if (checkErr) console.error('Checklist insert warning:', checkErr.message)
            }

            setOnboarded()
        } catch (e) {
            console.error('Onboarding failed:', e)
            setError(e.message || 'Something went wrong. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    // ── State-builder screens (steps 0–2) ─────────────────────────────────────
    const stateScreens = [
        {
            question: 'When would a reset help?',
            subtitle: 'Choose a time for your first routine',
            options: TIMES,
            selected: selectedTime,
            onSelect: setSelectedTime
        },
        {
            question: 'Which habit would you like to change?',
            subtitle: 'Choose what you want help interrupting',
            options: RISKS,
            selected: selectedRisk,
            onSelect: setSelectedRisk
        },
        {
            question: 'What helps you reset?',
            subtitle: 'Pick up to 3 stabilizing actions',
            options: HELPS,
            selected: selectedHelps,
            onSelect: toggleHelp,
            multi: true
        }
    ]

    // ── Render: State-builder screens (steps 0–2) ─────────────────────────────
    if (step < stateScreens.length) {
        const s = stateScreens[step]
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm flex flex-col gap-8">
                    {step > 0 && <button disabled={busy} className="text-text2 self-start" onClick={() => setStep(step - 1)}>Back</button>}
                    <ProgressDots total={TOTAL_DOTS} current={step} />
                    <div className="text-center">
                        <h2 className="font-condensed font-black text-[28px] leading-tight tracking-[-0.5px] text-white uppercase">
                            {s.question}
                        </h2>
                        <p className="font-mono text-[9px] tracking-[2px] uppercase text-text3 mt-2">{s.subtitle}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        {s.options.map(opt => {
                            const isActive = s.multi ? s.selected.includes(opt) : s.selected === opt
                            return (
                                <button
                                    key={opt}
                                    aria-pressed={isActive}
                                    disabled={s.multi && !isActive && s.selected.length >= 3}
                                    onClick={() => s.onSelect(opt)}
                                    className={cn(
                                        "w-full p-4 border text-left font-body text-sm transition-all",
                                        isActive
                                            ? 'border-amber bg-amber/10 text-amber'
                                            : 'border-border bg-surface text-text2 hover:border-text3'
                                    )}
                                >
                                    {opt}
                                </button>
                            )
                        })}
                    </div>
                    {step === 1 && selectedRisk === OTHER_HABIT && <input aria-label="Your habit" placeholder="Name your habit" className="w-full bg-surface p-3 text-white" maxLength={80} value={customHabit} onChange={e => setCustomHabit(e.target.value)} />}
                    <button
                        onClick={() => setStep(step + 1)}
                        disabled={step === 1 ? !habit : s.multi ? s.selected.length === 0 : !s.selected}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-surface border border-border font-mono text-[10px] tracking-[2px] uppercase text-white hover:bg-surface2 transition-colors disabled:opacity-30"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm flex flex-col gap-8 text-center">
                {step > 0 && <button disabled={busy} className="text-text2 self-start" onClick={() => setStep(step - 1)}>Back</button>}
                    <ProgressDots total={TOTAL_DOTS} current={step} />

                <Zap size={40} className="text-amber mx-auto" />

                <div>
                    <h2 className="font-condensed font-black text-[28px] leading-tight tracking-[-0.5px] text-white uppercase">
                        Your system is ready
                    </h2>
                    <p className="font-mono text-[9px] tracking-[2px] uppercase text-text3 mt-3">
                        {selectedTime?.split(' (')[0]} Reset — {selectedHelps.join(' → ')}
                    </p>
                    <p className="font-mono text-[8px] tracking-[1px] text-text3 mt-2">
                        You can edit your routine in Settings.
                    </p>
                </div>

                {error && (
                    <div className="font-mono text-[10px] text-red border border-red p-2 bg-red-dim text-left">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleFinish}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-amber text-black font-mono text-[11px] tracking-[2px] uppercase font-bold hover:bg-amber/90 transition-colors disabled:opacity-50"
                >
                    {busy ? 'INITIALIZING...' : 'Create routine'}
                </button>
            </div>
        </div>
    )
}

/** @intent Compact progress dots — highlights completed steps */
function ProgressDots({ total, current }) {
    return (
        <div className="flex gap-1.5 justify-center">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        i <= current ? 'bg-amber' : 'bg-border'
                    )}
                />
            ))}
        </div>
    )
}
