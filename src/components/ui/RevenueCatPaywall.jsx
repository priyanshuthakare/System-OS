import { useEffect, useState } from 'react'
import { X, Check, Zap, Shield, BarChart2, Brain, Loader } from 'lucide-react'
import { useRevenueCat } from '../../hooks/useRevenueCat'
import { cn } from '../../lib/utils'

const FEATURES = [
    { icon: Shield, label: 'Unlimited States', desc: 'Build as many stabilizing sequences as you need' },
    { icon: Zap, label: 'Urge Engine', desc: 'Real-time urge interruption with personalized steps' },
    { icon: BarChart2, label: '90-Day Analytics', desc: 'Full execution history and pattern recognition' },
    { icon: Brain, label: 'Adaptive AI', desc: 'AI diagnoses failing states and suggests structural changes' },
]

const PACKAGE_DISPLAY = {
    monthly: { label: 'Monthly', period: '/month' },
    yearly: { label: 'Yearly', period: '/year', badge: 'BEST VALUE' },
    lifetime: { label: 'Lifetime', period: 'one-time', badge: 'ULTIMATE' },
}

/**
 * @intent RevenueCat paywall component with product selection and purchase flow
 * @param {{ onClose: function, onSuccess: function }} props
 */
export default function RevenueCatPaywall({ onClose, onSuccess }) {
    const { currentOffering, purchase, restore, loading, error, isPro } = useRevenueCat()
    const [selectedPackage, setSelectedPackage] = useState('yearly')
    const [purchasing, setPurchasing] = useState(false)
    const [purchaseError, setPurchaseError] = useState(null)
    const [showRestore, setShowRestore] = useState(false)

    const packages = currentOffering?.availablePackages || []

    const handlePurchase = async () => {
        try {
            setPurchaseError(null)
            setPurchasing(true)

            const result = await purchase(selectedPackage)

            if (result.success) {
                console.log('[Paywall] Purchase successful')
                if (onSuccess) onSuccess()
                onClose()
            } else {
                setPurchaseError(result.error || 'Purchase failed')
            }
        } catch (err) {
            setPurchaseError(err.message || 'Purchase failed')
        } finally {
            setPurchasing(false)
        }
    }

    const handleRestore = async () => {
        try {
            setPurchaseError(null)
            setPurchasing(true)

            const result = await restore()

            if (result.success) {
                console.log('[Paywall] Restore successful')
                if (onSuccess) onSuccess()
                onClose()
            } else {
                setPurchaseError(result.error || 'Restore failed')
            }
        } catch (err) {
            setPurchaseError(err.message || 'Restore failed')
        } finally {
            setPurchasing(false)
        }
    }

    if (isPro) {
        return (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="w-full max-w-sm bg-[#0A0A0A] border border-border">
                    <div className="relative px-6 pt-6 pb-4 border-b border-border">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-text3 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <div className="font-mono text-[9px] tracking-[3px] text-green uppercase mb-2">
                            ✓ ACTIVE
                        </div>
                        <div className="font-condensed font-black text-[28px] text-white leading-none uppercase">
                            PRO UNLOCKED
                        </div>
                        <p className="font-body text-[13px] text-text2 mt-2 leading-relaxed">
                            You have full access to all System OS Pro features.
                        </p>
                    </div>

                    <div className="px-6 py-6 flex flex-col gap-4">
                        <button
                            onClick={onClose}
                            className="w-full bg-green text-black font-condensed font-bold text-[14px] tracking-[3px] uppercase py-4 hover:bg-green/90 transition-colors"
                        >
                            CLOSE
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-sm bg-[#0A0A0A] border border-border my-6">
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
                <div className="px-6 py-4 border-b border-border">
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

                {/* Package Selection */}
                {packages.length > 0 && (
                    <div className="px-6 py-4 border-b border-border">
                        <div className="font-mono text-[9px] tracking-[2px] text-text2 uppercase mb-3">
                            Choose Your Plan
                        </div>
                        <div className="flex flex-col gap-2">
                            {packages.map(pkg => {
                                const display = PACKAGE_DISPLAY[pkg.identifier] || { label: pkg.identifier }
                                const isSelected = selectedPackage === pkg.identifier

                                return (
                                    <button
                                        key={pkg.identifier}
                                        onClick={() => setSelectedPackage(pkg.identifier)}
                                        className={cn(
                                            'relative p-3 border transition-all text-left',
                                            isSelected
                                                ? 'border-amber bg-amber/10'
                                                : 'border-border hover:border-text3'
                                        )}
                                    >
                                        {display.badge && (
                                            <div className="absolute top-2 right-2 font-mono text-[7px] tracking-[1px] text-amber uppercase">
                                                {display.badge}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mb-1">
                                            {isSelected && <Check size={14} className="text-amber" />}
                                            <div className="font-condensed font-bold text-[12px] text-white uppercase">
                                                {display.label}
                                            </div>
                                        </div>
                                        <div className="font-mono text-[10px] text-text3">
                                            {pkg.product?.priceString} {display.period}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {(error || purchaseError) && (
                    <div className="px-6 py-3 bg-red/10 border-b border-red/30">
                        <div className="font-mono text-[9px] text-red tracking-[1px]">
                            {purchaseError || error}
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="px-6 py-6 flex flex-col gap-3">
                    <button
                        onClick={handlePurchase}
                        disabled={purchasing || loading}
                        className="w-full bg-amber text-black font-condensed font-bold text-[14px] tracking-[3px] uppercase py-4 hover:bg-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {purchasing && <Loader size={14} className="animate-spin" />}
                        {purchasing ? 'PROCESSING...' : 'UNLOCK PRO'}
                    </button>

                    <button
                        onClick={() => setShowRestore(!showRestore)}
                        className="font-mono text-[9px] text-text3 hover:text-white transition-colors tracking-[1px] uppercase"
                    >
                        {showRestore ? 'HIDE' : 'RESTORE'} PURCHASES
                    </button>

                    {showRestore && (
                        <button
                            onClick={handleRestore}
                            disabled={purchasing || loading}
                            className="w-full border border-border text-text3 font-mono text-[10px] tracking-[1px] uppercase py-3 hover:text-white hover:border-text3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            RESTORE
                        </button>
                    )}

                    <div className="text-center font-mono text-[8px] text-text3 tracking-[1px]">
                        Cancel anytime · Restores with your account
                    </div>
                </div>
            </div>
        </div>
    )
}
