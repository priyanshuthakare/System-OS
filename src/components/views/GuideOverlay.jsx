import { useState } from 'react'
import { ChevronRight, X, Shield, ListChecks, RotateCcw, Moon } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/utils'

const SLIDES = [
    {
        icon: Shield,
        title: 'States',
        body: 'States are the unstable windows in your day. You define when drift usually starts, and the app activates a stabilizing sequence at that exact time.',
        color: 'text-amber'
    },
    {
        icon: ListChecks,
        title: 'Checklists',
        body: 'Each state has a short sequence: Physical first (water, pushups), then Grounding (breathe, sit upright), then your Target task. This order breaks passive drift.',
        color: 'text-green'
    },
    {
        icon: RotateCcw,
        title: 'Recovery',
        body: 'If you fail, the system doesn\'t punish you. It immediately prompts a 20-second recovery action to get you back inside the system.',
        color: 'text-red'
    },
    {
        icon: Moon,
        title: 'Daily Closure',
        body: 'Every night, review how many states you executed. One line: "What failed structurally?" No journaling overload. Just clarity.',
        color: 'text-blue-400'
    }
]

/**
 * @intent One-time guide overlay for first-time users. Dismissed permanently.
 * @param None
 */
export default function GuideOverlay() {
    const markGuideSeen = useAuthStore(s => s.markGuideSeen)
    const [slideIdx, setSlideIdx] = useState(0)

    const slide = SLIDES[slideIdx]
    const Icon = slide.icon
    const isLast = slideIdx === SLIDES.length - 1

    const handleNext = () => {
        if (isLast) {
            markGuideSeen()
        } else {
            setSlideIdx(slideIdx + 1)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm flex flex-col gap-8">
                {/* Skip */}
                <button
                    onClick={() => markGuideSeen()}
                    className="self-end font-mono text-[9px] tracking-[2px] uppercase text-text3 hover:text-white transition-colors flex items-center gap-1"
                >
                    Skip <X size={12} />
                </button>

                {/* Dots */}
                <div className="flex gap-2 justify-center">
                    {SLIDES.map((_, i) => (
                        <div key={i} className={cn("w-2 h-2 rounded-full transition-colors", i <= slideIdx ? 'bg-amber' : 'bg-border')} />
                    ))}
                </div>

                {/* Content */}
                <div className="text-center flex flex-col items-center gap-5">
                    <Icon size={40} className={slide.color} />
                    <h2 className="font-condensed font-black text-[32px] leading-none tracking-[-1px] text-white uppercase">
                        {slide.title}
                    </h2>
                    <p className="font-body text-sm text-text2 leading-relaxed max-w-[280px]">
                        {slide.body}
                    </p>
                </div>

                {/* Action */}
                <button
                    onClick={handleNext}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-surface border border-border font-mono text-[10px] tracking-[2px] uppercase text-white hover:bg-surface2 transition-colors"
                >
                    {isLast ? 'Start Using App' : 'Next'} <ChevronRight size={14} />
                </button>
            </div>
        </div>
    )
}
