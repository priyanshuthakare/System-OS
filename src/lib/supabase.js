import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const SUPABASE_URL = 'https://ixpsvjihxflhmvvapwzj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cHN2amloeGZsaG12dmFwd3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTQ2MDMsImV4cCI6MjA4OTE3MDYwM30.RkpEfoC11Hb__tmaeQyh_Xypy5EuCXP0SSZqDaZ-psg'

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
