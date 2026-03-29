import { cn } from '../../lib/utils'

const LEVEL_COLORS = [
    'bg-[#161b22]',  // Level 0: empty (dark gray)
    'bg-[#0e4429]',  // Level 1: low
    'bg-[#006d32]',  // Level 2: medium
    'bg-[#26a641]',  // Level 3: good
    'bg-[#39d353]',  // Level 4: max
]

/**
 * @intent GitHub/LeetCode-style activity contribution grid
 * @param {{ days: Array, totalActive: number, currentStreak: number }} props
 */
export default function HeatmapGrid({ days, totalActive, currentStreak }) {
    if (!days || days.length === 0) return null

    // Organize into weeks (columns) — each column = 7 days (Sun-Sat)
    // Pad the start so the first column starts on Sunday
    const firstDayOfWeek = days[0]?.dayOfWeek || 0
    const paddedDays = [
        ...Array(firstDayOfWeek).fill(null),
        ...days
    ]

    const weeks = []
    for (let i = 0; i < paddedDays.length; i += 7) {
        weeks.push(paddedDays.slice(i, i + 7))
    }

    // Pad last week to 7 if needed
    const lastWeek = weeks[weeks.length - 1]
    while (lastWeek.length < 7) lastWeek.push(null)

    const dayLabels = ['', 'M', '', 'W', '', 'F', '']

    return (
        <div className="mb-8">
            <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2">
                EXECUTION HISTORY
            </div>

            {/* Grid */}
            <div className="flex gap-[3px] overflow-x-auto pb-2">
                {/* Day labels */}
                <div className="flex flex-col gap-[3px] mr-1 shrink-0">
                    {dayLabels.map((label, i) => (
                        <div key={i} className="w-3 h-3 flex items-center justify-center">
                            <span className="font-mono text-[7px] text-text3">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Week columns */}
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                        {week.map((day, di) => (
                            <div
                                key={`${wi}-${di}`}
                                className={cn(
                                    "w-3 h-3 rounded-[2px] transition-colors",
                                    day ? LEVEL_COLORS[day.level] : 'bg-transparent'
                                )}
                                title={day ? `${day.date}: ${day.completed} states` : ''}
                            />
                        ))}
                    </div>
                ))}
            </div>

            {/* Legend + Stats */}
            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[8px] text-text3">Less</span>
                    {LEVEL_COLORS.map((color, i) => (
                        <div key={i} className={cn("w-[10px] h-[10px] rounded-[2px]", color)} />
                    ))}
                    <span className="font-mono text-[8px] text-text3">More</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="font-condensed font-bold text-[14px] text-green">{currentStreak}</span>
                        <span className="font-mono text-[8px] text-text3 ml-1">streak</span>
                    </div>
                    <div className="text-right">
                        <span className="font-condensed font-bold text-[14px] text-white">{totalActive}</span>
                        <span className="font-mono text-[8px] text-text3 ml-1">active</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
