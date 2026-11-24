import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../lib/db'
import { HABITS, OTHER_HABIT } from '../lib/habits'
import { useAppStore } from '../store/useAppStore'

export function useHabitChoice() {
    const blockId = useAppStore(s => s.currentBlockId)
    const blocks = useLiveQuery(() => db.time_blocks.toArray())
    const [choice, setChoice] = useState(null)
    const [custom, setCustom] = useState('')
    const preferred = blocks?.find(b => b.id === blockId)?.risk_behavior || blocks?.find(b => b.risk_behavior)?.risk_behavior
    const options = [...new Set([preferred, ...HABITS].filter(Boolean).map(v => HABITS.find(h => h.toLowerCase() === v.toLowerCase()) || v))]
    const selected = choice ?? (preferred ? options[0] : '')
    return { options, selected, setChoice, custom, setCustom, habit: selected === OTHER_HABIT ? custom.trim() : selected }
}
