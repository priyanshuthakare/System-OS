import { useLiveQuery } from 'dexie-react-hooks'
import { LogOut } from 'lucide-react'
import { useProfileLog } from '../../hooks/useProfileLog'
import { db } from '../../lib/db'
import { useAppStore } from '../../store/useAppStore'
import { useAuthStore } from '../../store/useAuthStore'

/**
 * @intent Screen 4: Profile & Identity Log (View of execution counts)
 * @param None
 */
export default function ProfileView() {
    const setFailureActive = useAppStore(state => state.setFailureActive)
    const signOut = useAuthStore(state => state.signOut)
    const { profile, identityLog, loading } = useProfileLog()

    // Dynamic Phase Calculation
    const phaseData = useLiveQuery(() => profile ? db.phases.get(profile.phase_id) : undefined, [profile])
    const phaseName = phaseData ? phaseData.name.replace('-', '•') : 'Phase 1 • Stability'

    if (loading) return <div className="p-6 font-mono text-white">LOADING IDENTITY DATA...</div>

    return (
        <div className="flex-1 overflow-y-auto w-full flex flex-col pt-10 px-6 pb-20">
            <div className="font-condensed font-black text-[36px] uppercase tracking-[0.5px] text-white leading-none mb-1">
                PROFILE
            </div>
            <div className="font-mono text-[9px] text-text3 mb-8 tracking-[1px] uppercase">
                {phaseName}
            </div>

            {/* Identity Log */}
            <div className="mb-8">
                <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2">
                    IDENTITY LOG (LAST 14 DAYS)
                </div>

                {identityLog.length === 0 ? (
                    <div className="font-mono text-[10px] text-text3">No days logged yet.</div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {identityLog.map((day) => (
                            <div key={day.date} className="flex justify-between items-center bg-surface border border-border px-4 py-3">
                                <span className="font-mono text-[10px] text-text2 tracking-[1px] uppercase">
                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                <span className="font-condensed font-bold text-[14px] text-white">
                                    {day.tasks_completed} <span className="text-text3">/ 5 EXECUTED</span>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Failure Containment Button */}
            <div className="mb-8">
                <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2">
                    CONTAINMENT PROTOCOL
                </div>
                <button
                    onClick={() => setFailureActive(true)}
                    className="w-full bg-[#1A1A1A] border-2 border-border2 p-4 text-center cursor-pointer hover:bg-[#222] transition-colors"
                >
                    <span className="font-mono text-[10px] tracking-[2px] uppercase text-text2">
                        LOG RELAPSE EVENT
                    </span>
                </button>
            </div>

            {/* Settings (Static for Phase 1) */}
            <div className="mb-8">
                <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2">
                    SYSTEM BOUNDARIES
                </div>
                <div className="flex flex-col gap-3 mb-6">
                    <div className="flex justify-between items-center py-2">
                        <span className="font-body text-[13px] text-text">Block Adult Content (OS/DNS Layer)</span>
                        <span className="font-mono text-[9px] text-green border border-green px-2 py-1">ACTIVE</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-border">
                        <span className="font-body text-[13px] text-text">Location Triggers (4PM Reset)</span>
                        <span className="font-mono text-[9px] text-text3 border border-border px-2 py-1">OFF</span>
                    </div>
                </div>

                <button
                    onClick={() => useAppStore.getState().setTab('settings')}
                    className="w-full bg-surface border border-border p-3 text-center cursor-pointer hover:bg-surface2 transition-colors"
                >
                    <span className="font-mono text-[10px] tracking-[2px] uppercase text-textPrimaryKey">
                        OPEN ADVANCED SETTINGS
                    </span>
                </button>
            </div>

            {/* Sign Out */}
            <div className="mt-auto pt-4">
                <button
                    onClick={signOut}
                    className="w-full flex items-center justify-center gap-2 p-4 border border-red/30 bg-red/5 text-red font-mono text-[10px] tracking-[2px] uppercase hover:bg-red/10 transition-colors"
                >
                    <LogOut size={14} />
                    SIGN OUT
                </button>
            </div>

        </div>
    )
}
