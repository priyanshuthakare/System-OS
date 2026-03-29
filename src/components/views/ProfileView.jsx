import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shield, Info, AlertTriangle, LogOut } from 'lucide-react'
import { useActivityHeatmap } from '../../hooks/useActivityHeatmap'
import { useTierGuard } from '../../hooks/useTierGuard'
import HeatmapGrid from '../ui/HeatmapGrid'
import ProUpgradeModal from '../ui/ProUpgradeModal'
import { useAppStore } from '../../store/useAppStore'
import { useAuthStore } from '../../store/useAuthStore'
import { db } from '../../lib/db'
import { cn } from '../../lib/utils'

/**
 * @intent Profile & System Status — heatmap, phase info, containment protocol, system boundaries
 * @param None
 */
export default function ProfileView() {
    const { heatmapDays, isPro, tier } = useTierGuard()
    const { days, totalActive, currentStreak } = useActivityHeatmap(heatmapDays)
    const setFailureActive = useAppStore(state => state.setFailureActive)
    const signOut = useAuthStore(s => s.signOut)
    const userEmail = useAuthStore(s => s.user?.email)
    const [showUpgrade, setShowUpgrade] = useState(false)
    const [showDnsInfo, setShowDnsInfo] = useState(false)
    const [signingOut, setSigningOut] = useState(false)

    const handleSignOut = async () => {
        setSigningOut(true)
        try { await signOut() } catch (e) { console.error(e) } finally { setSigningOut(false) }
    }

    const profData = useLiveQuery(() => db.profiles.toCollection().first())
    const phaseData = useLiveQuery(() => profData ? db.phases.get(profData.phase_id) : undefined, [profData])

    // Use active_days (behavioral counter) not wall-clock date diff
    let dayNumber = profData?.active_days || 1

    return (
        <div className="flex-1 overflow-y-auto w-full bg-black flex flex-col p-6 pt-10 pb-20">
            {/* Header */}
            <h1 className="font-condensed font-black text-[40px] leading-none text-white uppercase tracking-[-1px] mb-1">
                Profile
            </h1>
            <div className="font-mono text-[8px] text-text3 tracking-[2px] uppercase mb-8">
                Day {dayNumber} · {phaseData?.name?.replace('-', '—') || 'Phase 1'} ·{' '}
                <span className={cn(isPro ? 'text-amber' : 'text-text3')}>
                    {tier.toUpperCase()}
                </span>
            </div>

            {/* Execution History Heatmap — always 90 boxes */}
            <HeatmapGrid days={days} totalActive={totalActive} currentStreak={currentStreak} />

            {/* Containment Protocol */}
            <div className="mb-8">
                <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red" />
                    Containment Protocol
                </div>
                <button
                    onClick={() => setFailureActive(true)}
                    className="w-full bg-surface border border-red/30 p-4 text-left hover:bg-red-dim transition-colors"
                >
                    <div className="font-condensed font-bold text-[16px] text-red tracking-[2px] uppercase mb-1">
                        LOG RELAPSE EVENT
                    </div>
                    <div className="font-mono text-[9px] text-text3 tracking-[0.5px] leading-[1.6]">
                        Opens the failure containment protocol.<br />
                        No streak reset. No shame. Just structural re-entry.
                    </div>
                </button>
            </div>

            {/* System Boundaries */}
            <div className="mb-8">
                <div className="font-condensed font-bold text-[13px] tracking-[3px] uppercase text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
                    <Shield size={14} className="text-green" />
                    System Boundaries
                </div>

                {/* DNS Blocking — informational */}
                <div className="bg-surface border border-border p-4 mb-3 flex items-center justify-between">
                    <div>
                        <div className="font-body text-sm text-text mb-1">Block Adult Content</div>
                        <div className="font-mono text-[8px] text-text3 tracking-[0.5px]">
                            Device-level DNS / Screen Time
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDnsInfo(!showDnsInfo)}
                        className="px-3 py-1.5 border border-border font-mono text-[9px] text-text2 tracking-[1px] hover:text-white hover:border-text3 transition-colors flex items-center gap-1"
                    >
                        <Info size={10} /> SETUP
                    </button>
                </div>

                {showDnsInfo && (
                    <div className="bg-black border border-green/20 p-4 mb-3 font-mono text-[10px] text-text2 leading-[1.8] tracking-[0.5px]">
                        <div className="text-green text-[9px] tracking-[2px] uppercase mb-2">DNS BLOCKING SETUP</div>
                        <div className="mb-2">This is enforced at your device level, not inside the app.</div>
                        <div className="text-text3 mb-1">• <strong className="text-white">iPhone:</strong> Settings → Screen Time → Content Restrictions → Web Content → Limit Adult</div>
                        <div className="text-text3 mb-1">• <strong className="text-white">Android:</strong> Use NextDNS or Family Link for system-wide DNS filtering</div>
                        <div className="text-text3">• <strong className="text-white">Desktop:</strong> Set NextDNS (nextdns.io) as your system DNS resolver</div>
                    </div>
                )}

                {/* Location Triggers — coming soon */}
                <div className="bg-surface border border-border p-4 flex items-center justify-between opacity-50">
                    <div>
                        <div className="font-body text-sm text-text mb-1">Location Triggers</div>
                        <div className="font-mono text-[8px] text-text3 tracking-[0.5px]">
                            Auto-activate states by location
                        </div>
                    </div>
                    <div className="px-3 py-1.5 border border-text3/30 font-mono text-[8px] text-text3 tracking-[1px]">
                        PHASE 2
                    </div>
                </div>
            </div>

            {/* Upgrade CTA */}
            {!isPro && (
                <button
                    onClick={() => setShowUpgrade(true)}
                    className="w-full bg-surface border border-amber/30 p-4 text-center hover:bg-amber-dim transition-colors mb-6"
                >
                    <div className="font-condensed font-bold text-[14px] text-amber tracking-[3px] uppercase">
                        UPGRADE TO PRO
                    </div>
                    <div className="font-mono text-[8px] text-text3 mt-1 tracking-[1px]">
                        Unlimited states · Full heatmap · AI diagnostic · Urge Engine
                    </div>
                </button>
            )}

            {showUpgrade && <ProUpgradeModal onClose={() => setShowUpgrade(false)} />}

            {/* Sign Out */}
            <div className="border-t border-border pt-6 mt-2">
                <div className="font-mono text-[8px] text-text3 tracking-[1px] text-center mb-3">
                    {userEmail}
                </div>
                <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full flex items-center justify-center gap-2 p-3 border border-border font-mono text-[10px] tracking-[2px] uppercase text-text2 hover:text-red hover:border-red transition-colors disabled:opacity-40"
                >
                    <LogOut size={13} />
                    {signingOut ? 'SIGNING OUT...' : 'SIGN OUT'}
                </button>
            </div>
        </div>
    )
}
