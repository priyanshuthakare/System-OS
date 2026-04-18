import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { db, getOrCreateDay } from '../../lib/db'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { syncDailyProgress } from '../../lib/utils'

const DEFAULT_ACTIONS = ['10 pushups. Right now.', 'Write 3 lines below', 'Resume scheduled block']
const DEFAULT_RULES = ['Laptop on bed', 'Screens down', 'WiFi on', 'Scrolled early', 'None']
const DEFAULT_PHASES = ['Morning', '4-7 PM', 'Late night', 'Other']
const DEFAULT_EMOTIONS = ['Boredom', 'Anxiety', 'Loneliness', 'Fatigue', 'Frustration']

/**
 * @intent Screen 5: Failure Containment — interactive immediate actions, diagnostic, proper violation logging
 * @param None
 */
export default function FailureOverlay() {
    const setFailureActive = useAppStore(state => state.setFailureActive)

    // Pull dynamic options from Dexie preferences
    const actionsPref = useLiveQuery(() => db.user_preferences.get('failure_immediate_actions'))
    const rulesPref = useLiveQuery(() => db.user_preferences.get('failure_rules'))
    const phasesPref = useLiveQuery(() => db.user_preferences.get('failure_phases'))
    const emotionsPref = useLiveQuery(() => db.user_preferences.get('failure_emotions'))

    const immediateActions = actionsPref ? JSON.parse(actionsPref.value) : DEFAULT_ACTIONS
    const ruleOptions = rulesPref ? JSON.parse(rulesPref.value) : DEFAULT_RULES
    const phaseOptions = phasesPref ? JSON.parse(phasesPref.value) : DEFAULT_PHASES
    const emotionOptions = emotionsPref ? JSON.parse(emotionsPref.value) : DEFAULT_EMOTIONS

    const [actionsChecked, setActionsChecked] = useState({})
    const [writeLines, setWriteLines] = useState('')
    const [rule, setRule] = useState(ruleOptions[0])
    const [statePhase, setStatePhase] = useState(phaseOptions[0])
    const [emotion, setEmotion] = useState(emotionOptions[0])
    const [logging, setLogging] = useState(false)

    const today = new Date().toISOString().split('T')[0]

    // Sequential action completion — each action must be done in order
    const nextActionIdx = Object.keys(actionsChecked).length
    const allActionsDone = nextActionIdx >= immediateActions.length

    const toggleAction = (idx) => {
        if (idx !== nextActionIdx) return
        if (actionsChecked[idx]) return
        setActionsChecked(prev => ({ ...prev, [idx]: true }))
    }

    const DiagnosticSection = ({ label, options, selected, onSelect }) => (
        <div className="mb-6">
            <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-3">
                {label}
            </div>
            <div className="flex flex-wrap gap-2">
                {options.map((opt, i) => (
                    <div
                        key={i}
                        onClick={() => onSelect(opt)}
                        className={cn(
                            "px-4 py-2 border font-mono text-[10px] uppercase tracking-[1px] transition-colors cursor-pointer",
                            opt === selected
                                ? "bg-red/10 border-red text-red"
                                : "bg-surface border-border text-text2 hover:text-white"
                        )}>
                        {opt}
                    </div>
                ))}
            </div>
        </div>
    )

    const handleReentry = async () => {
        setLogging(true)

        try {
            // Save failure event to Dexie
            const now = new Date()
            await db.failure_events.add({
                date: today,
                time: now.toTimeString().split(' ')[0],
                rule_broken_id: rule,
                state_id: statePhase,
                prior_emotion: emotion,
                action_taken: true
            })

            // Increment the day's violation count and re-sync compliance
            if (rule !== 'None') {
                await db.rule_violations.add({
                    rule_id: rule,
                    date: today,
                    time: now.toTimeString().split(' ')[0]
                })

                // FIX: Actually increment violations on the day record
                const day = await getOrCreateDay(today)
                await db.days.update(today, {
                    violations: (day.violations || 0) + 1
                })

                // Re-calculate compliance with updated violation count
                await syncDailyProgress(today)
            }
        } catch (e) {
            console.error('Failure reentry error:', e)
        } finally {
            setLogging(false)
            setFailureActive(false)
        }
    }

    return (
        <div className="absolute inset-0 bg-black z-[100] flex flex-col">
            <div className="bg-red px-6 py-6 pb-5 shrink-0 relative">
                <div className="font-mono text-[9px] tracking-[3px] text-white/50 mb-2 uppercase">
                    FAILURE CONTAINMENT
                </div>
                <div className="font-condensed font-black text-[48px] uppercase tracking-[-1px] text-white leading-[0.9]">
                    RE-<br />ENTRY
                </div>
                <div className="font-mono text-[10px] text-white/60 mt-2.5 tracking-[1px] leading-[1.6]">
                    Relapse ≠ failure. Rule violation = structural failure.<br />Treat them differently. Execute the next step.
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">

                {/* Interactive Immediate Actions — must be completed sequentially */}
                <div className="mb-8">
                    <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-3">
                        IMMEDIATE ACTIONS (NON-NEGOTIABLE)
                    </div>
                    <div className="border border-border bg-surface flex flex-col gap-0">
                        {immediateActions.map((text, i) => {
                            const isDone = !!actionsChecked[i]
                            const isCurrent = i === nextActionIdx
                            const isLocked = i > nextActionIdx
                            const isWriteStep = text.toLowerCase().includes('write')

                            return (
                                <div key={i}>
                                    <button
                                        onClick={() => toggleAction(i)}
                                        disabled={!isCurrent || (isWriteStep && !writeLines.trim())}
                                        className={cn(
                                            "w-full p-[14px] flex gap-4 items-center border-b border-border last:border-b-0 text-left transition-all",
                                            isDone && "opacity-50",
                                            isCurrent && !isDone && "bg-red-dim",
                                            isLocked && "opacity-30"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-[18px] h-[18px] border-[1.5px] shrink-0 flex items-center justify-center transition-colors",
                                            isDone ? "border-green bg-green" : isCurrent ? "border-red" : "border-border2"
                                        )}>
                                            {isDone && <Check size={10} className="text-black" />}
                                        </div>
                                        <div className={cn(
                                            "font-body text-[14px]",
                                            isDone ? "text-text3 line-through" : isCurrent ? "text-white" : "text-text2"
                                        )}>
                                            {text}
                                        </div>
                                    </button>

                                    {/* Write input for the "Write 3 lines" step */}
                                    {isWriteStep && isCurrent && !isDone && (
                                        <div className="px-4 pb-4 bg-red-dim border-b border-border">
                                            <textarea
                                                value={writeLines}
                                                onChange={(e) => setWriteLines(e.target.value)}
                                                placeholder="What happened? Write it down..."
                                                rows={3}
                                                className="w-full bg-black border border-border p-3 font-body text-sm text-white placeholder-text3 outline-none focus:border-red transition-colors resize-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Diagnostics — only visible after all actions are done */}
                {allActionsDone && (
                    <>
                        <DiagnosticSection
                            label="WHAT ENVIRONMENT RULE BROKE?"
                            options={ruleOptions}
                            selected={rule}
                            onSelect={setRule}
                        />

                        <DiagnosticSection
                            label="WHAT STATE WERE YOU IN?"
                            options={phaseOptions}
                            selected={statePhase}
                            onSelect={setStatePhase}
                        />

                        <DiagnosticSection
                            label="EMOTION THAT PRECEDED?"
                            options={emotionOptions}
                            selected={emotion}
                            onSelect={setEmotion}
                        />

                        <button
                            onClick={handleReentry}
                            disabled={logging}
                            className="w-full bg-red text-white border-0 font-condensed font-bold text-[16px] tracking-[3px] uppercase py-[18px] mt-4 mb-5 disabled:opacity-50"
                        >
                            {logging ? 'INJECTING SYSTEM...' : 'RE-ENTER SCHEDULE'}
                        </button>

                        <div className="text-center font-mono text-[10px] leading-[1.8] text-text3 tracking-[1px]">
                            No streak reset.<br />
                            No shame metrics.<br />
                            Just re-entry.
                        </div>
                    </>
                )}

                {!allActionsDone && (
                    <div className="text-center font-mono text-[9px] text-text3 tracking-[1px] py-4 border border-border">
                        Complete all immediate actions to continue
                    </div>
                )}
            </div>
        </div>
    )
}
