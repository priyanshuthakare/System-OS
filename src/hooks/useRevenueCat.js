import { useEffect, useState } from 'react'
import {
    initializeRevenueCat,
    setRevenueCatUserId,
    clearRevenueCatUserId,
    getCustomerInfo,
    hasEntitlement,
    getOfferings,
    purchasePackage,
    restorePurchases,
    onCustomerInfoUpdate,
    getProductDetails,
} from '../lib/revenuecat'

/**
 * @intent Hook for managing RevenueCat subscriptions and entitlements
 * @returns {{
 *   initialized: boolean,
 *   loading: boolean,
 *   isPro: boolean,
 *   hasProEntitlement: boolean,
 *   customerInfo: object,
 *   offerings: object,
 *   currentOffering: object,
 *   purchase: function,
 *   restore: function,
 *   getProductDetails: function,
 *   error: string|null
 * }}
 */
export function useRevenueCat() {
    const [initialized, setInitialized] = useState(false)
    const [loading, setLoading] = useState(true)
    const [customerInfo, setCustomerInfo] = useState(null)
    const [offerings, setOfferings] = useState(null)
    const [currentOffering, setCurrentOffering] = useState(null)
    const [error, setError] = useState(null)

    // Initialize RevenueCat on mount
    useEffect(() => {
        const init = async () => {
            try {
                await initializeRevenueCat()
                setInitialized(true)

                // Fetch initial data
                const [info, offeringData] = await Promise.all([
                    getCustomerInfo(),
                    getOfferings(),
                ])

                setCustomerInfo(info)
                setOfferings(offeringData.offerings)
                setCurrentOffering(offeringData.currentOffering)
                setLoading(false)
            } catch (err) {
                console.error('[useRevenueCat] Initialization error:', err)
                setError(err.message)
                setLoading(false)
            }
        }

        init()
    }, [])

    // Set up listener for customer info updates
    useEffect(() => {
        if (!initialized) return

        const unsubscribe = onCustomerInfoUpdate((updatedInfo) => {
            setCustomerInfo(updatedInfo)
        })

        return unsubscribe
    }, [initialized])

    const isPro = customerInfo?.entitlements?.['System OS Pro'] !== undefined
    const hasProEntitlement = isPro

    const purchase = async (packageId, offeringId = null) => {
        try {
            setError(null)
            const result = await purchasePackage(packageId, offeringId)
            if (result.success) {
                // Refresh customer info after purchase
                const updatedInfo = await getCustomerInfo()
                setCustomerInfo(updatedInfo)
            }
            return result
        } catch (err) {
            const errorMsg = err.message || 'Purchase failed'
            setError(errorMsg)
            return { success: false, transaction: null, error: errorMsg }
        }
    }

    const restore = async () => {
        try {
            setError(null)
            const result = await restorePurchases()
            if (result.success) {
                // Refresh customer info after restore
                const updatedInfo = await getCustomerInfo()
                setCustomerInfo(updatedInfo)
            }
            return result
        } catch (err) {
            const errorMsg = err.message || 'Restore failed'
            setError(errorMsg)
            return { success: false, error: errorMsg }
        }
    }

    const getDetails = async (packageId, offeringId = null) => {
        try {
            return await getProductDetails(packageId, offeringId)
        } catch (err) {
            console.error('[useRevenueCat] Failed to get product details:', err)
            return { product: null, error: err.message }
        }
    }

    return {
        initialized,
        loading,
        isPro: hasProEntitlement,
        hasProEntitlement,
        customerInfo,
        offerings,
        currentOffering,
        purchase,
        restore,
        getProductDetails: getDetails,
        error,
    }
}

/**
 * @intent Hook for checking specific entitlements
 * @param {string} entitlementId - Entitlement identifier
 * @returns {{ hasEntitlement: boolean, loading: boolean }}
 */
export function useEntitlement(entitlementId) {
    const [hasEnt, setHasEnt] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const check = async () => {
            try {
                const result = await hasEntitlement(entitlementId)
                setHasEnt(result)
            } catch (err) {
                console.error('[useEntitlement] Check failed:', err)
            } finally {
                setLoading(false)
            }
        }

        check()
    }, [entitlementId])

    return { hasEntitlement: hasEnt, loading }
}
