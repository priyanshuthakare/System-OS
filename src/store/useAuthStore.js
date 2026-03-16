import { create } from 'zustand'
import { supabase } from '../lib/supabase'

/**
 * @intent Global auth state store managing Supabase sessions
 * @param {object} state
 * @param {object|null} state.user - The current Supabase user object
 * @param {object|null} state.profile - The user's profile row from public.profiles
 * @param {boolean} state.loading - Whether the auth check is still in progress
 * @param {boolean} state.isOnboarded - Whether the user has completed onboarding (has states)
 */
export const useAuthStore = create((set, get) => ({
    user: null,
    profile: null,
    loading: true,
    isOnboarded: false,

    /** Initialize auth listener — call once in App.jsx */
    init: async () => {
        // 1. Check existing session
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
            set({ user: session.user })
            await get().fetchProfile(session.user)
        }
        set({ loading: false })

        // 2. Listen for auth changes (login/logout/token refresh)
        supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                set({ user: session.user })
                await get().fetchProfile(session.user)
            } else {
                set({ user: null, profile: null, isOnboarded: false })
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

            // Check if user has created any states (onboarding complete)
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
            // Still set user so the app doesn't get stuck on loading
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
        return data
    },

    signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw error
        return data
    },

    signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isOnboarded: false })
    },

    /** Mark onboarding as complete (called after state creation) */
    setOnboarded: () => {
        set({ isOnboarded: true })
    },

    /** Dismiss the guide overlay permanently */
    markGuideSeen: async () => {
        // Optimistic update — immediately hide the overlay
        set(state => ({ profile: { ...state.profile, has_seen_guide: true } }))

        // Then sync to Supabase in the background
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
