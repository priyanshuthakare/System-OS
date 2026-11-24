import { Flame, Play, Skull, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { useBossChallenges } from '../../hooks/useBossChallenges'
import { cn } from '../../lib/utils'

function ProgressBar({ current, target }) {
    const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)))
    return (
        <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
                <div className="font-mono text-[8px] tracking-[1px] text-text3 uppercase">
                    Progress
                </div>
                <div className="font-mono text-[9px] text-white">
                    {current} / {target} days
                </div>
            </div>
            <div className="h-[4px] bg-border relative w-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber to-red transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

function AttemptBadge({ status }) {
    if (status === 'completed') {
        return (
            <div className="flex items-center gap-1 font-mono text-[8px] tracking-[1px] uppercase text-green">
                <Trophy size={10} /> Conquered
            </div>
        )
    }
    if (status === 'in_progress') {
        return (
            <div className="flex items-center gap-1 font-mono text-[8px] tracking-[1px] uppercase text-amber">
                <Flame size={10} /> Active
            </div>
        )
    }
    if (status === 'failed' || status === 'abandoned') {
        return (
            <div className="flex items-center gap-1 font-mono text-[8px] tracking-[1px] uppercase text-red">
                <Skull size={10} /> {status === 'abandoned' ? 'Abandoned' : 'Failed'}
            </div>
        )
    }
    return null
}

export default function BossChallengePanel() {
    const {
        activeChallenges,
        attempts,
        activeAttempt,
        activeProgress,
        hasActiveChallenge,
        loading,
        startChallenge,
        abandonChallenge
    } = useBossChallenges()

    const [starting, setStarting] = useState(null)
    const [abandoning, setAbandoning] = useState(false)

    if (loading || !activeChallenges.length) return null

    const attemptsByBoss = new Map()
    for (const attempt of attempts) {
        const list = attemptsByBoss.get(attempt.boss_id) || []
        list.push(attempt)
        attemptsByBoss.set(attempt.boss_id, list)
    }

    const handleStart = async (bossId) => {
        setStarting(bossId)
        try {
            await startChallenge({ bossId })
        } catch (err) {
            console.warn('[BossChallenge] Start failed:', err?.message || err)
        } finally {
            setStarting(null)
        }
    }

    const handleAbandon = async () => {
        if (!activeAttempt) return
        setAbandoning(true)
        try {
            await abandonChallenge({ attemptId: activeAttempt.id })
        } catch (err) {
            console.warn('[BossChallenge] Abandon failed:', err?.message || err)
        } finally {
            setAbandoning(false)
        }
    }

    return (
        <div className="mb-7">
            <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-2">
                // boss challenges
            </div>

            <div className="space-y-2">
                {activeChallenges.map(boss => {
                    const bossAttempts = attemptsByBoss.get(boss.id) || []
                    const isThisActive = activeAttempt?.boss_id === boss.id
                    const hasCompleted = bossAttempts.some(a => a.status === 'completed')
                    const latestAttempt = bossAttempts[0] || null
                    const canAccept = !hasActiveChallenge && !hasCompleted

                    return (
                        <div
                            key={boss.id}
                            className={cn(
                                'bg-surface border p-4',
                                hasCompleted ? 'border-green/30' :
                                    isThisActive ? 'border-amber/30' : 'border-border'
                            )}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <div className="font-condensed font-bold text-[14px] text-white leading-tight">
                                        {boss.name}
                                    </div>
                                    <div className="font-mono text-[8px] text-text3 mt-1 leading-relaxed">
                                        {boss.description}
                                    </div>
                                </div>
                                {latestAttempt && <AttemptBadge status={latestAttempt.status} />}
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <div className="font-mono text-[8px] text-amber tracking-[1px]">
                                    +{boss.reward_xp} XP
                                </div>
                                <div className="font-mono text-[8px] text-blue-400 tracking-[1px]">
                                    +{boss.reward_rank_boost} RANK
                                </div>
                                {boss.reward_title && (
                                    <div className="font-mono text-[8px] text-violet-400 tracking-[1px]">
                                        &ldquo;{boss.reward_title}&rdquo;
                                    </div>
                                )}
                                <div className="font-mono text-[8px] text-text3 tracking-[1px]">
                                    {boss.duration_days}d
                                </div>
                            </div>

                            {isThisActive && activeProgress && (
                                <ProgressBar
                                    current={activeProgress.consecutiveDays}
                                    target={activeProgress.target}
                                />
                            )}

                            {isThisActive && (
                                <button
                                    onClick={handleAbandon}
                                    disabled={abandoning}
                                    className="mt-3 w-full border border-red/30 bg-black hover:bg-red/10 text-red/70 hover:text-red font-mono text-[8px] tracking-[2px] uppercase py-1.5 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    <X size={10} />
                                    {abandoning ? 'Abandoning...' : 'Abandon Challenge'}
                                </button>
                            )}

                            {canAccept && (
                                <button
                                    onClick={() => handleStart(boss.id)}
                                    disabled={starting === boss.id}
                                    className="mt-3 w-full border border-red/40 bg-red/10 hover:bg-red/20 text-red font-mono text-[9px] tracking-[2px] uppercase py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Play size={10} />
                                    {starting === boss.id ? 'Starting...' : 'Accept Challenge'}
                                </button>
                            )}

                            {hasActiveChallenge && !isThisActive && !hasCompleted && (
                                <div className="mt-3 font-mono text-[8px] text-text3 tracking-[1px] text-center py-1.5 border border-border/50 bg-black/30">
                                    Complete active challenge first
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
