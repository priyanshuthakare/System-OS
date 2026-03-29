import { create } from 'zustand'
import { supabase } from '../lib/supabase'

/**
 * @intent Global auth state store managing Supabase sessions
 * @param {object} state
 * @param {object|null} state.user - The current Supabase user object
 * @param {object|null} state.profile - The user's profile row from public.profiles
 * @param {boolean} state.loading - Whether the auth check is still in progress
 * @param {boolean} state.isOnboarded - Whether the user has completed onboarding (has states)
 * @param {boolean} state.needsEmailConfirmation - Whether signup is pending email verification
 * @param {string|null} state.pendingEmail - Email awaiting verification
 */
export const useAuthStore = create((set, get) => ({
    user: null,
    profile: null,
    loading: true,
    isOnboarded: false,
    needsEmailConfirmation: false,
    pendingEmail: null,

    /** Initialize auth listener — call once in App.jsx */
    init: async () => {
        // 1. Check existing session
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
            set({ user: session.user })
            await get().fetchProfile(session.user)
        }
        set({ loading: false })

        // 2. Listen for auth changes (login/logout/token refresh/OAuth callback)
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                set({ user: session.user, needsEmailConfirmation: false, pendingEmail: null })
                await get().fetchProfile(session.user)
            } else if (event === 'SIGNED_OUT') {
                set({ user: null, profile: null, isOnboarded: false, needsEmailConfirmation: false, pendingEmail: null })
            }
        })
    },

    fetchProfile: async (user) => {
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileError) {
                console.error('Failed to fetch profile:', profileError.message)
            }

            const { count, error: countError } = await supabase
                .from('states')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (countError) {
                console.error('Failed to count states:', countError.message)
            }

            set({
                user,
                profile: profile || { id: user.id, has_seen_guide: false },
                isOnboarded: (count || 0) > 0
            })
        } catch (e) {
            console.error('fetchProfile crashed:', e)
            set({ user, profile: { id: user.id, has_seen_guide: false }, isOnboarded: false })
        }
    },

    signUp: async (email, password, displayName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } }
        })
        if (error) throw error

        // Supabase returns user but no session when email confirmation is required
        if (data.user && !data.session) {
            set({ needsEmailConfirmation: true, pendingEmail: email })
            return { confirmationRequired: true }
        }

        // If email confirmation is disabled in Supabase (auto-confirm), session exists immediately
        return { confirmationRequired: false }
    },

    signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw error
        return data
    },

    /**
     * @intent Triggers Google OAuth flow. On web, opens a redirect.
     * On Android (Capacitor), this will handle via the system browser.
     */
    signInWithGoogle: async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'select_account',
                }
            }
        })
        if (error) throw error
        return data
    },

    signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isOnboarded: false, needsEmailConfirmation: false, pendingEmail: null })
    },

    clearConfirmationState: () => {
        set({ needsEmailConfirmation: false, pendingEmail: null })
    },

    setOnboarded: () => {
        set({ isOnboarded: true })
    },

    markGuideSeen: async () => {
        set(state => ({ profile: { ...state.profile, has_seen_guide: true } }))
        try {
            const userId = get().user?.id
            if (!userId) return
            const { error } = await supabase
                .from('profiles')
                .update({ has_seen_guide: true })
                .eq('id', userId)
            if (error) console.error('Failed to persist guide seen:', error.message)
        } catch (e) {
            console.error('markGuideSeen sync failed:', e)
        }
    }
}))
