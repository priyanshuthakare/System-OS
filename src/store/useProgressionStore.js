import { create } from 'zustand'

/**
 * @intent Central progression UI state: snapshot, task apply status, and animation/event queue
 */
export const useProgressionStore = create((set, get) => ({
    snapshot: null,
    isApplyingTask: false,
    lastTaskResult: null,
    eventQueue: [],

    setSnapshot: (snapshot) => set({ snapshot }),
    setApplyingTask: (isApplyingTask) => set({ isApplyingTask }),
    setLastTaskResult: (lastTaskResult) => set({ lastTaskResult }),

    queueEvent: (event) => set(state => ({
        eventQueue: [...state.eventQueue, event]
    })),

    clearEvents: () => set({ eventQueue: [] }),

    consumeNextEvent: () => {
        const queue = get().eventQueue
        if (!queue.length) return null
        const [nextEvent, ...remaining] = queue
        set({ eventQueue: remaining })
        return nextEvent
    }
}))
