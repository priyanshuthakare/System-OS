import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect, useState } from 'react'

const dns = registerPlugin('FamilyDns')
const android = Capacitor.getPlatform() === 'android'

export default function FamilyFilter() {
    const [status, setStatus] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => {
        if (!android) return
        let mounted = true
        const check = () => dns.status().then(value => mounted && setStatus(value))
            .catch(() => mounted && setStatus(null))
        check()
        window.addEventListener('focus', check)
        document.addEventListener('visibilitychange', check)
        return () => {
            mounted = false
            window.removeEventListener('focus', check)
            document.removeEventListener('visibilitychange', check)
        }
    }, [])
    return <section className="bg-surface border border-border p-4 mb-3 space-y-2 text-sm text-text2">
        <h3 className="text-white font-bold">Block adult content</h3>
        {android && <p role="status">{status?.active ? 'Family DNS active on this network' :
            status?.supported === false ? 'Private DNS requires Android 9 or later.' :
            status ? 'Family DNS not detected on this network' : 'Network status unavailable'}</p>}
        <p>Cloudflare Families filters adult domains on connections that use its resolver. Apps with their own DNS or VPN can bypass it.</p>
        <details open={android && status?.supported && !status.active}>
            <summary className="cursor-pointer text-amber py-2">Set up device filtering</summary>
            <p>On Android 9+, open Network settings, select Private DNS, choose provider hostname and save:</p>
            <code className="block select-all text-white py-2">family.cloudflare-dns.com</code>
            {android && <button className="border border-border px-3 py-2" onClick={() => dns.openSettings().catch(() => setError('Open Settings and search for Private DNS.'))}>Open network settings</button>}
            <p role="status">{error}</p>
            <a className="block underline py-2" href="https://developers.cloudflare.com/1.1.1.1/setup/" target="_blank" rel="noreferrer">Setup for desktop and other devices</a>
        </details>
        <a className="block underline text-amber" href="https://nudity.testcategory.com/" target="_blank" rel="noreferrer">Check with a harmless test domain</a>
        <p className="text-xs">With family filtering active, the test page should be blocked.</p>
    </section>
}
