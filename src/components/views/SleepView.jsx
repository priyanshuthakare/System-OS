import { useAppStore } from '../../store/useAppStore'

/**
 * @intent Screen 5: Sleep Mode. Static screen masking everything.
 * @param None
 */
export default function SleepView() {
    const currentTimeStr = useAppStore(state => state.currentTimeStr)

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
                Activation at 08:15.
            </div>
        </div>
    )
}
