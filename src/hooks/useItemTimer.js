import { useEffect, useState } from 'react'

/**
 * @intent Manages countdown timer logic for specialized checklist items (e.g. 5-min walk, 30-min block)
 * @param {number} durationMinutes - Timer length in minutes
 * @param {Function} onComplete - Callback fired when timer reaches 0
 */
export function useItemTimer(durationMinutes, onComplete) {
    const [isActive, setIsActive] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60)

    useEffect(() => {
        let interval = null
        if (isActive && secondsLeft > 0) {
            interval = setInterval(() => {
                setSecondsLeft(prev => prev - 1)
            }, 1000)
        } else if (isActive && secondsLeft <= 0) {
            setIsActive(false)
            if (onComplete) onComplete()
        }
        return () => clearInterval(interval)
    }, [isActive, secondsLeft, onComplete])

    const startTimer = () => {
        if (!isActive && secondsLeft > 0) {
            setIsActive(true)
        }
    }

    const formatTime = () => {
        const m = Math.floor(secondsLeft / 60)
        const s = secondsLeft % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return {
        isActive,
        secondsLeft,
        startTimer,
        formatTime
    }
}
