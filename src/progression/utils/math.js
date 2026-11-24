export function safeNumber(value, fallback = 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

export function clamp(value, minValue, maxValue) {
    const numericValue = safeNumber(value, minValue)
    return Math.min(Math.max(numericValue, minValue), maxValue)
}

export function roundToInt(value) {
    return Math.round(safeNumber(value, 0))
}

export function sumBy(items, valueGetter) {
    if (!Array.isArray(items) || typeof valueGetter !== 'function') return 0
    return items.reduce((sum, item) => sum + safeNumber(valueGetter(item), 0), 0)
}

export function weightedDistribution(totalValue, weightedMap) {
    const amount = safeNumber(totalValue, 0)
    if (amount <= 0 || !weightedMap || typeof weightedMap !== 'object') return {}

    const entries = Object.entries(weightedMap)
        .map(([key, rawWeight]) => [key, safeNumber(rawWeight, 0)])
        .filter(([, weight]) => weight > 0)

    const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
    if (totalWeight <= 0) return {}

    const distribution = {}
    for (const [key, weight] of entries) {
        distribution[key] = amount * (weight / totalWeight)
    }
    return distribution
}
