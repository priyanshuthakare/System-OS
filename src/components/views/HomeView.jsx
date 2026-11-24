import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useChecklist } from '../../hooks/useChecklist'
import { useLockEngine } from '../../hooks/useLockEngine'
import { db, getOrCreateDay } from '../../lib/db'
import { useAppStore } from '../../store/useAppStore'
import CheckboxItem from '../ui/CheckboxItem'
import DeepWorkTracker from '../ui/DeepWorkTracker'
import ProgressionAnimations from '../ui/ProgressionAnimations'
import UrgeButton from '../ui/UrgeButton'

export default function HomeView() {
    const setUrgeActive = useAppStore(state => state.setUrgeActive)
    const currentBlock = useAppStore(state => state.currentBlock)
    const currentBlockId = useAppStore(state => state.currentBlockId)
    const currentTimeStr = useAppStore(state => state.currentTimeStr)

    const setDeepWorkMinutes = useAppStore(state => state.setDeepWorkMinutes)
    const todayNum = new Date().toISOString().split('T')[0]

    // Restore deep work value from local Dexie
    useEffect(() => {
        getOrCreateDay(todayNum).then(day => {
            setDeepWorkMinutes(day?.deep_work_minutes || 0)
        })
    }, [todayNum])

    const { items, loading, toggleItem } = useChecklist(todayNum, currentBlockId)
    const hasIncompleteItems = items.some(i => !i.isDone)
    useLockEngine(hasIncompleteItems)

    const setTab = useAppStore(state => state.setTab)
    const dates = Array.from({length: 7}, (_, index) => {
        const date = new Date(todayNum + 'T12:00:00Z')
        date.setUTCDate(date.getUTCDate() - 6 + index)
        return date
    })
    const firstDay = dates[0].toISOString().slice(0, 10)
    const history = useLiveQuery(() => db.checklist_completions.where('date')
        .between(firstDay, todayNum, true, true).toArray(), [firstDay, todayNum])
    const done = items.filter(item => item.isDone).length
    const next = items.find(item => !item.isDone && !item.is_locked)
    const [expanded, setExpanded] = useState(false)
    const [error, setError] = useState('')
    const renderItem = item => <CheckboxItem key={todayNum + item.id} {...item}
        isLocked={item.is_locked} hasTimer={item.has_timer} timerMinutes={item.time_estimate_mins || 5}
        meta={item.is_locked ? 'Earlier steps first' : item.has_timer ? (item.time_estimate_mins || 5) + ' min' : ''}
        onClick={async () => {
            setError('')
            try { await toggleItem(item.id, item.isDone) }
            catch { setError('Could not save your step. Please try again.') }
        }} />
    return (
        <div className="flex-1 overflow-y-auto bg-black p-5 space-y-5">
            <header>
                <p className="font-mono text-xs text-text2">Today &middot; {currentTimeStr}</p>
                <h1 className="font-condensed text-4xl font-bold text-white">{currentBlockId ? currentBlock : 'Between routines'}</h1>
            </header>
            <section className="border border-amber bg-surface">
                <div className="p-4 border-b border-border">
                    <h2 className="font-condensed text-xl text-amber">{loading ? 'Loading routine...' : next ? 'Your next step' : items.length ? 'Routine complete' : 'No steps scheduled now'}</h2>
                    {items.length > 0 && <div role="status" className="mt-2 text-text2 text-sm">{done} of {items.length} steps complete
                        <progress className="block w-full h-2 mt-2 accent-amber" value={done} max={items.length} aria-label="Routine progress" />
                    </div>}
                </div>
                {next && renderItem(next)}
                {items.length > 1 && <button className="p-3 text-text2 text-sm underline" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide other steps' : 'View other steps'}</button>}
                {expanded && items.filter(i => i.id !== next?.id).map(renderItem)}
                {!loading && !next && <button className="p-4 text-amber underline" onClick={() => setTab('log')}>View schedule</button>}
                {error && <p role="alert" className="p-3 text-red">{error}</p>}
            </section>
            <section className="border border-border p-4">
                <h2 className="text-white font-condensed text-xl">Last seven days</h2>
                <p className="text-text2 text-sm mb-3">{history ? history.length + (history.length === 1 ? ' step completed' : ' steps completed') : 'Loading activity...'}</p>
                <ol className="grid grid-cols-7 gap-1">{dates.map(date => {
                    const key = date.toISOString().slice(0, 10)
                    const count = history?.filter(row => row.date === key).length
                    return <li key={key} className="text-center">
                        <span className="block text-xs text-text2">{date.toLocaleDateString(undefined, {weekday:'short', timeZone:'UTC'})}</span>
                        <strong className={'block py-2 mt-1 ' + (count ? 'bg-green/20 text-green' : 'bg-surface text-text2')}>{count ?? '-'}</strong>
                    </li>
                })}</ol>
            </section>
            <DeepWorkTracker todayNum={todayNum} />
            <UrgeButton onClick={() => setUrgeActive(true)} />
            <ProgressionAnimations />
        </div>
    )
}
