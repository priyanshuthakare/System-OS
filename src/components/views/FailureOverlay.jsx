import ChoiceField from '../ui/ChoiceField'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { syncDailyProgress } from '../../lib/utils'
import { db, getOrCreateDay } from '../../lib/db'
import { resetActions } from '../../lib/habits'
import { useHabitChoice } from '../../hooks/useHabitChoice'
import { useAppStore } from '../../store/useAppStore'
import HabitPicker from '../ui/HabitPicker'

export default function FailureOverlay() {
    const close = useAppStore(s => s.setFailureActive)
    const block = useAppStore(s => s.currentBlockId)
    const choice = useHabitChoice()
    const rules = useLiveQuery(() => db.rules.toArray()) || []
    const [ruleId, setRuleId] = useState('')
    const [note, setNote] = useState('')
    const [action, setAction] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const actions = resetActions(choice.habit)
    const selectedAction = actions.includes(action) ? action : actions[0]

    async function save() {
        setBusy(true)
        const now = new Date()
        try {
            const date = now.toISOString().slice(0,10)
            const time = now.toTimeString().slice(0,8)
            const rule = rules.find(r => String(r.id) === ruleId)
            await db.transaction('rw', db.failure_events, db.rule_violations, db.days, async () => {
                await db.failure_events.add({date, time, state_id: block, rule_broken_id: rule?.id ?? 'None',
                    habit: choice.habit || null, trigger_note: note.trim(), action_taken: selectedAction})
                if (rule) {
                    await db.rule_violations.add({rule_id:rule.id, date, time})
                    const day = await getOrCreateDay(date)
                    await db.days.update(date, {violations: (day.violations || 0) + 1})
                }
            })
            if (rule) await syncDailyProgress(date)
            close(false)
        } catch { setError('Could not save this check-in. Please try again.') }
        finally { setBusy(false) }
    }

    return <section className="absolute inset-0 z-[100] overflow-y-auto bg-black p-6 space-y-5" role="dialog" aria-label="Setback check-in">
        <button className="text-text2 underline" disabled={busy} onClick={()=>close(false)}>Close</button>
        <h1 className="font-condensed text-4xl text-white">After a setback</h1>
        <p className="text-text2">Take a moment to notice what happened and choose your next step.</p>
        <HabitPicker choice={choice} disabled={busy}/>
        <label className="block">What was happening? (optional)
            <textarea className="mt-1 w-full border border-border bg-surface p-3" maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/>
        </label>
        {rules.length > 0 && <ChoiceField label="Related rule (optional)" value={ruleId} disabled={busy}
            options={[{value:'', label:'None'}, ...rules.map(r => ({value:String(r.id), label:r.title}))]}
            onChange={setRuleId} />}
        <ChoiceField label="One thing to try next" value={selectedAction} disabled={busy}
            options={actions.map(text => ({value:text, label:text}))} onChange={setAction}/>
        <button className="p-3 bg-amber text-black" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save check-in'}</button>
        <p role="status">{error}</p>
    </section>
}
