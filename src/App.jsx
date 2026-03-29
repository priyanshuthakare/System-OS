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
import UrgeOverlay from './components/views/UrgeOverlay'
import { useNotifications } from './hooks/useNotifications'
import { useSyncEngine } from './hooks/useSyncEngine'
import { db } from './lib/db'
import { useAppStore } from './store/useAppStore'
import { useAuthStore } from './store/useAuthStore'

/**
 * @intent Root application orchestrator with auth gating, offline-first sync, onboarding
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
    const { scheduleStateNotifications } = useNotifications()

    // synced = local data is ready to render (either from cache or fresh sync)
    const [synced, setSynced] = useState(false)
    const syncStarted = useRef(false)

    // Initialize auth listener on mount
    useEffect(() => { init() }, [init])

    // Offline-first sync logic
    useEffect(() => {
        if (!user || !isOnboarded || syncStarted.current) return
        syncStarted.current = true

        const runSync = async () => {
            // --- OFFLINE-FIRST: Check if we already have local data ---
            const localBlockCount = await db.time_blocks.count()
            const lastSynced = await db.user_preferences.get('last_synced')

            if (localBlockCount > 0 && lastSynced?.value) {
                // We have cached data — enter the app immediately
                setSynced(true)

                // Then sync in background silently (no loading screen)
                syncAll()
                    .then(async () => {
                        await db.user_preferences.put({ key: 'last_synced', value: new Date().toISOString() })
                        const blocks = await db.time_blocks.toArray()
                        scheduleStateNotifications(blocks).catch(() => {})
                    })
                    .catch(err => console.warn('[App] Background sync failed (offline?):', err))

                return
            }

            // --- FIRST LOGIN: Must sync before entering ---
            const fallbackTimeout = setTimeout(() => {
                console.warn('[App] Sync timed out — entering with whatever data is available')
                setSynced(true)
            }, 6000)

            syncAll()
                .then(async () => {
                    clearTimeout(fallbackTimeout)
                    await db.user_preferences.put({ key: 'last_synced', value: new Date().toISOString() })
                    const blocks = await db.time_blocks.toArray()
                    scheduleStateNotifications(blocks).catch(() => {})
                    setSynced(true)
                })
                .catch(err => {
                    clearTimeout(fallbackTimeout)
                    console.error('[App] Initial sync error:', err)
                    setSynced(true)
                })
        }

        runSync()
    }, [user, isOnboarded])

    // Reset sync flag on logout so next login re-syncs
    useEffect(() => {
        if (!user) {
            setSynced(false)
            syncStarted.current = false
        }
    }, [user])

    // --- RENDER GATES ---

    if (authLoading) {
        return (
            <PhoneFrame>
                <div className="flex-1 flex items-center justify-center">
                    <div className="font-mono text-[10px] text-text3 tracking-[3px] uppercase animate-pulse">
                        INITIALIZING...
                    </div>
                </div>
            </PhoneFrame>
        )
    }

    if (!user) return <AuthView />

    if (!isOnboarded) return <OnboardingView />

    // Only show sync screen on first-ever login (no local cache)
    if (!synced) {
        return (
            <PhoneFrame>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                    <div className="font-mono text-[10px] text-amber tracking-[3px] uppercase animate-pulse text-center">
                        SYNCING SYSTEM DATA...
                    </div>
                    <div className="font-mono text-[8px] text-text3 tracking-[1px] text-center opacity-60">
                        First-time setup. This only happens once.
                    </div>
                </div>
            </PhoneFrame>
        )
    }

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

            {profile && !profile.has_seen_guide && <GuideOverlay />}

            {currentTab === 'today' && <HomeView />}
            {currentTab === 'log' && <LogView />}
            {currentTab === 'closure' && <ClosureView />}
            {currentTab === 'profile' && <ProfileView />}
            {currentTab === 'settings' && <SettingsView />}

            {isUrgeActive && <UrgeOverlay />}
            {isFailureActive && <FailureOverlay />}
            {isRecoveryActive && <RecoveryOverlay onClose={() => setRecoveryActive(false)} />}
        </PhoneFrame>
    )
}
