import { Award, Flame, Shield, Sparkles, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useProgression } from '../../hooks/useProgression'
import { useRank } from '../../hooks/useRank'
import { useTitles } from '../../hooks/useTitles'
import { cn } from '../../lib/utils'
import { useProgressionStore } from '../../store/useProgressionStore'

const RANK_STYLE = {
    'E Rank': 'from-zinc-700 to-zinc-900 border-zinc-500/50 text-zinc-200',
    'D Rank': 'from-slate-700 to-slate-900 border-slate-400/50 text-slate-200',
    'C Rank': 'from-blue-800 to-slate-900 border-blue-400/50 text-blue-100',
    'B Rank': 'from-emerald-800 to-slate-900 border-emerald-400/50 text-emerald-100',
    'A Rank': 'from-amber-800 to-slate-900 border-amber-400/50 text-amber-100',
    'S Rank': 'from-violet-800 to-slate-900 border-violet-400/50 text-violet-100',
    Monarch: 'from-red-800 to-black border-red-400/50 text-red-100'
}

const STAT_LABELS = {
    strength: 'STR',
    focus: 'FOC',
    discipline: 'DIS',
    knowledge: 'KNW',
    resilience: 'RES',
    social: 'SOC'
}

function LevelBadge({ level }) {
    return (
        <div className="w-[68px] h-[68px] rounded-full border border-amber/40 bg-black/70 flex items-center justify-center shrink-0">
            <div className="text-center">
                <div className="font-mono text-[8px] tracking-[1.5px] text-text3 uppercase">LVL</div>
                <div className="font-condensed font-black text-[28px] leading-none text-white">{level}</div>
            </div>
        </div>
    )
}

function XpBar({ progressPercentage, xpIntoCurrentLevel, xpForNextLevel }) {
    return (
        <div className="bg-surface border border-border px-4 py-3">
            <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-[9px] tracking-[2px] uppercase text-text3">XP Progress</div>
                <div className="font-mono text-[9px] text-amber">
                    {xpIntoCurrentLevel}/{xpForNextLevel}
                </div>
            </div>
            <div className="h-[5px] bg-border relative w-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber to-red transition-[width] duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, progressPercentage || 0))}%` }}
                />
            </div>
        </div>
    )
}

function StatBars({ stats }) {
    const entries = Object.entries(stats || {})
        .filter(([key]) => Object.keys(STAT_LABELS).includes(key))

    if (!entries.length) return null

    const maxValue = Math.max(1, ...entries.map(([, value]) => Number(value) || 0))

    return (
        <div className="bg-surface border border-border p-4">
            <div className="font-mono text-[9px] tracking-[2px] uppercase text-text3 mb-3">Core Stats</div>
            <div className="space-y-2">
                {entries.map(([key, value]) => {
                    const numeric = Number(value) || 0
                    const width = Math.max(4, Math.round((numeric / maxValue) * 100))

                    return (
                        <div key={key} className="grid grid-cols-[34px_1fr_42px] items-center gap-2">
                            <div className="font-mono text-[8px] tracking-[1px] text-text3">{STAT_LABELS[key]}</div>
                            <div className="h-[4px] bg-border relative">
                                <div
                                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-violet-500 transition-[width] duration-500"
                                    style={{ width: `${width}%` }}
                                />
                            </div>
                            <div className="font-mono text-[9px] text-right text-white">{numeric.toFixed(1)}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function RankEmblem({ rankLabel, rankScore }) {
    const style = RANK_STYLE[rankLabel] || RANK_STYLE['E Rank']

    return (
        <div className={cn('bg-gradient-to-br border p-4', style)}>
            <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-[9px] tracking-[2px] uppercase opacity-70">Current Rank</div>
                <Shield size={14} />
            </div>
            <div className="font-condensed font-black text-[28px] leading-none uppercase">{rankLabel}</div>
            <div className="font-mono text-[9px] mt-2 opacity-80">Score {Math.round(rankScore || 0)}</div>
        </div>
    )
}

function StreakBadge({ streakDays }) {
    if (!streakDays || streakDays <= 0) return null

    return (
        <div className="bg-surface border border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Flame size={14} className={streakDays >= 7 ? 'text-amber' : 'text-text3'} />
                <div className="font-mono text-[9px] tracking-[2px] uppercase text-text3">Streak</div>
            </div>
            <div className="font-condensed font-black text-[22px] text-white leading-none">
                {streakDays}
                <span className="text-[10px] text-text3 ml-1">days</span>
            </div>
        </div>
    )
}

function TitlesDisplay({ titles }) {
    if (!titles?.length) return null

    return (
        <div className="bg-surface border border-border p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="font-mono text-[9px] tracking-[2px] uppercase text-text3">Titles</div>
                <Award size={14} className="text-violet-400" />
            </div>
            <div className="flex flex-wrap gap-1.5">
                {titles.map(title => (
                    <div
                        key={title.id}
                        className="border border-violet-500/30 bg-violet-900/20 px-2.5 py-1 font-mono text-[8px] tracking-[1px] text-violet-300"
                    >
                        {title.name}
                    </div>
                ))}
            </div>
        </div>
    )
}

function RecentGainFlash() {
    const lastTaskResult = useProgressionStore(s => s.lastTaskResult)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!lastTaskResult?.accepted) return
        setVisible(true)
        const timer = setTimeout(() => setVisible(false), 1600)
        return () => clearTimeout(timer)
    }, [lastTaskResult])

    if (!lastTaskResult?.accepted) return null

    return (
        <div className={cn(
            'mt-2 border px-3 py-2 flex items-center gap-2 transition-all duration-300',
            visible ? 'opacity-100 border-amber/50 bg-amber/10' : 'opacity-0 border-transparent'
        )}>
            <Sparkles size={12} className="text-amber" />
            <div className="font-mono text-[9px] text-amber tracking-[1px] uppercase">
                +{lastTaskResult.xpAwarded} XP
            </div>
            {lastTaskResult.leveledUp ? (
                <div className="ml-auto font-mono text-[8px] text-green tracking-[1px] uppercase flex items-center gap-1">
                    <TrendingUp size={10} />
                    Level Up
                </div>
            ) : null}
        </div>
    )
}

export default function ProgressionPanel() {
    const { progression, loading } = useProgression()
    const { rank } = useRank()
    const { titles } = useTitles()
    if (loading || !progression?.user || !progression?.levelProgress) return null

    return (
        <div className="mb-7">
            <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-2">
                // progression
            </div>

            <div className="bg-black border border-border p-4 space-y-3">
                <div className="flex gap-3">
                    <LevelBadge level={progression.user.level || progression.levelProgress.currentLevel} />
                    <div className="flex-1 min-w-0 space-y-2">
                        <XpBar
                            progressPercentage={progression.levelProgress.progressPercentage}
                            xpIntoCurrentLevel={progression.levelProgress.xpIntoCurrentLevel}
                            xpForNextLevel={progression.levelProgress.xpForNextLevel}
                        />
                        <RecentGainFlash />
                    </div>
                </div>

                <StatBars stats={progression.stats} />
                <StreakBadge streakDays={progression.user.streak_days} />
                <TitlesDisplay titles={titles} />
                <RankEmblem
                    rankLabel={rank?.storedRank || rank?.currentRank || progression.user.current_rank || 'E Rank'}
                    rankScore={rank?.storedRankScore ?? rank?.rankScore ?? progression.user.rank_score ?? 0}
                />
            </div>
        </div>
    )
}
