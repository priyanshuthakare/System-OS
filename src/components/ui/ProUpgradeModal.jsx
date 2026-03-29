import { X, Zap, Shield, BarChart2, Brain } from 'lucide-react'
import { cn } from '../../lib/utils'

const FEATURES = [
    { icon: Shield, label: 'Unlimited States', desc: 'Build as many stabilizing sequences as you need' },
    { icon: Zap, label: 'Urge Engine', desc: 'Real-time urge interruption with personalized steps' },
    { icon: BarChart2, label: '90-Day Analytics', desc: 'Full execution history and pattern recognition' },
    { icon: Brain, label: 'Adaptive AI', desc: 'AI diagnoses failing states and suggests structural changes' },
]

/**
 * @intent Non-intrusive upgrade modal emphasizing stability value, not just feature limits
 * @param {{ onClose: function }} props
 */
export default function ProUpgradeModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-[#0A0A0A] border border-border">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-border">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-text3 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                    <div className="font-mono text-[9px] tracking-[3px] text-amber uppercase mb-2">
                        UPGRADE AVAILABLE
                    </div>
                    <div className="font-condensed font-black text-[28px] text-white leading-none uppercase">
                        STABILITY PRO
                    </div>
                    <p className="font-body text-[13px] text-text2 mt-2 leading-relaxed">
                        Unlock the full behavioral execution system. More states, deeper analytics, AI-powered diagnostics.
                    </p>
                </div>

                {/* Features */}
                <div className="px-6 py-4">
                    {FEATURES.map((feat, i) => {
                        const Icon = feat.icon
                        return (
                            <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
                                <Icon size={16} className="text-amber shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-condensed font-bold text-[13px] text-white uppercase tracking-[1px]">
                                        {feat.label}
                                    </div>
                                    <div className="font-mono text-[9px] text-text3 mt-0.5">
                                        {feat.desc}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                    <button
                        onClick={() => {
                            // RevenueCat purchase flow will go here
                            console.log('[ProUpgrade] Purchase flow triggered')
                        }}
                        className="w-full bg-amber text-black font-condensed font-bold text-[14px] tracking-[3px] uppercase py-4 hover:bg-amber/90 transition-colors"
                    >
                        UNLOCK PRO
                    </button>
                    <div className="text-center font-mono text-[8px] text-text3 mt-2 tracking-[1px]">
                        Cancel anytime · Restores with your account
                    </div>
                </div>
            </div>
        </div>
    )
}
