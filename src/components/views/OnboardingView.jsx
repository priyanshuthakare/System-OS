import { useState } from 'react'
import { ChevronRight, Zap, Brain } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { db } from '../../lib/db'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/utils'

const TIMES = ['Morning (6-9 AM)', 'Afternoon (12-4 PM)', 'Evening (5-8 PM)', 'Night (9 PM+)']
const RISKS = ['Scrolling', 'Porn', 'Avoidance', 'Overeating', 'Anxiety']
const HELPS = ['Water', 'Walk', 'Breathing', 'Work', 'Pushups']

const TIME_MAP = {
    'Morning (6-9 AM)': { start: '06:00:00', end: '09:00:00' },
    'Afternoon (12-4 PM)': { start: '12:00:00', end: '16:00:00' },
    'Evening (5-8 PM)': { start: '17:00:00', end: '20:00:00' },
    'Night (9 PM+)': { start: '21:00:00', end: '23:59:00' }
}

const SEVERITY_OPTIONS = ['Rarely', 'Sometimes', 'Often', 'Almost always']
const SEVERITY_MAP = { 'Rarely': 0.25, 'Sometimes': 0.5, 'Often': 0.75, 'Almost always': 0.95 }
const STREAK_OPTIONS = ['Less than a week', '1–2 weeks', '3–4 weeks', 'Over a month']
const STREAK_MAP = { 'Less than a week': 0.9, '1–2 weeks': 0.7, '3–4 weeks': 0.5, 'Over a month': 0.3 }

/**
 * @intent Brain diagnostic questions — 6 questions that map to brain region baselines.
 *         Each answer produces a dysregulation score (0–1) stored in brain_baseline.
 */
const DIAGNOSTIC_SCREENS = [
    {
        question: 'How often do you act on urges you later regret?',
        subtitle: 'Impulsive scrolling, bingeing, compulsive behavior',
        region: 'amygdala',
        options: SEVERITY_OPTIONS,
        valueMap: SEVERITY_MAP,
    },
    {
        question: 'How hard is it to start tasks when you know you should?',
        subtitle: 'Procrastination, avoidance, negotiating with yourself',
        region: 'prefrontal',
        options: SEVERITY_OPTIONS,
        valueMap: SEVERITY_MAP,
    },
    {
        question: 'How physically inactive have you been lately?',
        subtitle: 'Sedentary days, skipping movement, staying in bed',
        region: 'motorCortex',
        options: SEVERITY_OPTIONS,
        valueMap: SEVERITY_MAP,
    },
    {
        question: 'How often do you feel overwhelmed with no clear trigger?',
        subtitle: 'Anxiety spikes, restlessness, body tension',
        region: 'insula',
        options: SEVERITY_OPTIONS,
        valueMap: SEVERITY_MAP,
    },
    {
        question: 'How often do you break your own rules or commitments?',
        subtitle: 'Saying "just this once", ignoring your own boundaries',
        region: 'anteriorCingulate',
        options: SEVERITY_OPTIONS,
        valueMap: SEVERITY_MAP,
    },
    {
        question: 'How long since you had a streak of consistent days?',
        subtitle: 'Days where you followed through on what you planned',
        region: 'global',
        options: STREAK_OPTIONS,
        valueMap: STREAK_MAP,
    },
]

/**
 * @intent Onboarding flow: 3 state-builder screens → 6 brain diagnostic screens → confirmation.
 *         Diagnostic answers are stored in brain_baseline (Dexie) and seed the healing model.
 */
