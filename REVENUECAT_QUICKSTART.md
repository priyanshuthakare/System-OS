# RevenueCat Quick Start

## 1. Set Environment Variable

Add to `.env.local`:
```env
VITE_REVENUECAT_API_KEY=test_AjBACpJpHSDHggUCpRlxWBkzUHB
```

## 2. Configure RevenueCat Dashboard

1. Go to https://app.revenuecat.com
2. Create an app
3. Add products to your app store (App Store Connect or Google Play)
4. Create an offering with packages:
   - `monthly`
   - `yearly`
   - `lifetime`
5. Create entitlement: `System OS Pro`
6. Link packages to entitlement

## 3. Use in Your App

### Check if User is Pro
```javascript
import { useRevenueCat } from '@/hooks/useRevenueCat'

function MyComponent() {
    const { isPro } = useRevenueCat()
    return <div>{isPro ? 'Pro' : 'Free'}</div>
}
```

### Show Paywall
```javascript
import { useState } from 'react'
import RevenueCatPaywall from '@/components/ui/RevenueCatPaywall'

function UpgradeButton() {
    const [show, setShow] = useState(false)
    return (
        <>
            <button onClick={() => setShow(true)}>Upgrade</button>
            {show && <RevenueCatPaywall onClose={() => setShow(false)} />}
        </>
    )
}
```

### Show Customer Center
```javascript
import { useState } from 'react'
import RevenueCatCustomerCenter from '@/components/ui/RevenueCatCustomerCenter'

function Settings() {
    const [show, setShow] = useState(false)
    return (
        <>
            <button onClick={() => setShow(true)}>Manage Subscription</button>
            {show && <RevenueCatCustomerCenter onClose={() => setShow(false)} />}
        </>
    )
}
```

## 4. Test

1. Run the app: `npm run dev`
2. Click upgrade button to see paywall
3. Test purchase flow
4. Test restore purchases

## 5. Deploy

1. Get production API key from RevenueCat
2. Update `VITE_REVENUECAT_API_KEY` in production
3. Configure platform-specific settings
4. Test on real devices

## Files

- **`src/lib/revenuecat.js`** — SDK wrapper
- **`src/hooks/useRevenueCat.js`** — React hook
- **`src/components/ui/RevenueCatPaywall.jsx`** — Paywall UI
- **`src/components/ui/RevenueCatCustomerCenter.jsx`** — Customer UI
- **`REVENUECAT_INTEGRATION.md`** — Full documentation

## Support

- RevenueCat Docs: https://docs.revenuecat.com
- Full Guide: See `REVENUECAT_INTEGRATION.md`
