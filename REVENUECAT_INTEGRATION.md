# RevenueCat Integration Guide

## Overview

This document provides a complete guide to the RevenueCat SDK integration in System OS. RevenueCat handles all subscription management, entitlement checking, and customer data for the System OS Pro tier.

## Setup

### 1. Environment Configuration

Add your RevenueCat API key to `.env.local`:

```bash
VITE_REVENUECAT_API_KEY=test_AjBACpJpHSDHggUCpRlxWBkzUHB
```

The test key is provided for development. For production, use your production API key from the RevenueCat dashboard.

### 2. Installation

The RevenueCat SDK is already installed:

```bash
npm install @revenuecat/purchases-capacitor @revenuecat/purchases-capacitor-ui
```

## Architecture

### Core Files

- **`src/lib/revenuecat.js`** — Low-level RevenueCat API wrapper
  - Initialization and configuration
  - Customer info retrieval
  - Purchase and restore flows
  - Entitlement checking
  - Product details fetching

- **`src/hooks/useRevenueCat.js`** — React hook for subscription management
  - Manages RevenueCat state
  - Handles purchase flow
  - Tracks entitlements
  - Provides customer info

- **`src/components/ui/RevenueCatPaywall.jsx`** — Paywall UI component
  - Product selection (monthly, yearly, lifetime)
  - Purchase flow with error handling
  - Restore purchases functionality
  - Shows active subscription status

- **`src/components/ui/RevenueCatCustomerCenter.jsx`** — Customer management UI
  - View subscription status
  - Restore purchases
  - Account information
  - Subscription history

- **`src/components/ui/ProUpgradeModal.jsx`** — Wrapper component
  - Delegates to RevenueCat paywall
  - Used throughout the app for upgrade prompts

### Integration Points

#### Auth Store (`src/store/useAuthStore.js`)

When a user signs in, their Supabase user ID is synced with RevenueCat:

```javascript
await setRevenueCatUserId(session.user.id)
```

On logout, the RevenueCat user ID is cleared:

```javascript
await clearRevenueCatUserId()
```

#### Tier Guard (`src/hooks/useTierGuard.js`)

The existing tier guard checks the local `tier_status` field in the profiles table. To integrate with RevenueCat entitlements, update it to check RevenueCat:

```javascript
const { isPro } = useRevenueCat()
const isPro = tier === 'pro' || tier === 'lifetime' || hasProEntitlement
```

## Usage

### Checking Entitlements

```javascript
import { useRevenueCat } from '@/hooks/useRevenueCat'

function MyComponent() {
    const { isPro, loading } = useRevenueCat()

    if (loading) return <div>Loading...</div>

    return (
        <div>
            {isPro ? (
                <p>You have Pro access!</p>
            ) : (
                <p>Upgrade to Pro</p>
            )}
        </div>
    )
}
```

### Showing the Paywall

```javascript
import { useState } from 'react'
import RevenueCatPaywall from '@/components/ui/RevenueCatPaywall'

function MyComponent() {
    const [showPaywall, setShowPaywall] = useState(false)

    return (
        <>
            <button onClick={() => setShowPaywall(true)}>
                Upgrade to Pro
            </button>

            {showPaywall && (
                <RevenueCatPaywall
                    onClose={() => setShowPaywall(false)}
                    onSuccess={() => {
                        console.log('Purchase successful!')
                        setShowPaywall(false)
                    }}
                />
            )}
        </>
    )
}
```

### Accessing Customer Info

```javascript
import { useRevenueCat } from '@/hooks/useRevenueCat'

function MyComponent() {
    const { customerInfo, isPro } = useRevenueCat()

    return (
        <div>
            <p>Pro Status: {isPro ? 'Active' : 'Inactive'}</p>
            <p>Active Subscriptions: {customerInfo?.activeSubscriptions?.length || 0}</p>
            <p>Expiration: {customerInfo?.latestExpirationDate}</p>
        </div>
    )
}
```

### Restoring Purchases

```javascript
import { useRevenueCat } from '@/hooks/useRevenueCat'

function MyComponent() {
    const { restore, loading } = useRevenueCat()

    const handleRestore = async () => {
        const result = await restore()
        if (result.success) {
            console.log('Purchases restored!')
        } else {
            console.error('Restore failed:', result.error)
        }
    }

    return (
        <button onClick={handleRestore} disabled={loading}>
            Restore Purchases
        </button>
    )
}
```

## Product Configuration

### Offerings and Packages

RevenueCat uses a hierarchy:
- **Offering** — A collection of packages (e.g., "default")
- **Package** — A specific product (e.g., "monthly", "yearly", "lifetime")
- **Product** — The underlying App Store/Play Store product

### Setting Up Products

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create products in your app store (App Store Connect or Google Play Console)
3. In RevenueCat, create an offering with packages:
   - **monthly** — Monthly subscription
   - **yearly** — Annual subscription (recommended for best value)
   - **lifetime** — One-time purchase

