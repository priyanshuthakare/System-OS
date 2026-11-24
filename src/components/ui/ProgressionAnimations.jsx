import { Award, ChevronUp, Shield, Sparkles, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { useProgressionStore } from '../../store/useProgressionStore'

function XpGainToast({ xpAwarded, onDone }) {
    const [count, setCount] = useState(0)
    const [phase, setPhase] = useState('counting')
    const frameRef = useRef(null)

    useEffect(() => {
        const target = xpAwarded || 0
        if (target <= 0) { onDone(); return }

        const duration = Math.min(800, Math.max(300, target * 10))
        const startTime = performance.now()

        const tick = (now) => {
            const elapsed = now - startTime
            const progress = Math.min(1, elapsed / duration)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(target * eased))

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(tick)
            } else {
                setPhase('hold')
                setTimeout(() => { setPhase('fade'); setTimeout(onDone, 400) }, 1200)
            }
        }

        frameRef.current = requestAnimationFrame(tick)
        return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
    }, [xpAwarded, onDone])

    return (
        <div className={cn(
            'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-400',
            phase === 'fade' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        )}>
            <div className="bg-black/90 border border-amber/40 px-6 py-3 flex items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Sparkles size={16} className="text-amber animate-pulse" />
                <div className="font-mono text-amber text-sm tracking-widest">+{count} XP</div>
            </div>
        </div>
    )
}

function LevelUpOverlay({ fromLevel, toLevel, onDone }) {
    const [phase, setPhase] = useState('flash')

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase('reveal'), 200),
            setTimeout(() => setPhase('hold'), 600),
            setTimeout(() => setPhase('fade'), 2400),
            setTimeout(onDone, 2800)
        ]
        return () => timers.forEach(clearTimeout)
    }, [onDone])

    return (
        <div className={cn(
            'fixed inset-0 z-[60] flex items-center justify-center pointer-events-none transition-opacity duration-500',
            phase === 'flash' ? 'bg-amber/20' : 'bg-black/60',
            phase === 'fade' ? 'opacity-0' : 'opacity-100'
        )}>
            <div className={cn(
                'text-center transition-all duration-500',
                phase === 'flash' ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
            )}>
                <div className="flex items-center justify-center mb-3">
                    <ChevronUp size={24} className="text-amber animate-bounce" />
                </div>
                <div className="font-mono text-[10px] tracking-[4px] uppercase text-amber/70 mb-2">
                    Level Up
                </div>
                <div className="font-condensed font-black text-[72px] leading-none text-white">
                    {toLevel}
                </div>
                <div className="font-mono text-[9px] text-text3 mt-3 tracking-widest">
                    {fromLevel} &rarr; {toLevel}
                </div>
            </div>
        </div>
    )
}

function TitleUnlockOverlay({ title, onDone }) {
    const [phase, setPhase] = useState('enter')

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase('reveal'), 300),
            setTimeout(() => setPhase('hold'), 800),
            setTimeout(() => setPhase('fade'), 2800),
            setTimeout(onDone, 3200)
        ]
        return () => timers.forEach(clearTimeout)
    }, [onDone])

    return (
        <div className={cn(
            'fixed inset-0 z-[60] flex items-center justify-center pointer-events-none transition-opacity duration-500',
            phase === 'fade' ? 'opacity-0' : 'opacity-100',
            'bg-black/70'
        )}>
            <div className={cn(
                'text-center transition-all duration-700',
                phase === 'enter' ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
            )}>
                <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full border-2 border-violet-400/60 bg-violet-900/30 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)]">
                        <Award size={28} className="text-violet-300" />
                    </div>
                </div>
                <div className="font-mono text-[10px] tracking-[4px] uppercase text-violet-400/70 mb-2">
                    Title Unlocked
                </div>
                <div className="font-condensed font-black text-[28px] leading-tight text-white px-8">
                    {title?.name || 'Unknown Title'}
                </div>
            </div>
        </div>
    )
}

function RankUpdateToast({ currentRank, onDone }) {
    const [phase, setPhase] = useState('enter')

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase('hold'), 200),
            setTimeout(() => setPhase('fade'), 1400),
            setTimeout(onDone, 1800)
        ]
        return () => timers.forEach(clearTimeout)
    }, [onDone])

    return (
        <div className={cn(
            'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300',
            phase === 'fade' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        )}>
            <div className="bg-black/90 border border-blue-400/40 px-5 py-2.5 flex items-center gap-2 shadow-[0_0_15px_rgba(96,165,250,0.2)]">
                <Shield size={14} className="text-blue-400" />
                <div className="font-mono text-[9px] tracking-[2px] uppercase text-blue-300">{currentRank}</div>
            </div>
        </div>
    )
}

export default function ProgressionAnimations() {
    const consumeNextEvent = useProgressionStore(s => s.consumeNextEvent)
    const eventQueue = useProgressionStore(s => s.eventQueue)
    const [activeEvent, setActiveEvent] = useState(null)
    const processingRef = useRef(false)

    const processNext = useCallback(() => {
        if (processingRef.current) return
        const event = consumeNextEvent()
        if (!event) return
        processingRef.current = true
        setActiveEvent(event)
    }, [consumeNextEvent])

    useEffect(() => {
        if (!activeEvent && eventQueue.length > 0) {
            processNext()
        }
    }, [eventQueue.length, activeEvent, processNext])

    const handleDone = useCallback(() => {
        processingRef.current = false
        setActiveEvent(null)
    }, [])

    if (!activeEvent) return null

    if (activeEvent.type === 'xp_gain') {
        return <XpGainToast xpAwarded={activeEvent.payload?.xpAwarded} onDone={handleDone} />
    }

    if (activeEvent.type === 'level_up') {
        return (
            <LevelUpOverlay
                fromLevel={activeEvent.payload?.fromLevel}
                toLevel={activeEvent.payload?.toLevel}
                onDone={handleDone}
            />
        )
    }

    if (activeEvent.type === 'title_unlock') {
        return <TitleUnlockOverlay title={activeEvent.payload} onDone={handleDone} />
    }

    if (activeEvent.type === 'rank_update') {
        return <RankUpdateToast currentRank={activeEvent.payload?.currentRank} onDone={handleDone} />
    }

    handleDone()
    return null
}
