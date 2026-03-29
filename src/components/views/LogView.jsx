import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Lock } from 'lucide-react'
import { useChecklist } from '../../hooks/useChecklist'
import { db } from '../../lib/db'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'

/**
 * @intent Tab 2: Full Day Schedule — READ-ONLY view of all blocks and their checklists.
 * No interaction allowed here. Checking/unchecking happens ONLY from the Today tab.
 * @param None
 */
export default function LogView() {
    const currentBlockId = useAppStore(state => state.currentBlockId)
    const todayNum = new Date().toISOString().split('T')[0]

    const blocks = useLiveQuery(() =>
        db.time_blocks.orderBy('sort_order').toArray()
    )

    if (!blocks) return <div className="p-6 font-mono text-[10px] text-text3">Loading schedule...</div>

    return (
        <div className="flex-1 overflow-y-auto w-full flex flex-col">
            {/* Header */}
            <div className="p-6 pt-8 pb-4 border-b border-border shrink-0">
                <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-2">
                    // full schedule
                </div>
                <div className="font-condensed font-black text-[36px] leading-[0.9] tracking-[-1px] text-white uppercase">
                    DAILY<br />LOG
                </div>
                <div className="font-mono text-[9px] text-text3 mt-2 tracking-[1px]">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · All Blocks · View Only
                </div>
            </div>

            {/* Schedule body */}
            <div className="flex-1 overflow-y-auto p-6">
                {blocks.map(block => (
                    <LogBlockSection
                        key={block.id}
                        block={block}
                        dateString={todayNum}
                        isActive={block.id === currentBlockId}
                    />
                ))}
            </div>
        </div>
    )
}

/**
 * @intent Read-only block section showing all checklist items with completion state
 * @param {{ block: object, dateString: string, isActive: boolean }}
 */
function LogBlockSection({ block, dateString, isActive }) {
    const { items, loading } = useChecklist(dateString, block.id)

    const doneCount = items.filter(i => i.isDone).length
    const totalCount = items.length
    const isComplete = totalCount > 0 && doneCount === totalCount

    const statusLabel = isComplete ? 'COMPLETE' : isActive ? 'ACTIVE' : doneCount > 0 ? 'PARTIAL' : 'PENDING'
    const statusColor = isComplete ? 'text-green border-green' : isActive ? 'text-amber border-amber' : doneCount > 0 ? 'text-amber border-amber/50' : 'text-text3 border-text3/30'

    return (
        <div className={cn("mb-6", block.is_sleep && "opacity-60")}>
            {/* Block header */}
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-text2">
                    {block.name}
                </div>
                <div className="font-mono text-[9px] text-text3">
                    {block.start_time?.slice(0, 5)} — {block.end_time?.slice(0, 5)}
                </div>
            </div>

            {/* Status pill */}
            <div className={cn(
                "inline-block font-mono text-[8px] tracking-[2px] uppercase px-2.5 py-1 border mb-3",
                statusColor
            )}>
                {statusLabel}
            </div>

            {/* Items — read-only */}
            {loading ? (
                <div className="font-mono text-[10px] text-text3 py-2">Loading...</div>
            ) : items.length === 0 ? (
                <div className="font-mono text-[10px] text-text3 py-2">No checklist items</div>
            ) : (
                <div className="flex flex-col">
                    {items.map((item, i) => {
                        const isDone = item.isDone
                        const isLocked = item.is_locked

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex items-center gap-3.5 py-3 border-b border-border last:border-b-0",
                                    isDone && "opacity-50"
                                )}
                            >
                                {/* Step number */}
                                <div className={cn(
                                    "font-mono text-[9px] w-4 shrink-0",
                                    isDone ? "text-text3" : "text-text3"
                                )}>
                                    {String(i + 1).padStart(2, '0')}
                                </div>

                                {/* Checkbox visual (non-interactive) */}
                                <div className={cn(
                                    "w-4 h-4 border-[1.5px] shrink-0 flex items-center justify-center",
                                    isDone ? "border-green bg-green" : "border-border2"
                                )}>
                                    {isDone && <Check size={10} className="text-black" />}
                                </div>

                                {/* Label */}
                                <div className={cn(
                                    "flex-1 font-body text-sm",
                                    isDone ? "text-text3 line-through" : "text-text"
                                )}>
                                    {item.label}
                                </div>

                                {/* Lock indicator */}
                                {isLocked && (
                                    <div className="font-mono text-[8px] text-text3 flex items-center gap-1">
                                        <Lock size={8} /> LOCKED
                                    </div>
                                )}

                                {/* Timer indicator */}
                                {!isLocked && item.has_timer && !isDone && (
                                    <div className="font-mono text-[9px] text-amber">
                                        {item.time_estimate_mins || 5}m
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
