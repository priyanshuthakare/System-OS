import { Check } from 'lucide-react'
import { useItemTimer } from '../../hooks/useItemTimer'
import { cn } from '../../lib/utils'

/**
 * @intent Checklist item row with custom checkbox and optional inline timer
 * @param {object} props
 * @param {boolean} props.isDone - Completed state
 * @param {string} props.label - Task name
 * @param {string} [props.meta] - Optional timer or locked label
 * @param {boolean} [props.isLocked] - Disable interaction state
 * @param {boolean} [props.hasTimer] - If true, requires a countdown
 * @param {number} [props.timerMinutes] - Duration of timer if hasTimer is true
 * @param {function} props.onClick - Toggle action (only called after timer if hasTimer)
 */
export default function CheckboxItem({ isDone, label, meta, isLocked, hasTimer, timerMinutes = 5, onClick, highlighted = false }) {

    // Default timer to 30 mins if it's the Business Block, else 5 mins
    const minutes = label.toLowerCase().includes('30-min') ? 30 : timerMinutes

    const { isActive, secondsLeft, startTimer, formatTime } = useItemTimer(minutes, () => {
        // Auto-complete when timer hits zero
        if (!isDone) onClick()
    })

    const handleClick = () => {
        if (isLocked || isDone) return

        if (hasTimer) {
            startTimer()
        } else {
            onClick()
        }
    }

    return (
        <div
            onClick={handleClick}
            className={cn(
                "p-[13px] px-4 flex items-center gap-[14px] border-b border-border last:border-b-0",
                isLocked ? "opacity-40" : (hasTimer && isActive ? "bg-amber/10" : "cursor-pointer"),
                highlighted && !isDone && "bg-amber/5"
            )}
        >
            {/* Left Checkbox / Action Area */}
            {hasTimer && !isDone ? (
                <div className={cn(
                    "font-mono text-[9px] px-2 py-1 shrink-0",
                    isLocked ? "text-text3 border border-border" : (isActive ? "text-white bg-amber border border-amber" : "text-amber border border-amber cursor-pointer")
                )}>
                    {isActive ? formatTime() : "START"}
                </div>
            ) : (
                <div className={cn(
                    "w-[18px] h-[18px] border-[1.5px] border-border2 shrink-0 flex items-center justify-center transition-colors",
                    isDone ? "bg-green border-green" : "",
                    highlighted && !isDone && "border-amber"
                )}>
                    {isDone && <Check size={14} color="white" strokeWidth={3} />}
                </div>
            )}

            {/* Label */}
            <div className={cn(
                "flex-1 font-body text-[14px] font-normal",
                isDone ? "text-text3 line-through decoration-text3" : "text-text",
                highlighted && !isDone && "text-white"
            )}>
                {label}
            </div>

            {/* Right Meta Tag */}
            {meta && !isActive && (
                <div className={cn(
                    "font-mono text-[9px] tracking-[1px]",
                    isLocked ? "text-text3 border border-border px-2 py-1" :
                        highlighted && !isDone ? "text-amber font-bold" : "text-text3"
                )}>
                    {meta}
                </div>
            )}

            {isActive && (
                <div className="font-mono text-[9px] text-amber animate-pulse tracking-[1px] uppercase">
                    IN PROGRESS
                </div>
            )}
        </div>
    )
}