export default function OnboardingView() {
    const user = useAuthStore(s => s.user)
    const setOnboarded = useAuthStore(s => s.setOnboarded)
    const [step, setStep] = useState(0)
    const [selectedTime, setSelectedTime] = useState(null)
    const [selectedRisk, setSelectedRisk] = useState(null)
    const [selectedHelps, setSelectedHelps] = useState([])
    const [diagnosticAnswers, setDiagnosticAnswers] = useState({})
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)

    const toggleHelp = (h) => {
        setSelectedHelps(prev =>
            prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h].slice(0, 3)
        )
    }

    // Total steps: 3 state-builder + 6 diagnostic + 1 confirmation = 10
    const TOTAL_DOTS = 10
    const DIAGNOSTIC_START = 3
    const CONFIRMATION_STEP = 9

    const handleFinish = async () => {
        if (!user || !selectedTime || !selectedRisk || selectedHelps.length === 0) return
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
                risk_behavior: selectedRisk.toLowerCase(),
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
                    has_timer: i === selectedHelps.length - 1,
                    time_estimate_mins: i === selectedHelps.length - 1 ? 15 : 2,
                    sort_order: i + 1
                }))
                const { error: checkErr } = await supabase.from('checklists').insert(items)
                if (checkErr) console.error('Checklist insert warning:', checkErr.message)
            }

            // ── Store brain baseline from diagnostic answers ──────────────────
            // The global multiplier scales all per-region baselines
            const globalMultiplier = diagnosticAnswers.global ?? 0.7
            const baseline = {
                motorCortex:       (diagnosticAnswers.motorCortex ?? 0.5) * globalMultiplier,
                prefrontal:        (diagnosticAnswers.prefrontal ?? 0.5) * globalMultiplier,
                insula:            (diagnosticAnswers.insula ?? 0.5) * globalMultiplier,
                amygdala:          (diagnosticAnswers.amygdala ?? 0.5) * globalMultiplier,
                anteriorCingulate: (diagnosticAnswers.anteriorCingulate ?? 0.5) * globalMultiplier,
                dorsolateralPFC:   (diagnosticAnswers.prefrontal ?? 0.5) * globalMultiplier,
                capturedAt: new Date().toISOString(),
            }
            await db.brain_baseline.clear()
            await db.brain_baseline.add(baseline)

            // Seed initial region streaks (all start at 0)
            const regions = ['motorCortex', 'prefrontal', 'insula', 'amygdala', 'anteriorCingulate', 'dorsolateralPFC']
            await db.region_streaks.clear()
            await db.region_streaks.bulkAdd(regions.map(r => ({
                region: r,
                streak_days: 0,
                last_updated: new Date().toISOString().split('T')[0],
            })))

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
            question: 'When do you usually lose control?',
            subtitle: 'Pick the window where drift hits hardest',
            options: TIMES,
            selected: selectedTime,
            onSelect: setSelectedTime
        },
        {
            question: 'What usually happens?',
            subtitle: 'The default behavior that hijacks you',
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
    if (step < DIAGNOSTIC_START) {
        const s = stateScreens[step]
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm flex flex-col gap-8">
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
                    <button
                        onClick={() => setStep(step + 1)}
                        disabled={s.multi ? s.selected.length === 0 : !s.selected}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-surface border border-border font-mono text-[10px] tracking-[2px] uppercase text-white hover:bg-surface2 transition-colors disabled:opacity-30"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        )
    }

    // ── Render: Diagnostic screens (steps 3–8) ────────────────────────────────
    if (step >= DIAGNOSTIC_START && step < CONFIRMATION_STEP) {
        const diagIdx = step - DIAGNOSTIC_START
        const diag = DIAGNOSTIC_SCREENS[diagIdx]
        const currentAnswer = diagnosticAnswers[diag.region] ?? null
        const currentLabel = currentAnswer !== null
            ? diag.options.find(o => diag.valueMap[o] === currentAnswer) || null
            : null

        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm flex flex-col gap-8">
                    <ProgressDots total={TOTAL_DOTS} current={step} />

                    {/* Brain icon for diagnostic section */}
                    {diagIdx === 0 && (
                        <div className="text-center">
                            <Brain size={28} className="text-amber mx-auto mb-2" />
                            <div className="font-mono text-[8px] tracking-[3px] uppercase text-text3">
                                Brain State Capture
                            </div>
                        </div>
                    )}

                    <div className="text-center">
                        <h2 className="font-condensed font-black text-[24px] leading-tight tracking-[-0.5px] text-white uppercase">
                            {diag.question}
                        </h2>
                        <p className="font-mono text-[9px] tracking-[2px] uppercase text-text3 mt-2">{diag.subtitle}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        {diag.options.map(opt => {
                            const isActive = currentLabel === opt
                            return (
                                <button
                                    key={opt}
                                    onClick={() => setDiagnosticAnswers(prev => ({
                                        ...prev,
                                        [diag.region]: diag.valueMap[opt]
                                    }))}
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

                    <button
                        onClick={() => setStep(step + 1)}
                        disabled={currentAnswer === null}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-surface border border-border font-mono text-[10px] tracking-[2px] uppercase text-white hover:bg-surface2 transition-colors disabled:opacity-30"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        )
    }

    // ── Render: Confirmation screen (step 9) ──────────────────────────────────
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm flex flex-col gap-8 text-center">
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
                        Brain baseline captured — watch it heal over time
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
                    {busy ? 'INITIALIZING...' : 'ACTIVATE SYSTEM'}
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
