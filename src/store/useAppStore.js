import { create } from 'zustand'

/**
 * @intent Global App State Management
 * @param {Function} set - Zustand set function
 */
export const useAppStore = create((set) => ({
    // Navigation
    currentTab: 'today', // 'today', 'log', 'stats', 'profile'
    setTab: (tab) => set({ currentTab: tab }),

    // Overlays
    isUrgeActive: false,
    setUrgeActive: (status) => set({ isUrgeActive: status }),

    isFailureActive: false,
    setFailureActive: (status) => set({ isFailureActive: status }),

    isRecoveryActive: false,
    setRecoveryActive: (status) => set({ isRecoveryActive: status }),

    // Time-based Engine State
    currentTimeStr: '00:00 AM',
    currentStateName: 'BOOTING',
    currentBlock: '...',
    currentBlockId: null, // Tracks exact ID from db.time_blocks
    isSleepMode: false,
    isRewardWindowOpen: false,
    uiColor: 'bg-surface',

    // Session Metrics
    deepWorkMinutes: 0,
    setDeepWorkMinutes: (minutes) => set({ deepWorkMinutes: minutes }),

    // Actions
    setTimeState: (timeData) => set({ ...timeData })
}))
