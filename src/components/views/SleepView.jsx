import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '../../store/useAppStore'
import { db } from '../../lib/db'

/**
 * @intent Screen 5: Sleep Mode — dynamic activation time from next scheduled block
 * @param None
 */
export default function SleepView() {
    const currentTimeStr = useAppStore(state => state.currentTimeStr)

    // Fetch the earliest block to compute next activation time dynamically
    const firstBlock = useLiveQuery(() =>
        db.time_blocks.orderBy('start_time').first()
    )

    const activationTime = firstBlock
        ? firstBlock.start_time.substring(0, 5)
        : '--:--'

    // Format to 12h for display
    const formatTime12h = (time24) => {
        if (time24 === '--:--') return time24
        const [h, m] = time24.split(':').map(Number)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
    }

    return (
        <div className="flex-1 w-full bg-black flex flex-col items-center justify-center p-6 relative z-50">
            <div className="font-mono text-[10px] tracking-[4px] uppercase text-text3 mb-3">
                SYSTEM SLEEP
            </div>

            <div className="font-condensed font-black text-[64px] text-[#333] tracking-[2px] leading-none mb-4">
                {currentTimeStr.split(' ')[0]}
            </div>

            <div className="w-[1px] h-12 bg-border mb-4"></div>

            <div className="font-mono text-[9px] text-text3 text-center leading-[1.6]">
                All modules locked.<br />
                Activation at {formatTime12h(activationTime)}.
            </div>
        </div>
    )
}
