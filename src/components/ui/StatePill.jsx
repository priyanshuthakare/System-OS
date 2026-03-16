import { cn } from '../../lib/utils'

/**
 * @intent Badges for state display
 * @param {object} props
 * @param {'red' | 'amber' | 'green' | 'dim'} props.color - Pill color configuration
 * @param {string} props.children - Text content
 */
export default function StatePill({ color = 'dim', children }) {
    const colorMap = {
        red: 'text-red border-red',
        amber: 'text-amber border-amber',
        green: 'text-green border-green',
        dim: 'text-text3 border-text3',
    }

    return (
        <div className={cn(
            "inline-block font-mono text-[8px] tracking-[2px] uppercase px-[10px] py-1 border mb-[14px]",
            colorMap[color]
        )}>
            {children}
        </div>
    )
}
