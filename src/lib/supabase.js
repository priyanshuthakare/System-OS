import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local and fill in your Supabase project credentials.'
    )
}

/**
 * @intent Singleton Supabase client for auth and data sync.
 * - flowType: 'pkce' — ensures signInWithOAuth produces a ?code= param in the
 *   redirect URL that exchangeCodeForSession can consume on Android.
 * - detectSessionInUrl: false on native — we handle the deep-link URL manually
 *   via App.addListener('appUrlOpen'). Leaving this on causes the client to
 *   auto-process URLs and can conflict with our explicit handler.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        flowType: 'pkce',
        detectSessionInUrl: !Capacitor.isNativePlatform(),
    },
})
