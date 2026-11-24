import { db } from '../../lib/db'
import { supabase } from '../../lib/supabase'

function createId(prefix) {
    if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function nowIso() {
    return new Date().toISOString()
}

async function applyOutboxEventToRemote(event) {
    const payload = event?.payload || {}

    if (event.event_type === 'task_completion') {
        const row = {
            id: payload.id || event.id,
            user_id: payload.userId,
            task_id: payload.taskId,
            completed_at: payload.completedAt,
            day_key: payload.dayKey,
            xp_awarded: payload.xpAwarded,
            repetition_count_same_day: payload.repetitionCountSameDay ?? 0,
            bonus_applied: payload.bonusApplied ?? null
        }
        const { error } = await supabase.from('task_logs').upsert(row, { onConflict: 'id', ignoreDuplicates: true })
        if (error) throw error
        return
    }

    if (event.event_type === 'leaderboard_snapshot') {
        const snapshot = payload
        const row = {
            id: snapshot.id || event.id,
            user_id: snapshot.user_id,
            username: snapshot.username || null,
            rank_label: snapshot.rank_label || null,
            level: snapshot.level || 1,
            score: snapshot.score,
            weekly_score: snapshot.weekly_score,
            monthly_score: snapshot.monthly_score,
            captured_at: snapshot.captured_at,
            board_type: snapshot.board_type || 'global',
            board_scope: snapshot.board_scope || 'global'
        }
        const { error } = await supabase.from('leaderboard_snapshots').upsert(row, { onConflict: 'id' })
        if (error) throw error
        return
    }

    if (event.event_type === 'title_unlock') {
        const userId = payload.userId
        const titles = Array.isArray(payload.titles) ? payload.titles : []
        if (!userId || !titles.length) return

        const rows = titles.map(titleName => ({
            id: `${event.id}:${titleName}`,
            user_id: userId,
            name: titleName,
            unlock_condition: { type: 'remote_event', source_event_id: event.id },
            unlocked_at: event.created_at || nowIso()
        }))

        const { error } = await supabase.from('titles').upsert(rows, { onConflict: 'id' })
        if (error) throw error
        return
    }

    if (event.event_type === 'boss_completion') {
        const row = {
            id: payload.attemptId || event.id,
            user_id: payload.userId,
            boss_id: payload.bossId,
            status: 'completed',
            reward_xp: payload.rewardXp || 0,
            reward_rank_boost: payload.rewardRankBoost || 0,
            completed_at: event.created_at || nowIso()
        }
        const { error } = await supabase.from('boss_attempts').upsert(row, { onConflict: 'id' })
        if (error) throw error
    }
}

async function markOutboxEventSynced(eventId, atIso) {
    const current = await db.sync_outbox.get(eventId)
    if (!current) return
    await db.sync_outbox.put({
        ...current,
        status: 'synced',
        attempts: Number(current.attempts || 0) + 1,
        last_attempt_at: atIso,
        last_error: null
    })
}

async function markOutboxEventFailed(eventId, atIso, errorMessage) {
    const current = await db.sync_outbox.get(eventId)
    if (!current) return
    await db.sync_outbox.put({
        ...current,
        status: 'failed',
        attempts: Number(current.attempts || 0) + 1,
        last_attempt_at: atIso,
        last_error: errorMessage
    })
}

export async function syncOutbox({ maxAttempts = 5, batchSize = 30 } = {}) {
    const events = await db.sync_outbox
        .where('status')
        .anyOf(['pending', 'failed'])
        .sortBy('created_at')

    const candidates = events
        .filter(event => Number(event.attempts || 0) < Number(maxAttempts))
        .slice(0, batchSize)

    let synced = 0
    let failed = 0

    for (const event of candidates) {
        const atIso = nowIso()
        try {
            await applyOutboxEventToRemote(event)
            await markOutboxEventSynced(event.id, atIso)
            synced += 1
        } catch (error) {
            const msg = error?.message || String(error)
            if (msg.includes('schema cache') || msg.includes('404') || msg.includes('relation') || msg.includes('does not exist')) {
                await markOutboxEventFailed(event.id, atIso, 'table_not_found')
            } else {
                await markOutboxEventFailed(event.id, atIso, msg)
            }
            failed += 1
        }
    }

    return { attempted: candidates.length, synced, failed }
}

export async function pullRemoteLeaderboardSnapshots({ limit = 200 } = {}) {
    try {
        const { data, error } = await supabase
            .from('leaderboard_snapshots')
            .select('*')
            .order('captured_at', { ascending: false })
            .limit(limit)

        if (error) {
            if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
                return { fetched: 0, skipped: true }
            }
            throw error
        }

        const rows = (data || []).map(row => ({
            id: row.id || createId('leaderboard_remote'),
            user_id: row.user_id,
            username: row.username || null,
            rank_label: row.rank_label || null,
            level: row.level || 1,
            score: row.score,
            weekly_score: row.weekly_score,
            monthly_score: row.monthly_score,
            captured_at: row.captured_at,
            board_type: row.board_type || 'global',
            board_scope: row.board_scope || 'global'
        }))

        if (rows.length) {
            await db.leaderboard_snapshots.bulkPut(rows)
        }

        return { fetched: rows.length }
    } catch {
        return { fetched: 0 }
    }
}

export async function runProgressionSync({
    outboxBatchSize = 30,
    outboxMaxAttempts = 5,
    leaderboardLimit = 200
} = {}) {
    const outboxResult = await syncOutbox({
        maxAttempts: outboxMaxAttempts,
        batchSize: outboxBatchSize
    })

    const leaderboardResult = await pullRemoteLeaderboardSnapshots({
        limit: leaderboardLimit
    })

    return { outbox: outboxResult, leaderboard: leaderboardResult }
}
