import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { syncDailyProgress } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import CheckboxItem from '../ui/CheckboxItem'
import StatePill from '../ui/StatePill'

/**
 * @intent Screen 2: Detailed Schedule View (Wired to Dexie)
 * @param None
 */
export default function LogView() {
    const deepWorkMinutes = useAppStore(state => state.deepWorkMinutes)

    // Use today's date for checklist completions status
    const todayNum = new Date().toISOString().split('T')[0]

    // Reactive Dexie fetch
    const data = useLiveQuery(async () => {
        const bData = await db.time_blocks.orderBy('start_time').toArray()
        const tData = await db.checklist_templates.orderBy('sort_order').toArray()
        const cData = await db.checklist_completions.where('date').equals(todayNum).toArray()

        const grouped = {}
        if (tData) {
            tData.forEach(t => {
                if (!grouped[t.block_id]) grouped[t.block_id] = []
                grouped[t.block_id].push(t)
            })
        }

        return {
            blocks: bData || [],
            templatesByBlock: grouped,
            completions: cData ? cData.map(c => c.template_id) : []
        }
    }, [todayNum])

    const loading = data === undefined
    const blocks = data?.blocks || []
    const templatesByBlock = data?.templatesByBlock || {}
    const completions = data?.completions || []

    const toggleLogItem = async (templateId, currentState) => {
        const newState = !currentState

        if (newState) {
            await db.checklist_completions.put({
                template_id: templateId,
                date: todayNum,
                completed_at: new Date().toISOString()
            })
        } else {
            await db.checklist_completions
                .where({ template_id: templateId, date: todayNum })
                .delete()
        }

        // Push global count
        await syncDailyProgress(todayNum)
    }

    const BlockRow = ({ block, index }) => {
        // Generate a status based on time logic (simplified for UI purposes)
        const currentHour = new Date().getHours() // rough check
        const startHour = parseInt(block.start_time.split(':')[0])

        let status = 'upcoming'
        if (currentHour === startHour) status = 'current'
        else if (startHour < currentHour) status = 'complete'

        const templates = templatesByBlock[block.id] || []

        return (
            <div className="mb-6">
                <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
                    <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-text2">
                        {block.name}
                    </div>
                    <div className="font-mono text-[9px] text-text3">
                        {block.start_time.substring(0, 5)} - {block.end_time.substring(0, 5)}
                    </div>
                </div>

                {block.is_keystone && (
                    <div className="bg-amber-dim border border-amber px-3.5 py-2.5 mb-3.5 flex items-center gap-2.5">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v5M6 9v2" stroke="#C87D2F" strokeWidth="1.5" strokeLinecap="round" /><circle cx="6" cy="6" r="5" stroke="#C87D2F" strokeWidth="1" /></svg>
                        <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-amber">
                            KEYSTONE — Complete before any scroll
                        </div>
                    </div>
                )}

                <div className="mb-3.5">
                    <StatePill color={status === 'current' ? 'red' : status === 'complete' ? 'green' : 'dim'}>
                        {status === 'current' ? 'PENDING' : status === 'complete' ? 'COMPLETE' : 'UPCOMING'}
                    </StatePill>
                </div>

                {/* Templates loop */}
                {templates.length > 0 && (
                    <div className="flex flex-col">
                        {(() => {
                            let previousDone = true;
                            return templates.map((tmpl, idx) => {
                                const isDone = completions.includes(tmpl.id)

                                let strictlyLocked = false
                                if (block.id === 3) {
                                    strictlyLocked = !previousDone
                                } else {
                                    strictlyLocked = tmpl.is_locked
                                }

                                previousDone = isDone

                                // Normal or Keystone checklist items 
                                return (
                                    <CheckboxItem
                                        key={tmpl.id}
                                        label={tmpl.label}
                                        isDone={isDone}
                                        isLocked={strictlyLocked}
                                        hasTimer={tmpl.has_timer}
                                        meta={tmpl.has_timer ? "TIMER →" : (strictlyLocked ? "LOCKED" : (block.is_keystone ? `0${idx + 1}` : null))}
                                        highlighted={block.is_keystone || tmpl.has_timer}
                                        onClick={() => toggleLogItem(tmpl.id, isDone)}
                                    />
                                )
                            })
                        })()}
                    </div>
                )}

                {/* Specific rule for Evening Deep Work progress bar */}
                {block.name.includes("Deep Work") && (
                    <div className="bg-surface border border-border p-4 mt-2">
                        <div className="flex justify-between mb-2.5">
                            <div className="font-mono text-[9px] tracking-[2px] uppercase text-text3">
                                Target
                            </div>
                            <div className="font-mono text-[9px] text-text3">
                                {deepWorkMinutes} / 90 MIN
                            </div>
                        </div>
                        <div className="h-[3px] bg-border relative">
                            <div className="absolute left-0 top-0 h-full bg-amber" style={{ width: `${Math.min((deepWorkMinutes / 90) * 100, 100)}%` }}></div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (loading) return <div className="p-6 font-mono text-white">SYNCING TIMETABLE...</div>

    return (
        <div className="flex-1 overflow-y-auto w-full bg-black flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 pb-4 border-b border-border shrink-0">
                <div className="font-mono text-[9px] tracking-[2px] text-text3 mb-2 flex items-center gap-1.5 uppercase">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    TODAY
                </div>
                <div className="font-condensed font-black text-[36px] uppercase tracking-[0.5px] text-white leading-none">
                    FULL<br />SCHEDULE
                </div>
                <div className="font-mono text-[9px] tracking-[2px] text-text3 mt-1.5">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · All Blocks
                </div>
            </div>

            <div className="flex-1 p-6 relative">
                {blocks.map((block, index) => (
                    <BlockRow
                        key={block.id}
                        block={block}
                        index={index}
                    />
                ))}

                {blocks.length === 0 && (
                    <div className="font-mono text-[10px] text-text3">No timetable blocks defined.</div>
                )}
            </div>
        </div>
    )
}
