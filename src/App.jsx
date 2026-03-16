import { useEffect, useState, useRef } from 'react'
import PhoneFrame from './components/layout/PhoneFrame'
import TimeEngine from './components/logic/TimeEngine'
import AuthView from './components/views/AuthView'
import ClosureView from './components/views/ClosureView'
import FailureOverlay from './components/views/FailureOverlay'
import GuideOverlay from './components/views/GuideOverlay'
import HomeView from './components/views/HomeView'
import LogView from './components/views/LogView'
import OnboardingView from './components/views/OnboardingView'
import ProfileView from './components/views/ProfileView'
import RecoveryOverlay from './components/views/RecoveryOverlay'
import SettingsView from './components/views/SettingsView'
import SleepView from './components/views/SleepView'
import StatsView from './components/views/StatsView'
import UrgeOverlay from './components/views/UrgeOverlay'
import { useSyncEngine } from './hooks/useSyncEngine'
import { useAppStore } from './store/useAppStore'
import { useAuthStore } from './store/useAuthStore'

/**
 * @intent Root application orchestrator with auth gating, sync, onboarding
 * @param None
 */
export default function App() {
    const user = useAuthStore(s => s.user)
    const profile = useAuthStore(s => s.profile)
    const authLoading = useAuthStore(s => s.loading)
    const isOnboarded = useAuthStore(s => s.isOnboarded)
    const init = useAuthStore(s => s.init)

    const currentTab = useAppStore(state => state.currentTab)
    const isUrgeActive = useAppStore(state => state.isUrgeActive)
    const isFailureActive = useAppStore(state => state.isFailureActive)
    const isRecoveryActive = useAppStore(state => state.isRecoveryActive)
    const setRecoveryActive = useAppStore(state => state.setRecoveryActive)
    const isSleepMode = useAppStore(state => state.isSleepMode)

    const { syncAll } = useSyncEngine()
    const [synced, setSynced] = useState(false)
    const [syncLog, setSyncLog] = useState('Initiating sync process...')
    const syncStarted = useRef(false)

    // Initialize auth listener on mount
    useEffect(() => { init() }, [init])

    // Sync Supabase → Dexie after login + onboarding confirmed
    useEffect(() => {
        if (user && isOnboarded && !synced && !syncStarted.current) {
            syncStarted.current = true
            setSyncLog('Pulling Supabase data...')
            
            // Start sync
            const syncPromise = syncAll()
            
            // Hard 5-second fallback: Guarantee we never lock the user out
            const fallbackTimeout = setTimeout(() => {
                setSyncLog('Sync timed out. Force entering app...')
                setSynced(true)
            }, 5000)

            syncPromise
                .then(() => {
                    clearTimeout(fallbackTimeout)
                    setSyncLog('Sync complete.')
                    setSynced(true)
                })
                .catch(err => {
                    clearTimeout(fallbackTimeout)
                    console.error("Sync caught error:", err)
                    setSyncLog('Sync errored. Continuing...')
                    setSynced(true)
                })
        }
    }, [user, isOnboarded, synced, syncAll])

    // Reset sync flag on logout
    useEffect(() => {
        if (!user) {
            setSynced(false)
            syncStarted.current = false
            setSyncLog('Initiating sync process...')
        }
    }, [user])

    // Loading state
    if (authLoading) {
        return (
            <PhoneFrame>
                <div className="flex-1 flex items-center justify-center">
                    <div className="font-mono text-[10px] text-text3 tracking-[3px] uppercase animate-pulse">
                        INITIALIZING SYSTEM...
                    </div>
                </div>
            </PhoneFrame>
        )
    }

    // Not logged in → Auth gate
    if (!user) {
        return <AuthView />
    }

    // Logged in but not onboarded → Onboarding
    if (!isOnboarded) {
        return <OnboardingView />
    }

    // Waiting for initial cloud → local sync
    if (!synced) {
        return (
            <PhoneFrame>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                    <div className="font-mono text-[10px] text-amber tracking-[3px] uppercase animate-pulse text-center">
                        SYNCING CLOUD DATA...
                    </div>
                    <div className="font-mono text-[8px] text-text3 tracking-[1px] uppercase text-center opacity-70">
                        {syncLog}
                    </div>
                </div>
            </PhoneFrame>
        )
    }

    // Force Sleep View over everything if time block has is_sleep
    if (isSleepMode) {
        return (
            <PhoneFrame>
                <TimeEngine />
                <SleepView />
            </PhoneFrame>
        )
    }

    return (
        <PhoneFrame>
            <TimeEngine />

            {/* First-time guide overlay */}
            {profile && !profile.has_seen_guide && <GuideOverlay />}

            {/* Active View Routing */}
            {currentTab === 'today' && <HomeView />}
            {currentTab === 'log' && <LogView />}
            {currentTab === 'stats' && <StatsView />}
            {currentTab === 'closure' && <ClosureView />}
            {currentTab === 'profile' && <ProfileView />}
            {currentTab === 'settings' && <SettingsView />}

            {/* Screen Overlays */}
            {isUrgeActive && <UrgeOverlay />}
            {isFailureActive && <FailureOverlay />}
            {isRecoveryActive && <RecoveryOverlay onClose={() => setRecoveryActive(false)} />}
        </PhoneFrame>
    )
}
