import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

/**
 * @intent System 3: Lock Engine — detects app blur/focus and triggers recovery if checklist is incomplete
 * @param {boolean} hasIncompleteItems - Whether the active state's checklist has remaining items
 */
export function useLockEngine(hasIncompleteItems) {
    const setRecoveryActive = useAppStore(s => s.setRecoveryActive)
    const currentBlockId = useAppStore(s => s.currentBlockId)
    const wasBackground = useRef(false)

    useEffect(() => {
        if (!currentBlockId) return

        const handleVisibility = () => {
            if (document.hidden) {
                // User left the app / switched tabs
                if (hasIncompleteItems) {
                    wasBackground.current = true
                }
            } else {
                // User returned
                if (wasBackground.current && hasIncompleteItems) {
                    wasBackground.current = false
                    setRecoveryActive(true)
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibility)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [currentBlockId, hasIncompleteItems, setRecoveryActive])
}
