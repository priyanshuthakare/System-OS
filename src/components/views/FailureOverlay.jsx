import { useState } from 'react'
import { db } from '../../lib/db'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'

/**
 * @intent Screen 5: Failure Containment (Wired to Dexie)
 * @param None
 */
export default function FailureOverlay() {
    const setFailureActive = useAppStore(state => state.setFailureActive)

    const [rule, setRule] = useState('Laptop on bed')
    const [statePhase, setStatePhase] = useState('4-7 PM')
    const [emotion, setEmotion] = useState('Anxiety')
    const [logging, setLogging] = useState(false)

    const DiagnosticSection = ({ label, options, selected, onSelect }) => (
        <div className="mb-6">
            <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-3">
        // {label}
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

        // 1. Log the failure event context
        await db.failure_events.put({
            event_date: new Date().toISOString(),
            violation_type: rule,
            context_state: statePhase,
            preceding_emotion: emotion,
            immediate_action_taken: true
        })

        // 2. If it's a specific rule break, log a formal violation too
        if (rule !== 'None') {
            await db.rule_violations.put({
                rule_id: 'auto-generated', // In prod, map this to actual UUID
                violation_date: new Date().toISOString(),
                notes: `Context: ${statePhase}, Emotion: ${emotion}`
            })
        }

        setLogging(false)
        setFailureActive(false)
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

                {/* Immediate Actions */}
                <div className="mb-8">
                    <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-3">
            // immediate actions (non-negotiable)
                    </div>
                    <div className="border border-border bg-surface flex flex-col gap-0">
                        {['10 pushups. Right now.', 'Write 3 lines below', 'Resume scheduled block'].map((text, i) => (
                            <div key={i} className="p-[14px] flex gap-4 items-center border-b border-border last:border-b-0">
                                <div className="w-[18px] h-[18px] border-[1.5px] border-border2 shrink-0" />
                                <div className="font-body text-[14px] text-text2">{text}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Diagnostics Form */}
                <DiagnosticSection
                    label="what environment rule broke?"
                    options={['Laptop on bed', 'Screens down', 'WiFi on', 'Scrolled early', 'None']}
                    selected={rule}
                    onSelect={setRule}
                />

                <DiagnosticSection
                    label="what state were you in?"
                    options={['Morning', '4-7 PM', 'Late night', 'Other']}
                    selected={statePhase}
                    onSelect={setStatePhase}
                />

                <DiagnosticSection
                    label="emotion that preceded?"
                    options={['Boredom', 'Anxiety', 'Loneliness', 'Fatigue', 'Frustration']}
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
            </div>
        </div>
    )
}
