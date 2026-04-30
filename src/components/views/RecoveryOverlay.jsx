import { ChevronRight, Heart, AlertTriangle } from 'lucide-react'
import { useRecoveryLogic } from '../../hooks/useRecoveryLogic'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

/**
 * @intent Recovery overlay (System 4) — intercepts failure without punishment, forces physical action in 20s
 * @param {Function} props.onClose - Callback to dismiss the overlay
 */
export default function RecoveryOverlay({ onClose }) {
    const currentBlockId = useAppStore(s => s.currentBlockId)
    const { step, setStep, trigger, setTrigger, action, setAction, saving, submit, RECOVERY_ACTIONS } = useRecoveryLogic(currentBlockId)

    // Step 0: What triggered it?
    if (step === 0) {
        return (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6">
                <div className="w-full max-w-sm flex flex-col gap-6">
                    <AlertTriangle size={36} className="text-amber mx-auto" />
                    <h2 className="font-condensed font-black text-[28px] leading-tight text-white uppercase text-center">
                        What triggered<br/>this?
                    </h2>
                    <p className="font-mono text-[9px] tracking-[2px] uppercase text-text3 text-center">
                        No judgment. Just data.
                    </p>

                    <input
                        type="text"
                        placeholder="e.g. boredom, anxiety, phone near bed..."
                        value={trigger}
                        onChange={(e) => setTrigger(e.target.value)}
                        maxLength={100}
                        className="w-full bg-surface border border-border p-3 font-body text-sm text-white placeholder-text3 outline-none focus:border-amber transition-colors"
                    />

                    <button
                        onClick={() => setStep(1)}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-surface border border-border font-mono text-[10px] tracking-[2px] uppercase text-white hover:bg-surface2 transition-colors"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        )
    }

    // Step 1: Recovery action
    if (step === 1) {
        return (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6">
                <div className="w-full max-w-sm flex flex-col gap-6">
                    <Heart size={36} className="text-red mx-auto" />
                    <h2 className="font-condensed font-black text-[28px] leading-tight text-white uppercase text-center">
                        Recovery action<br/>now
                    </h2>
                    <p className="font-mono text-[9px] tracking-[2px] uppercase text-text3 text-center">
                        Pick one. Do it immediately.
                    </p>

                    <div className="flex flex-col gap-2">
                        {RECOVERY_ACTIONS.map(a => (
                            <button
                                key={a}
                                onClick={() => setAction(a)}
                                className={cn(
                                    "w-full p-3 border text-left font-body text-sm transition-all",
                                    action === a
                                        ? 'border-green bg-green/10 text-green'
                                        : 'border-border bg-surface text-text2 hover:border-text3'
                                )}
                            >
                                {a}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => submit(onClose)}
                        disabled={!action || saving}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-green text-black font-mono text-[11px] tracking-[2px] uppercase font-bold hover:bg-green/90 transition-colors disabled:opacity-40"
                    >
                        {saving ? 'LOGGING...' : 'DONE — RETURN TO SYSTEM'}
                    </button>
                </div>
            </div>
        )
    }

    return null
}
