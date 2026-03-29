import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { useChecklist } from '../../hooks/useChecklist'
import { useLockEngine } from '../../hooks/useLockEngine'
import { useTierGuard } from '../../hooks/useTierGuard'
import { db, getOrCreateDay, incrementActiveDayIfNeeded } from '../../lib/db'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import CheckboxItem from '../ui/CheckboxItem'
import ChecklistCard from '../ui/ChecklistCard'
import DeepWorkTracker from '../ui/DeepWorkTracker'
import ProgressBar from '../ui/ProgressBar'
import ProUpgradeModal from '../ui/ProUpgradeModal'
import UrgeButton from '../ui/UrgeButton'

const CATEGORY_LABELS = {
    physical: { label: 'PHYSICAL', color: 'text-green' },
    grounding: { label: 'GROUNDING', color: 'text-blue-400' },
    target: { label: 'TARGET', color: 'text-amber' }
}

/**
 * @intent Screen 1: Current State view with neurological sequence enforcement
 * @param None
 */
export default function HomeView() {
    const setUrgeActive = useAppStore(state => state.setUrgeActive)
    const currentBlock = useAppStore(state => state.currentBlock)
    const currentBlockId = useAppStore(state => state.currentBlockId)
    const currentStateName = useAppStore(state => state.currentStateName)
    const currentTimeStr = useAppStore(state => state.currentTimeStr)
    const isRewardWindowOpen = useAppStore(state => state.isRewardWindowOpen)
    const uiColor = useAppStore(state => state.uiColor)
    const { canAccessUrgeEngine } = useTierGuard()
    const [showUpgrade, setShowUpgrade] = useState(false)

    const setDeepWorkMinutes = useAppStore(state => state.setDeepWorkMinutes)
    const todayNum = new Date().toISOString().split('T')[0]

    useEffect(() => {
        getOrCreateDay(todayNum).then(day => {
            if (day?.deep_work_minutes) {
                setDeepWorkMinutes(day.deep_work_minutes)
            }
        })
        // Increment active days counter (once per calendar day)
        incrementActiveDayIfNeeded(todayNum)
    }, [todayNum])

    const { items, loading, toggleItem } = useChecklist(todayNum, currentBlockId)
    const hasIncompleteItems = items.some(i => !i.isDone)
    useLockEngine(hasIncompleteItems)

    const dayData = useLiveQuery(() => db.days.get(todayNum), [todayNum])
    const dayMetrics = dayData || { tasks_completed: 0, violations: 0, compliance_score: 100 }

    const profData = useLiveQuery(() => db.profiles.toCollection().first())
    const phaseData = useLiveQuery(() => profData ? db.phases.get(profData.phase_id) : undefined, [profData])

    let dayNumber = 1
    let phaseName = 'Phase 1 • Stability'

    // Use active_days (behavioral counter) not wall-clock date diff
    if (profData) {
        dayNumber = profData.active_days || 1
    }

    if (phaseData) {
        phaseName = phaseData.name.replace('-', '•')
    }

    const itemsDone = items.filter(i => i.isDone).length
    const totalItems = items.length

    // Group items by category for sectioned rendering
    const grouped = items.reduce((acc, item) => {
        const cat = item.category || 'target'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
    }, {})

    return (
        <div className="flex-1 overflow-y-auto w-full bg-black flex flex-col">
            {/* State Bar */}
            <div className={cn("px-6 py-2 flex items-center justify-between shrink-0", uiColor)}>
                <div className="font-condensed font-bold text-[11px] tracking-[3px] uppercase text-white">
                    ⬤ {currentStateName}
                </div>
                <div className="font-mono text-[10px] text-white/70">
                    {currentTimeStr}
                </div>
            </div>

            <div className="p-6 pt-7 flex-1">
                {/* Day Header */}
                <div className="mb-7">
                    <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-1">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="font-condensed font-black text-[52px] leading-[0.9] tracking-[-1px] text-white uppercase">
                        DAY<br />{dayNumber}
                    </div>
                    <div className="font-mono text-[10px] text-text3 mt-2">
                        {phaseName}
                    </div>
                </div>

                {/* Score Strip */}
                <div className="flex gap-2 mb-7">
                    <div className="flex-1 bg-surface border border-border p-3">
                        <div className="font-condensed font-black text-[32px] text-white leading-none">
                            {itemsDone}
                            <span className="text-[18px] text-text3">/{totalItems}</span>
                        </div>
                        <div className="font-mono text-[8px] tracking-[2px] uppercase text-text3 mt-1">
                            Steps Done
                        </div>
                    </div>
                    <div className="flex-1 bg-red-dim border border-red p-3">
                        <div className="font-condensed font-black text-[32px] text-red leading-none">
                            {dayMetrics.violations}
                        </div>
                        <div className="font-mono text-[8px] tracking-[2px] uppercase text-text3 mt-1">
                            Violations
                        </div>
                    </div>
                    <div className="flex-1 bg-surface border border-border p-3">
                        <div className="font-condensed font-black text-[32px] text-white leading-none">
                            {dayMetrics.compliance_score}<span className="text-[14px] text-text3">%</span>
                        </div>
                        <div className="font-mono text-[8px] tracking-[2px] uppercase text-text3 mt-1">
                            Compliance
                        </div>
                    </div>
                </div>

                {/* Active Block Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3">
                        // active state
                    </div>
                    <div className="font-mono text-[8px] px-2 py-[3px] border border-amber text-amber tracking-[1px]">
                        IN PROGRESS
                    </div>
                </div>

                {/* Neurological Checklist */}
                <ChecklistCard title={currentBlock.toUpperCase()} subtitle={`${itemsDone}/${totalItems} done`}>
                    {loading ? (
                        <div className="p-4 font-mono text-[10px] text-text3">Loading checklist...</div>
                    ) : items.length === 0 ? (
                        <div className="p-4 font-mono text-[10px] text-text3">No actionable items right now.</div>
                    ) : (
                        ['physical', 'grounding', 'target'].map(cat => {
                            const catItems = grouped[cat]
                            if (!catItems?.length) return null
                            const catInfo = CATEGORY_LABELS[cat]
                            return (
                                <div key={cat}>
                                    <div className={cn("px-4 pt-3 pb-1 font-mono text-[7px] tracking-[2px] uppercase", catInfo.color)}>
                                        {catInfo.label}
                                    </div>
                                    {catItems.map((item) => (
                                        <CheckboxItem
                                            key={item.id}
                                            label={item.label}
                                            isDone={item.isDone}
                                            isLocked={item.is_locked}
                                            hasTimer={item.has_timer}
                                            timerMinutes={item.time_estimate_mins || 5}
                                            meta={item.is_locked ? <><Lock size={8} className="inline" /> LOCKED</> : (item.has_timer ? `${item.time_estimate_mins || 5}m →` : null)}
                                            highlighted={item.has_timer}
                                            onClick={() => !item.is_locked && toggleItem(item.id, item.isDone)}
                                        />
                                    ))}
                                </div>
                            )
                        })
                    )}
                </ChecklistCard>

                {/* Trackers */}
                <DeepWorkTracker todayNum={todayNum} />

                <ProgressBar
                    label="Social Reward"
                    value={isRewardWindowOpen ? "OPEN — AUTO-LOCKS AT 6:00" : "LOCKED UNTIL RESET ✓"}
                    progress={isRewardWindowOpen ? 100 : 0}
                    color={isRewardWindowOpen ? "amber" : "green"}
                    dimValue={!isRewardWindowOpen}
                    className="mb-4"
                />

                <UrgeButton onClick={() => {
                    if (!canAccessUrgeEngine()) {
                        setShowUpgrade(true)
                        return
                    }
                    setUrgeActive(true)
                }} />
            </div>

            {showUpgrade && <ProUpgradeModal onClose={() => setShowUpgrade(false)} />}
        </div>
    )
}
