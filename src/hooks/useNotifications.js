import { useCallback, useRef } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

/**
 * @intent Schedules system-level notifications 5 minutes before each state starts and ends.
 * Uses Capacitor LocalNotifications for Android/iOS — gracefully no-ops on web.
 */
export function useNotifications() {
    const scheduled = useRef(false)

    const requestPermission = useCallback(async () => {
        if (!Capacitor.isNativePlatform()) return true
        try {
            const { display } = await LocalNotifications.checkPermissions()
            if (display === 'granted') return true
            const { display: result } = await LocalNotifications.requestPermissions()
            return result === 'granted'
        } catch (e) {
            console.error('[Notifications] Permission check failed:', e)
            return false
        }
    }, [])

    /**
     * @intent Pre-schedule notifications for all user states (start -5min, end -5min)
     * @param {Array} timeBlocks - Array of time blocks from Dexie
     */
    const scheduleStateNotifications = useCallback(async (timeBlocks) => {
        if (!Capacitor.isNativePlatform()) return
        if (!timeBlocks || timeBlocks.length === 0) return

        const hasPermission = await requestPermission()
        if (!hasPermission) return

        try {
            // Clear any previously scheduled notifications from this app
            const pending = await LocalNotifications.getPending()
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending)
            }

            const now = new Date()
            const todayStr = now.toISOString().split('T')[0]
            const notifications = []
            let idCounter = 1

            for (const block of timeBlocks) {
                const [startH, startM] = block.start_time.split(':').map(Number)
                const [endH, endM] = block.end_time.split(':').map(Number)

                // Notification 5 minutes BEFORE start
                const startNotifyDate = new Date(`${todayStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`)
                startNotifyDate.setMinutes(startNotifyDate.getMinutes() - 5)

                if (startNotifyDate > now) {
                    notifications.push({
                        id: idCounter++,
                        title: `🔔 ${block.name.toUpperCase()} starts in 5 minutes`,
                        body: 'Get ready. Your stabilizing sequence is about to begin.',
                        schedule: { at: startNotifyDate },
                        sound: 'default',
                        smallIcon: 'ic_launcher_foreground',
                        actionTypeId: 'STATE_START'
                    })
                }

                // Notification 5 minutes BEFORE end
                const endNotifyDate = new Date(`${todayStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`)
                endNotifyDate.setMinutes(endNotifyDate.getMinutes() - 5)

                if (endNotifyDate > now && endNotifyDate > startNotifyDate) {
                    notifications.push({
                        id: idCounter++,
                        title: `⚡ ${block.name.toUpperCase()} ends in 5 minutes`,
                        body: 'Complete your remaining steps before the window closes.',
                        schedule: { at: endNotifyDate },
                        sound: 'default',
                        smallIcon: 'ic_launcher_foreground',
                        actionTypeId: 'STATE_END'
                    })
                }
            }

            if (notifications.length > 0) {
                await LocalNotifications.schedule({ notifications })
                console.log(`[Notifications] Scheduled ${notifications.length} state notifications for today`)
            }

            // --- SCHEDULE RANDOM QUOTES ---
            const QUOTES = [
                "It’s not always that we need to do more, but rather that we need to focus on less. — Nathan W. Morris",
                "Amateurs sit and wait for inspiration, the rest of us just get up and go to work. — Stephen King",
                "You do not rise to the level of your goals. You fall to the level of your systems. — James Clear",
                "Success usually comes to those who are too busy to be looking for it. — Henry David Thoreau",
                "The key is not to prioritize what’s on your schedule, but to schedule your priorities. — Stephen Covey",
                "Change is the law of life. And those who look only to the past or present are certain to miss the future. — John F. Kennedy",
                "Be the change that you wish to see in the world. — Mahatma Gandhi",
                "Life belongs to the living, and he who lives must be prepared for changes. — Johann Wolfgang von Goethe",
                "If you change the way you look at things, the things you look at change. — Wayne Dyer",
                "Small daily improvements are the key to staggering long-term results. — Robin Sharma"
            ]

            const quoteNotifications = []
            const hoursToSchedule = [9, 12, 16, 19] // 9am, 12pm, 4pm, 7pm

            // Schedule for the next 7 days
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const targetDay = new Date(now)
                targetDay.setDate(targetDay.getDate() + dayOffset)
                
                for (const hour of hoursToSchedule) {
                    const notifyDate = new Date(targetDay)
                    notifyDate.setHours(hour, 0, 0, 0)

                    if (notifyDate > now) {
                        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
                        quoteNotifications.push({
                            id: idCounter++,
                            title: 'Stability Logic',
                            body: randomQuote,
                            schedule: { at: notifyDate },
                            sound: 'default',
                            smallIcon: 'ic_launcher_foreground',
                            actionTypeId: 'DAILY_QUOTE'
                        })
                    }
                }
            }

            if (quoteNotifications.length > 0) {
                await LocalNotifications.schedule({ notifications: quoteNotifications })
                console.log(`[Notifications] Scheduled ${quoteNotifications.length} quote notifications`)
            }

            scheduled.current = true
        } catch (e) {
            console.error('[Notifications] Failed to schedule:', e)
        }
    }, [requestPermission])

    return { scheduleStateNotifications, requestPermission }
}
