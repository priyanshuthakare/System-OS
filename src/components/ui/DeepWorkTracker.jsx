import { Play, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { db } from '../../lib/db'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'

/**
 * @intent Isolated timer module for tracking Deep Work sessions and logging to DB
 */
export default function DeepWorkTracker({ todayNum }) {
    const deepWorkMinutes = useAppStore(state => state.deepWorkMinutes)
    const setDeepWorkMinutes = useAppStore(state => state.setDeepWorkMinutes)

    const [isActive, setIsActive] = useState(false)
    const [sessionSeconds, setSessionSeconds] = useState(0)

    useEffect(() => {
        let interval = null

        if (isActive) {
            interval = setInterval(() => {
                setSessionSeconds(prev => {
                    const next = prev + 1
                    // Every 60 seconds (1 minute), sync to global store and Dexie DB
                    if (next > 0 && next % 60 === 0) {
                        const newTotal = deepWorkMinutes + 1
                        setDeepWorkMinutes(newTotal)

                        // Save to DB in background
                        db.days.update(todayNum, { deep_work_minutes: newTotal }).catch(err => {
                            console.error("Failed to save deep work minute:", err)
                        })
                    }
                    return next
                })
            }, 1000)
        } else if (!isActive && sessionSeconds !== 0) {
            clearInterval(interval)
        }

        return () => clearInterval(interval)
    }, [isActive, deepWorkMinutes, setDeepWorkMinutes, todayNum])

    const handleToggle = () => {
        setIsActive(!isActive)
    }

    const formatCurrentSession = () => {
        const m = Math.floor(sessionSeconds / 60)
        const s = sessionSeconds % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="bg-surface border border-border p-4 mb-4 flex justify-between items-center">
            <div className="flex flex-col">
                <div className="font-mono text-[9px] tracking-[2px] uppercase text-text3 mb-2 flex items-center gap-2">
                    DEEP WORK TODAY
                    {isActive && <span className="text-amber animate-pulse tracking-[1px]">• ACTIVE</span>}
                </div>
                <div className="flex items-end gap-2">
                    <div className="font-condensed font-black text-[32px] text-white leading-none">
                        {deepWorkMinutes}
                    </div>
                    <div className="font-mono text-[10px] text-text3 pb-1">
                        / 90 MIN
                    </div>
                </div>

                {/* Progress Line */}
                <div className="h-[3px] bg-border relative w-full mt-3">
                    <div
                        className="absolute left-0 top-0 h-full bg-amber transition-all duration-300"
                        style={{ width: `${Math.min((deepWorkMinutes / 90) * 100, 100)}%` }}
                    />
                </div>
            </div>

            <button
                onClick={handleToggle}
                className={cn(
                    "flex flex-col items-center justify-center p-3 border-[1.5px] shrink-0 transition-colors w-[60px] h-[60px]",
                    isActive ? "border-amber bg-amber/10 text-amber" : "border-border2 bg-transparent text-white hover:bg-border"
                )}
            >
                {isActive ? <Square size={16} strokeWidth={2} className="mb-1 fill-amber" /> : <Play size={18} strokeWidth={2} className="mb-1 ml-1" />}
                <div className="font-mono text-[8px] tracking-[1px] uppercase">
                    {isActive ? formatCurrentSession() : "START"}
                </div>
            </button>
        </div>
    )
}
