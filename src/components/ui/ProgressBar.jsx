import { cn } from '../../lib/utils'

/**
 * @intent Progress visualization with tracking line
 * @param {object} props
 * @param {string} props.label - Left label text
 * @param {string} props.value - Right value text
 * @param {number} props.progress - 0-100 percentage
 * @param {'amber' | 'green'} props.color - Bar color
 * @param {boolean} [props.dimValue] - If the value text should be dimmed
 */
export default function ProgressBar({ label, value, progress, color = 'amber', dimValue = false, className }) {
    return (
        <div className={cn("bg-surface border border-border p-[14px] px-4", className)}>
            <div className="flex justify-between mb-2">
                <div className="font-mono text-[9px] tracking-[2px] uppercase text-text3">
                    {label}
                </div>
                <div className={cn("font-mono text-[9px]", dimValue ? "text-text3" : (color === 'amber' ? 'text-amber' : 'text-green'))}>
                    {value}
                </div>
            </div>
            <div className="h-[3px] bg-border relative w-full">
                <div
                    className={cn("absolute left-0 top-0 h-full transition-all duration-300", color === 'amber' ? 'bg-amber' : 'bg-green')}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}
