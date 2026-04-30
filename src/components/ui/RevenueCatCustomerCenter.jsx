import { useEffect, useState } from 'react'
import { X, Loader, AlertCircle } from 'lucide-react'
import { useRevenueCat } from '../../hooks/useRevenueCat'

/**
 * @intent RevenueCat Customer Center for managing subscriptions
 * Allows users to view, manage, and restore purchases
 * @param {{ onClose: function }} props
 */
export default function RevenueCatCustomerCenter({ onClose }) {
    const { customerInfo, restore, loading, error, isPro } = useRevenueCat()
    const [restoring, setRestoring] = useState(false)
    const [restoreError, setRestoreError] = useState(null)
    const [restoreSuccess, setRestoreSuccess] = useState(false)

    const handleRestore = async () => {
        try {
            setRestoreError(null)
            setRestoreSuccess(false)
            setRestoring(true)

            const result = await restore()

            if (result.success) {
                setRestoreSuccess(true)
                setTimeout(() => setRestoreSuccess(false), 3000)
            } else {
                setRestoreError(result.error || 'Restore failed')
            }
        } catch (err) {
            setRestoreError(err.message || 'Restore failed')
        } finally {
            setRestoring(false)
        }
    }

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
                    <div className="font-mono text-[9px] tracking-[3px] text-blue-400 uppercase mb-2">
                        ACCOUNT MANAGEMENT
                    </div>
                    <div className="font-condensed font-black text-[28px] text-white leading-none uppercase">
                        Subscription
                    </div>
                </div>

                {/* Status */}
                <div className="px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-3 h-3 rounded-full ${isPro ? 'bg-green' : 'bg-text3'}`} />
                        <div>
                            <div className="font-condensed font-bold text-[13px] text-white uppercase">
                                {isPro ? 'PRO ACTIVE' : 'FREE PLAN'}
                            </div>
                            <div className="font-mono text-[9px] text-text3">
                                {isPro ? 'You have full access to all features' : 'Upgrade to unlock premium features'}
                            </div>
                        </div>
                    </div>

                    {customerInfo?.activeSubscriptions && customerInfo.activeSubscriptions.length > 0 && (
                        <div className="bg-surface p-3 border border-border">
                            <div className="font-mono text-[8px] text-text3 uppercase tracking-[1px] mb-2">
                                Active Subscriptions
                            </div>
                            <div className="space-y-1">
                                {customerInfo.activeSubscriptions.map((sub, i) => (
                                    <div key={i} className="font-mono text-[10px] text-white">
                                        • {sub}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-b border-border">
                    <div className="font-mono text-[9px] tracking-[2px] text-text2 uppercase mb-3">
                        Actions
                    </div>

                    {/* Restore Purchases */}
                    <div className="mb-3">
                        <button
                            onClick={handleRestore}
                            disabled={restoring || loading}
                            className="w-full border border-border text-text3 font-mono text-[10px] tracking-[1px] uppercase py-3 hover:text-white hover:border-text3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {restoring && <Loader size={12} className="animate-spin" />}
                            {restoring ? 'RESTORING...' : 'RESTORE PURCHASES'}
                        </button>
                    </div>

                    {/* Messages */}
                    {restoreSuccess && (
                        <div className="p-3 bg-green/10 border border-green/30 mb-3">
                            <div className="font-mono text-[9px] text-green tracking-[1px]">
                                ✓ Purchases restored successfully
                            </div>
                        </div>
                    )}

                    {(error || restoreError) && (
                        <div className="p-3 bg-red/10 border border-red/30 mb-3 flex gap-2">
                            <AlertCircle size={12} className="text-red shrink-0 mt-0.5" />
                            <div className="font-mono text-[9px] text-red tracking-[1px]">
                                {restoreError || error}
                            </div>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="px-6 py-4">
                    <div className="font-mono text-[8px] text-text3 leading-relaxed tracking-[0.5px]">
                        <p className="mb-2">Your subscription is tied to your account. If you switch devices, use the RESTORE PURCHASES button to regain access.</p>
                        <p>For billing inquiries or to manage your subscription, visit your app store account settings.</p>
                    </div>
                </div>

                {/* Close */}
                <div className="px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full bg-surface border border-border text-text3 font-mono text-[10px] tracking-[1px] uppercase py-3 hover:text-white hover:border-text3 transition-colors"
                    >
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    )
}