4. Link products to packages in RevenueCat

### Entitlements

Create an entitlement in RevenueCat:
- **ID**: `System OS Pro`
- **Display Name**: System OS Pro
- Link all packages (monthly, yearly, lifetime) to this entitlement

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `PurchaseCancelledError` | User cancelled purchase | Gracefully handle, don't show error |
| `ProductNotAvailableError` | Product not found in store | Check product configuration |
| `NetworkError` | No internet connection | Retry with exponential backoff |
| `InvalidCredentialsError` | Invalid API key | Check `.env.local` configuration |

### Error Handling Pattern

```javascript
const { purchase, error } = useRevenueCat()

const handlePurchase = async (packageId) => {
    try {
        const result = await purchase(packageId)
        if (result.success) {
            // Success
        } else {
            // Handle error
            console.error(result.error)
        }
    } catch (err) {
        // Network or unexpected error
        console.error(err)
    }
}
```

## Best Practices

### 1. Initialize Early

RevenueCat should be initialized as early as possible in the app lifecycle. It's currently initialized in `useRevenueCat` hook on first use.

### 2. Cache Customer Info

The `useRevenueCat` hook caches customer info and updates it when purchases are made. Avoid calling `getCustomerInfo()` repeatedly.

### 3. Handle Offline

RevenueCat gracefully handles offline scenarios. Purchases are queued and synced when connection is restored.

### 4. Test Purchases

Use RevenueCat's sandbox environment for testing:
- iOS: Use sandbox Apple ID
- Android: Use test Google Play account

### 5. Monitor Entitlements

Set up a listener for entitlement changes:

```javascript
useEffect(() => {
    const unsubscribe = onCustomerInfoUpdate((customerInfo) => {
        console.log('Entitlements updated:', customerInfo.entitlements)
    })
    return unsubscribe
}, [])
```

## Debugging

### Enable Debug Logging

In development, debug logging is automatically enabled. Check browser console for RevenueCat logs.

### Check Customer Info

```javascript
const { customerInfo } = useRevenueCat()
console.log('Customer Info:', customerInfo)
```

### Verify Entitlements

```javascript
const { isPro, customerInfo } = useRevenueCat()
console.log('Has Pro:', isPro)
console.log('Entitlements:', customerInfo?.entitlements)
```

## Migration from Local Tier System

The app currently uses a local `tier_status` field in the profiles table. To fully migrate to RevenueCat:

1. **Update `useTierGuard.js`** to check RevenueCat entitlements
2. **Sync tier status** — Optionally sync RevenueCat entitlements back to Supabase for offline access
3. **Update tier checks** — Replace local tier checks with RevenueCat checks

Example migration:

```javascript
// Before
const isPro = profile?.tier_status === 'pro'

// After
const { isPro } = useRevenueCat()
```

## API Reference

### `src/lib/revenuecat.js`

#### `initializeRevenueCat()`
Initializes the RevenueCat SDK with the API key.

#### `setRevenueCatUserId(userId)`
Associates a user ID with RevenueCat (call after auth).

#### `clearRevenueCatUserId()`
Clears the user ID (call on logout).

#### `getCustomerInfo()`
Returns current customer info and entitlements.

#### `hasEntitlement(entitlementId)`
Checks if user has a specific entitlement.

#### `getOfferings()`
Fetches available offerings and packages.

#### `purchasePackage(packageId, offeringId?)`
Initiates a purchase flow.

#### `restorePurchases()`
Restores purchases from the app store.

#### `getProductDetails(packageId, offeringId?)`
Gets product details (price, title, etc.).

### `src/hooks/useRevenueCat.js`

#### `useRevenueCat()`
Main hook for subscription management.

**Returns:**
```javascript
{
    initialized: boolean,
    loading: boolean,
    isPro: boolean,
    hasProEntitlement: boolean,
    customerInfo: object,
    offerings: object,
    currentOffering: object,
    purchase: (packageId, offeringId?) => Promise,
    restore: () => Promise,
    getProductDetails: (packageId, offeringId?) => Promise,
    error: string | null
}
```

#### `useEntitlement(entitlementId)`
Hook for checking a specific entitlement.

**Returns:**
```javascript
{
    hasEntitlement: boolean,
    loading: boolean
}
```

## Support

For issues or questions:
1. Check [RevenueCat Documentation](https://docs.revenuecat.com)
2. Review [RevenueCat SDK Reference](https://docs.revenuecat.com/docs/capacitor)
3. Check browser console for error messages
4. Contact RevenueCat support at support@revenuecat.com

## Testing Checklist

- [ ] API key configured in `.env.local`
- [ ] RevenueCat SDK initializes without errors
- [ ] Paywall displays correctly
- [ ] Product selection works
- [ ] Purchase flow completes
- [ ] Entitlements update after purchase
- [ ] Restore purchases works
- [ ] Customer info displays correctly
- [ ] Offline mode gracefully degrades
- [ ] Error messages display appropriately
