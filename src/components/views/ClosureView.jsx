import { useState, useEffect, useRef, useCallback } from 'react'
import { Moon, Send, Brain, Clock } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { useStatsData } from '../../hooks/useStatsData'
import { useAdaptiveAI } from '../../hooks/useAdaptiveAI'
import { useClosureData } from '../../hooks/useClosureData'
import { useTierGuard } from '../../hooks/useTierGuard'
import { db } from '../../lib/db'
import { cn } from '../../lib/utils'

/**
 * @intent Daily Closure / Night Review screen — execution %, violations, recovery, reflection, weekly pattern, phase progress, AI diagnostic
 * @param None
 */
export default function ClosureView() {
    const user = useAuthStore(s => s.user)
    const userId = user?.id
    const [dayData, setDayData] = useState(null)
    const [totalStates, setTotalStates] = useState(0)
    const [reflection, setReflection] = useState('')
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)
    const hasFetched = useRef(false)

    const today = new Date().toISOString().split('T')[0]

    const loadDayData = useCallback(async () => {
        if (!userId) return

        // 1. Offline-first: serve local Dexie data immediately
        let localDay = null
        let localBlockCount = 0
        try {
            localDay = await db.days.get(today)
            localBlockCount = await db.time_blocks.count()
        } catch (e) {
            console.warn('[ClosureView] Local DB read failed:', e)
        }

        if (localDay) {
            setDayData({
                states_executed: localDay.tasks_completed || 0,
                structural_violations: localDay.violations || 0,
                recovery_count: localDay.recovery_count || 0,
                deep_work_minutes: localDay.deep_work_minutes || 0
            })
            setTotalStates(localBlockCount || 1)
            if (localDay.daily_reflection) {
                setReflection(localDay.daily_reflection)
                setSaved(true)
            }
            setLoading(false)
        }

        // 2. Background refresh from Supabase (updates UI silently when online)
        try {
            const { data: day, error: dayErr } = await supabase
                .from('days')
                .select('*')
                .eq('user_id', userId)
                .eq('date', today)
                .maybeSingle()

            if (dayErr) throw dayErr

            const { count, error: countErr } = await supabase
                .from('states')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)

            if (countErr) console.warn('[ClosureView] State count issue:', countErr)

            setDayData(day || { states_executed: 0, structural_violations: 0, recovery_count: 0, deep_work_minutes: 0 })
            setTotalStates(count || localBlockCount || 1)

            if (day?.daily_reflection) {
                setReflection(day.daily_reflection)
                setSaved(true)
            }

            // Cache Supabase data to local Dexie for next offline load
            if (day) {
                await db.days.put({
                    date: today,
                    tasks_completed: localDay?.tasks_completed ?? (day.states_executed || 0),
                    violations: localDay?.violations ?? (day.structural_violations || 0),
                    deep_work_minutes: day.deep_work_minutes || localDay?.deep_work_minutes || 0,
                    compliance_score: localDay?.compliance_score || 0,
                    recovery_count: day.recovery_count || 0,
                    daily_reflection: day.daily_reflection || null
                })
            }
        } catch (e) {
            if (!localDay) {
                // No local data and Supabase unreachable — show empty defaults
                setDayData({ states_executed: 0, structural_violations: 0, recovery_count: 0, deep_work_minutes: 0 })
                setTotalStates(localBlockCount || 1)
            }
            console.warn('[ClosureView] Supabase fetch failed (offline?):', e.message || e)
        } finally {
            setLoading(false)
        }
    }, [userId, today])

    useEffect(() => {
        // Guard: only fire once per mount, not on every re-render
        if (!userId || hasFetched.current) {
            if (!userId) setLoading(false)
            return
        }
        hasFetched.current = true
        loadDayData()
    }, [userId, loadDayData])

    // Reset when user logs out
    useEffect(() => {
        if (!userId) {
            hasFetched.current = false
            setDayData(null)
            setLoading(false)
        }
    }, [userId])


    const saveReflection = async () => {
        if (!user || !reflection.trim()) return

        // 1. Persist to local Dexie immediately (works offline)
        try {
            const existingLocal = await db.days.get(today)
            if (existingLocal) {
                await db.days.update(today, { daily_reflection: reflection.trim() })
            } else {
                await db.days.put({
                    date: today,
                    tasks_completed: 0,
                    violations: 0,
                    deep_work_minutes: 0,
                    compliance_score: 0,
                    recovery_count: 0,
                    daily_reflection: reflection.trim()
                })
            }
            setSaved(true)
        } catch (e) {
            console.warn('[ClosureView] Local reflection save failed:', e)
        }

        // 2. Sync to Supabase in background
        try {
            const { data: existing } = await supabase
                .from('days')
                .select('id')
                .eq('user_id', user.id)
                .eq('date', today)
                .single()

            if (existing) {
                await supabase.from('days')
                    .update({ daily_reflection: reflection.trim() })
                    .eq('id', existing.id)
            } else {
                await supabase.from('days').insert({
                    user_id: user.id,
                    date: today,
                    daily_reflection: reflection.trim()
                })
            }
        } catch (e) {
            console.warn('[ClosureView] Supabase reflection sync failed (offline?):', e.message || e)
        }
    }

    if (loading) {
        return <div className="p-6 font-mono text-[10px] text-text3">LOADING CLOSURE DATA...</div>
    }

    const executionPct = totalStates > 0
        ? Math.round((dayData.states_executed / totalStates) * 100)
        : 0

    return (
        <div className="flex-1 overflow-y-auto w-full flex flex-col pt-10 px-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <Moon size={20} className="text-blue-400" />
                <h1 className="font-condensed font-black text-[36px] leading-none tracking-[-1px] text-white uppercase">
                    Closure
                </h1>
            </div>
            <div className="font-mono text-[9px] text-text3 tracking-[2px] uppercase mb-8">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>

            {/* Today's Scoreboard */}
            <div className="bg-surface border border-border p-5 mb-6 text-center">
                <div className="font-condensed font-black text-[72px] text-white leading-none tracking-[-2px]">
                    {dayData.states_executed}<span className="text-[36px] text-text3">/{totalStates}</span>
                </div>
                <div className="font-mono text-[10px] tracking-[2px] text-text3 mt-2 uppercase">
                    Responsibilities Executed
                </div>
                <div className="w-3/5 h-[3px] bg-border mx-auto mt-4 relative">
                    <div
                        className="absolute left-0 top-0 h-full bg-green transition-all"
                        style={{ width: `${executionPct}%` }}
                    />
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                <MetricCard label="Execution" value={`${executionPct}%`} color="text-green" />
                <MetricCard label="Violations" value={dayData.structural_violations} color="text-red" />
                <MetricCard label="Recoveries" value={dayData.recovery_count} color="text-amber" />
                <MetricCard label="Deep Work" value={`${dayData.deep_work_minutes || 0}m`} color="text-white" />
            </div>

            {/* Reflection */}
            <div className="mb-6">
                <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2">
                    Structural Reflection
                </div>
                <p className="font-mono text-[9px] text-text3 tracking-[1px] mb-3">
                    ONE LINE ONLY — What failed structurally?
                </p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="e.g. No buffer between work and scroll..."
                        value={reflection}
                        onChange={(e) => { setReflection(e.target.value); setSaved(false) }}
                        maxLength={200}
                        className="flex-1 bg-surface border border-border p-3 font-body text-sm text-white placeholder-text3 outline-none focus:border-amber transition-colors"
                    />
                    <button
                        onClick={saveReflection}
                        disabled={saved || !reflection.trim()}
                        className={cn(
                            "px-4 border transition-colors",
                            saved ? "border-green text-green" : "border-border text-white hover:bg-surface2"
                        )}
                    >
                        <Send size={14} />
                    </button>
                </div>
                {saved && (
                    <div className="font-mono text-[9px] text-green mt-2 tracking-[1px]">✓ SAVED</div>
                )}
            </div>

            {/* Past Reflections */}
            <PastReflectionsSection />

            {/* Weekly Pattern Analytics */}
            <WeeklyPatternSection />

            {/* Phase Progress */}
            <PhaseProgressSection />

            {/* Adaptive AI Diagnostic */}
            <AIDiagnosticSection />
        </div>
    )
}

