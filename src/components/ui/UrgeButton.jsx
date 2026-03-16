import { Activity } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * @intent Big primary red action button for the Urge phase
 * @param {object} props
 * @param {function} props.onClick - Click handler
 */
export default function UrgeButton({ onClick, className }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full bg-transparent border-[1.5px] border-red text-red font-condensed text-base font-bold tracking-[4px] uppercase p-4 cursor-pointer flex items-center justify-center gap-2 mt-2 mb-4 hover:bg-red/10 transition-colors",
                className
            )}
        >
            <Activity size={16} strokeWidth={2} />
            LOG URGE OVERRIDE
        </button>
    )
}
