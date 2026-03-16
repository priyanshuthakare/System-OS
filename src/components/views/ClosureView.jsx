import { useState, useEffect } from 'react'
import { Moon, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/utils'

/**
 * @intent Daily Closure / Night Review screen (System 5) — execution %, violations, recovery, 1-line reflection
 * @param None
 */
export default function ClosureView() {
    const user = useAuthStore(s => s.user)
    const [dayData, setDayData] = useState(null)
    const [totalStates, setTotalStates] = useState(0)
    const [reflection, setReflection] = useState('')
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)

    const today = new Date().toISOString().split('T')[0]

    useEffect(() => {
        if (!user) return
        loadDayData()
    }, [user])

    const loadDayData = async () => {
        try {
            // Get today's metrics
            const { data: day } = await supabase
                .from('days')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)
                .single()

            // Get total user states for execution %
            const { count } = await supabase
                .from('states')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)

            setDayData(day || { states_executed: 0, structural_violations: 0, recovery_count: 0, deep_work_minutes: 0 })
            setTotalStates(count || 1)
            if (day?.daily_reflection) {
                setReflection(day.daily_reflection)
                setSaved(true)
            }
        } catch (e) {
            console.error('Failed to load day data:', e)
        } finally {
            setLoading(false)
        }
    }

    const saveReflection = async () => {
        if (!user || !reflection.trim()) return

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
            setSaved(true)
        } catch (e) {
            console.error('Failed to save reflection:', e)
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

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                <MetricCard label="Execution" value={`${executionPct}%`} color="text-green" />
                <MetricCard label="States Done" value={dayData.states_executed} color="text-white" />
                <MetricCard label="Violations" value={dayData.structural_violations} color="text-red" />
                <MetricCard label="Recoveries" value={dayData.recovery_count} color="text-amber" />
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