function MetricCard({ label, value, color }) {
    return (
        <div className="bg-surface border border-border p-4">
            <div className={cn("font-condensed font-black text-[36px] leading-none", color)}>
                {value}
            </div>
            <div className="font-mono text-[8px] tracking-[2px] uppercase text-text3 mt-1">
                {label}
            </div>
        </div>
    )
}

/**
 * @intent Shows past 7 reflections for feedback loop — user sees their own pattern
 */
function PastReflectionsSection() {
    const { reflections, loading } = useClosureData()

    if (loading || reflections.length === 0) return null

    return (
        <div className="mb-8">
            <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
                <Clock size={14} className="text-text3" />
                Past Reflections
            </div>
            <div className="flex flex-col gap-2">
                {reflections.map((r) => (
                    <div key={r.date} className="bg-surface border border-border p-3 flex gap-3 items-start">
                        <div className="font-mono text-[8px] text-text3 tracking-[1px] uppercase shrink-0 pt-0.5 w-10">
                            {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="font-body text-[13px] text-text2 leading-relaxed">
                            {r.text}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * @intent Weekly Pattern section — 7-day bar chart + summary stats
 */
function WeeklyPatternSection() {
    const { weekData, avgCompliance, totalViolations, maxTasks, deepWorkHoursWeek } = useStatsData()

    if (!weekData || weekData.length === 0) return null

    return (
        <div className="mb-8">
            <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2">
                Weekly Pattern
            </div>

            {/* 7-day bar chart */}
            <div className="flex items-end gap-2 h-[100px] mb-4">
                {weekData.map((day) => {
                    const barHeight = maxTasks > 0 ? (day.tasksCompleted / maxTasks) * 100 : 0
                    const isToday = day.date === new Date().toISOString().split('T')[0]
                    return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                                <div
                                    className={cn(
                                        "w-full transition-all",
                                        isToday ? 'bg-amber' : barHeight > 0 ? 'bg-green/60' : 'bg-border'
                                    )}
                                    style={{ height: `${Math.max(barHeight, 4)}%`, minHeight: '3px' }}
                                />
                            </div>
                            <span className={cn(
                                "font-mono text-[8px] tracking-[0.5px] uppercase",
                                isToday ? 'text-amber' : 'text-text3'
                            )}>
                                {day.dayLabel}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface border border-border p-3">
                    <div className="font-condensed font-bold text-[24px] text-white leading-none">
                        {avgCompliance}%
                    </div>
                    <div className="font-mono text-[8px] tracking-[2px] uppercase text-text3 mt-1">
                        Avg Compliance
                    </div>
                </div>
                <div className="bg-surface border border-border p-3">
                    <div className="font-condensed font-bold text-[24px] text-red leading-none">
                        {totalViolations}
                    </div>
                    <div className="font-mono text-[8px] tracking-[2px] uppercase text-text3 mt-1">
                        Week Violations
                    </div>
                </div>
                <div className="bg-surface border border-border p-3">
                    <div className="font-condensed font-bold text-[24px] text-amber leading-none">
                        {deepWorkHoursWeek}h
                    </div>
                    <div className="font-mono text-[8px] tracking-[2px] uppercase text-text3 mt-1">
                        Deep Work
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * @intent Phase progress bar — shows current phase advancement and gate condition
 */
function PhaseProgressSection() {
    const profData = useLiveQuery(() => db.profiles.toCollection().first())
    const phaseData = useLiveQuery(() => profData ? db.phases.get(profData.phase_id) : undefined, [profData])
    const { avgCompliance } = useStatsData()

    if (!profData || !phaseData) return null

    const startObj = new Date(profData.start_date)
    const todayObj = new Date()
    const diffDays = Math.ceil(Math.abs(todayObj - startObj) / (1000 * 60 * 60 * 24)) + 1
    const requiredDays = phaseData.required_days || 30
    const progressPct = Math.min((diffDays / requiredDays) * 100, 100)

    return (
        <div className="mb-8">
            <div className="bg-surface border border-border p-4">
                <div className="flex justify-between items-baseline mb-3">
                    <div className="font-condensed font-bold text-[20px] text-white uppercase tracking-[1px]">
                        {phaseData.name?.replace('-', '—') || 'Phase 1'}
                    </div>
                    <div className="font-mono text-[10px] text-amber">
                        Day {diffDays} / {requiredDays}
                    </div>
                </div>
                <div className="h-1 bg-border relative mb-2">
                    <div
                        className="absolute left-0 top-0 h-full bg-amber transition-all"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <div className="font-mono text-[9px] text-text3 tracking-[0.5px]">
                    Next phase unlocks at {phaseData.required_compliance_pct}% compliance · You're at {avgCompliance}%
                </div>
            </div>
        </div>
    )
}

/**
 * @intent Adaptive AI section — runs Gemini diagnostic on user behavioral data (Pro only)
 */
function AIDiagnosticSection() {
    const { suggestion, loading, error, statusMsg, diagnose } = useAdaptiveAI()
    const { canAccessAI } = useTierGuard()

    // Load persisted suggestion on mount
    const lastSuggestion = useLiveQuery(() => db.user_preferences.get('last_ai_suggestion'))
    const persistedSuggestion = lastSuggestion ? JSON.parse(lastSuggestion.value) : null
    const displaySuggestion = suggestion || persistedSuggestion?.text

    if (!canAccessAI()) return null

    return (
        <div className="mb-8">
            <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
                <Brain size={14} className="text-purple-400" />
                System Diagnostic
            </div>

            {!displaySuggestion && !loading && !statusMsg && (
                <button
                    onClick={diagnose}
                    className="w-full bg-surface border border-border p-4 text-center hover:bg-surface2 transition-colors"
                >
                    <span className="font-mono text-[10px] tracking-[2px] uppercase text-text2">
                        RUN AI DIAGNOSTIC
                    </span>
                    <div className="font-mono text-[8px] text-text3 mt-1">
                        Analyzes your behavioral pattern for structural failures
                    </div>
                </button>
            )}

            {loading && (
                <div className="bg-surface border border-border p-4">
                    <div className="font-mono text-[10px] text-text3 tracking-[1px] animate-pulse">
                        ANALYZING FAILURE PATTERN...
                    </div>
                </div>
            )}

            {statusMsg && !displaySuggestion && (
                <div className="bg-surface border border-border p-4">
                    <div className="font-mono text-[10px] text-text3 tracking-[1px]">
                        {statusMsg}
                    </div>
                </div>
            )}

            {displaySuggestion && (
                <div className="bg-purple-500/5 border border-purple-500/30 p-4">
                    <div className="font-mono text-[9px] text-purple-400 tracking-[2px] uppercase mb-2">
                        STRUCTURAL RECOMMENDATION
                    </div>
                    <div className="font-body text-[14px] text-white leading-relaxed">
                        {displaySuggestion}
                    </div>
                    {persistedSuggestion?.timestamp && !suggestion && (
                        <div className="font-mono text-[8px] text-text3 mt-3">
                            Generated {new Date(persistedSuggestion.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                    <button
                        onClick={diagnose}
                        className="mt-3 font-mono text-[9px] text-text3 tracking-[1px] hover:text-white transition-colors"
                    >
                        ↻ RE-RUN DIAGNOSTIC
                    </button>
                </div>
            )}

            {error && (
                <div className="font-mono text-[9px] text-red mt-2">{error}</div>
            )}
        </div>
    )
}
