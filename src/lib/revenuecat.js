import { Purchases } from '@revenuecat/purchases-capacitor'
import { Capacitor } from '@capacitor/core'

const API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY

if (!API_KEY) {
    console.warn('[RevenueCat] Missing VITE_REVENUECAT_API_KEY. Subscriptions will not work.')
}

/**
 * @intent Initialize RevenueCat SDK with API key and configure logging
 * @returns {Promise<void>}
 */
export async function initializeRevenueCat() {
    try {
        if (!API_KEY) {
            console.warn('[RevenueCat] Skipping initialization — no API key configured')
            return
        }

        // Configure logging for development
        if (import.meta.env.DEV) {
            await Purchases.setLogLevel({ level: 'debug' })
        }

        // Initialize with API key
        await Purchases.configure({
            apiKey: API_KEY,
            appUserID: null, // Let RevenueCat generate anonymous ID initially
        })

        console.log('[RevenueCat] Initialized successfully')
    } catch (error) {
        console.error('[RevenueCat] Initialization failed:', error)
    }
}

/**
 * @intent Set the user ID for RevenueCat (call after auth)
 * @param {string} userId - Supabase user ID
 * @returns {Promise<void>}
 */
export async function setRevenueCatUserId(userId) {
    try {
        if (!API_KEY) return
        await Purchases.logIn({ appUserID: userId })
        console.log('[RevenueCat] User ID set:', userId)
    } catch (error) {
        console.error('[RevenueCat] Failed to set user ID:', error)
    }
}

/**
 * @intent Clear user ID on logout
 * @returns {Promise<void>}
 */
export async function clearRevenueCatUserId() {
    try {
        if (!API_KEY) return
        await Purchases.logOut()
        console.log('[RevenueCat] User logged out')
    } catch (error) {
        console.error('[RevenueCat] Failed to log out:', error)
    }
}

/**
 * @intent Fetch current customer info and entitlements
 * @returns {Promise<{entitlements: object, activeSubscriptions: string[], allPurchasedProductIds: string[]}>}
 */
export async function getCustomerInfo() {
    try {
        if (!API_KEY) {
            return { entitlements: {}, activeSubscriptions: [], allPurchasedProductIds: [] }
        }

        const customerInfo = await Purchases.getCustomerInfo()

        return {
            entitlements: customerInfo.entitlements?.active || {},
            activeSubscriptions: customerInfo.activeSubscriptions || [],
            allPurchasedProductIds: customerInfo.allPurchasedProductIds || [],
            originalAppUserId: customerInfo.originalAppUserId,
            originalApplicationVersion: customerInfo.originalApplicationVersion,
            requestDate: customerInfo.requestDate,
            firstSeen: customerInfo.firstSeen,
            latestExpirationDate: customerInfo.latestExpirationDate,
        }
    } catch (error) {
        console.error('[RevenueCat] Failed to fetch customer info:', error)
        return { entitlements: {}, activeSubscriptions: [], allPurchasedProductIds: [] }
    }
}

/**
 * @intent Check if user has a specific entitlement
 * @param {string} entitlementId - e.g., 'System OS Pro'
 * @returns {Promise<boolean>}
 */
export async function hasEntitlement(entitlementId) {
    try {
        const { entitlements } = await getCustomerInfo()
        return !!entitlements[entitlementId]
    } catch (error) {
        console.error('[RevenueCat] Failed to check entitlement:', error)
        return false
    }
}

/**
 * @intent Fetch available offerings and products
 * @returns {Promise<{offerings: object, currentOffering: object|null}>}
 */
export async function getOfferings() {
    try {
        if (!API_KEY) {
            return { offerings: {}, currentOffering: null }
        }

        const offerings = await Purchases.getOfferings()

        return {
            offerings: offerings.all || {},
            currentOffering: offerings.current || null,
        }
    } catch (error) {
        console.error('[RevenueCat] Failed to fetch offerings:', error)
        return { offerings: {}, currentOffering: null }
    }
}

/**
 * @intent Purchase a product
 * @param {string} packageId - Package identifier (e.g., 'monthly', 'yearly', 'lifetime')
 * @param {string} offeringId - Offering identifier (optional, uses current if not provided)
 * @returns {Promise<{success: boolean, transaction: object|null, error: string|null}>}
 */
export async function purchasePackage(packageId, offeringId = null) {
    try {
        if (!API_KEY) {
            return { success: false, transaction: null, error: 'RevenueCat not configured' }
        }

        const offerings = await getOfferings()
        let targetOffering = offerings.currentOffering

        if (offeringId && offerings.offerings[offeringId]) {
            targetOffering = offerings.offerings[offeringId]
        }

        if (!targetOffering) {
            return { success: false, transaction: null, error: 'No offering available' }
        }

        const targetPackage = targetOffering.availablePackages?.find(p => p.identifier === packageId)
        if (!targetPackage) {
            return { success: false, transaction: null, error: `Package ${packageId} not found` }
        }

        const result = await Purchases.purchasePackage({ aPackage: targetPackage })

        return {
            success: true,
            transaction: result.transaction,
            error: null,
        }
    } catch (error) {
        console.error('[RevenueCat] Purchase failed:', error)
        return {
            success: false,
            transaction: null,
            error: error.message || 'Purchase failed',
        }
    }
}

/**
 * @intent Restore purchases (for users switching devices)
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function restorePurchases() {
    try {
        if (!API_KEY) {
            return { success: false, error: 'RevenueCat not configured' }
        }

        await Purchases.restorePurchases()
        console.log('[RevenueCat] Purchases restored')
        return { success: true, error: null }
    } catch (error) {
        console.error('[RevenueCat] Restore failed:', error)
        return { success: false, error: error.message || 'Restore failed' }
    }
}

/**
 * @intent Set up listener for customer info updates
 * @param {function} callback - Called with updated customer info
 * @returns {function} Unsubscribe function
 */
export function onCustomerInfoUpdate(callback) {
    try {
        if (!API_KEY) return () => {}

        const listener = Purchases.addCustomerInfoUpdateListener(({ customerInfo }) => {
            callback(customerInfo)
        })

        return () => {
            if (listener?.remove) listener.remove()
        }
    } catch (error) {
        console.error('[RevenueCat] Failed to set up listener:', error)
        return () => {}
    }
}

/**
 * @intent Get product details for display
 * @param {string} packageId - Package identifier
 * @param {string} offeringId - Offering identifier (optional)
 * @returns {Promise<{product: object|null, error: string|null}>}
 */
export async function getProductDetails(packageId, offeringId = null) {
    try {
        const offerings = await getOfferings()
        let targetOffering = offerings.currentOffering

        if (offeringId && offerings.offerings[offeringId]) {
            targetOffering = offerings.offerings[offeringId]
        }

        if (!targetOffering) {
            return { product: null, error: 'No offering available' }
        }

        const targetPackage = targetOffering.availablePackages?.find(p => p.identifier === packageId)
        if (!targetPackage) {
            return { product: null, error: `Package ${packageId} not found` }
        }

        return {
            product: {
                identifier: targetPackage.identifier,
                title: targetPackage.product?.title,
                description: targetPackage.product?.description,
                price: targetPackage.product?.priceString,
                currencyCode: targetPackage.product?.currencyCode,
                introductoryPrice: targetPackage.product?.introductoryPrice,
                introductoryPriceString: targetPackage.product?.introductoryPriceString,
                introductoryPricePeriod: targetPackage.product?.introductoryPricePeriod,
            },
            error: null,
        }
    } catch (error) {
        console.error('[RevenueCat] Failed to get product details:', error)
        return { product: null, error: error.message }
    }
}
