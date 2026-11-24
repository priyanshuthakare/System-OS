export function resolveUsername(user, profile) {
    if (typeof profile?.display_name === 'string' && profile.display_name.trim()) return profile.display_name.trim()
    if (typeof user?.user_metadata?.display_name === 'string' && user.user_metadata.display_name.trim()) {
        return user.user_metadata.display_name.trim()
    }
    if (typeof user?.email === 'string' && user.email.includes('@')) {
        return user.email.split('@')[0]
    }
    return user?.id || 'Hunter'
}
