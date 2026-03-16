import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '../../store/useAppStore'
import { db } from '../../lib/db'

/**
 * @intent Invisible component that computes global application logic state every minute.
 * @param None
 */
export default function TimeEngine() {
    const setTimeState = useAppStore(state => state.setTimeState)
    const timeBlocks = useLiveQuery(() => db.time_blocks.orderBy('sort_order').toArray())
    const [tick, setTick] = useState(0)

    // Tick every minute to force recalculation
    useEffect(() => {
        const now = new Date()
        const delayToNextMinute = (60 - now.getSeconds()) * 1000

        let interval
        const timeout = setTimeout(() => {
            setTick(t => t + 1)
            interval = setInterval(() => setTick(t => t + 1), 60000)
        }, delayToNextMinute)

        return () => {
            clearTimeout(timeout)
            if (interval) clearInterval(interval)
        }
    }, [])

    // Recompute state when timeBlocks arrive or minute ticks
    useEffect(() => {
        if (!timeBlocks || timeBlocks.length === 0) return

        const now = new Date()
        const hours = now.getHours()
        const minutes = now.getMinutes()

        // Format time string
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const formattedHours = hours % 12 || 12
        const formattedMinutes = minutes.toString().padStart(2, '0')
        const currentTimeStr = `${formattedHours}:${formattedMinutes} ${ampm}`

        // Total minutes from midnight
        const timeVal = hours * 60 + minutes

        let currentStateName = 'UNKNOWN'
        let currentBlock = 'Unknown API'
        let currentBlockId = null
        let isSleepMode = false
        let isRewardWindowOpen = false
        let uiColor = 'bg-surface'

        for (const block of timeBlocks) {
            const [startH, startM] = block.start_time.split(':').map(Number)
            const [endH, endM] = block.end_time.split(':').map(Number)
            
            const startVal = startH * 60 + startM
            const endVal = endH * 60 + endM

            const isOvernight = startVal > endVal
            const isActive = isOvernight
                ? (timeVal >= startVal || timeVal < endVal)
                : (timeVal >= startVal && timeVal < endVal)

            if (isActive) {
                currentStateName = block.name.toUpperCase()
                currentBlock = block.name
                currentBlockId = block.id
                isSleepMode = !!block.is_sleep
                uiColor = block.ui_color || 'bg-surface'
                
                // Hardcoded reward window for now as per specific app logic
                if (block.name.toLowerCase().includes('reward')) {
                    isRewardWindowOpen = true
                }
                break
            }
        }

        setTimeState({
            currentTimeStr,
            currentStateName,
            currentBlock,
            currentBlockId,
            isSleepMode,
            isRewardWindowOpen,
            uiColor
        })
    }, [timeBlocks, tick, setTimeState])

    return null
}
