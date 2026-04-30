import { useState } from 'react'
import RevenueCatPaywall from './RevenueCatPaywall'

/**
 * @intent Wrapper that delegates to RevenueCat paywall
 * @param {{ onClose: function, onSuccess: function }} props
 */
export default function ProUpgradeModal({ onClose, onSuccess }) {
    return (
        <RevenueCatPaywall
            onClose={onClose}
            onSuccess={onSuccess}
        />
    )
}
