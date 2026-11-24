import { safeNumber } from '../utils/math'

export function calculatePercentile(rankPosition, totalEntries) {
    const rank = Math.max(1, Math.floor(safeNumber(rankPosition, 1)))
    const total = Math.max(1, Math.floor(safeNumber(totalEntries, 1)))

    if (total === 1) return 100
    return Math.round(((total - rank) / (total - 1)) * 10000) / 100
}

export function resolveMovementIndicator(previousRank, currentRank) {
    const prev = Number(previousRank)
    const current = Number(currentRank)

    if (!Number.isFinite(prev)) return 'new'
    if (!Number.isFinite(current)) return 'stable'
    if (current < prev) return 'up'
    if (current > prev) return 'down'
    return 'stable'
}

export function sortLeaderboardEntries(entries = []) {
    return [...entries].sort((a, b) => {
        const weeklyDiff = safeNumber(b.weekly_score, 0) - safeNumber(a.weekly_score, 0)
        if (weeklyDiff !== 0) return weeklyDiff

        const monthlyDiff = safeNumber(b.monthly_score, 0) - safeNumber(a.monthly_score, 0)
        if (monthlyDiff !== 0) return monthlyDiff

        return safeNumber(b.score, 0) - safeNumber(a.score, 0)
    })
}

export function filterLeaderboardEntries(
    entries = [],
    { type = 'global', friendUserIds = [], category = null } = {}
) {
    if (type === 'friends') {
        const friendSet = new Set(friendUserIds)
        return entries.filter(entry => friendSet.has(entry.user_id))
    }

    if (type === 'category') {
        return entries.filter(entry => (entry.board_scope || entry.category) === category)
    }

    return [...entries]
}

export function buildLeaderboard({
    entries = [],
    previousRanksByUserId = {},
    type = 'global',
    friendUserIds = [],
    category = null
}) {
    const scoped = filterLeaderboardEntries(entries, { type, friendUserIds, category })
    const sorted = sortLeaderboardEntries(scoped)
    const total = sorted.length

    return sorted.map((entry, index) => {
        const rank = index + 1
        const previousRank = previousRanksByUserId[entry.user_id]
        return {
            ...entry,
            rank,
            percentile: calculatePercentile(rank, total),
            movement: resolveMovementIndicator(previousRank, rank)
        }
    })
}
