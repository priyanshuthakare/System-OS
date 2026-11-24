import { resolveUsername } from '../../lib/username'
import DeviceScore from './DeviceScore'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'

const button = 'min-h-10 px-3 border border-border text-sm text-white hover:border-amber'

export default function WeeklyBoard() {
    const user = useAuthStore(s => s.user)
    const profile = useAuthStore(s => s.profile)
    const id = user?.id
    const username = resolveUsername(user, profile)
    const [friends, setFriends] = useState(false)
    const [revision, refresh] = useState(0)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [links, setLinks] = useState([])
    const [linksError, setLinksError] = useState('')
    const [code, setCode] = useState('')
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState('')
    useEffect(() => {
        let active = true
        setData(null)
        setError('')
        async function load() {
            const board = await supabase.rpc('weekly_board', {friends_only: friends})
            if (!friends && ['PGRST202','42883'].includes(board.error?.code)) {
                const since = new Date(Date.now() - 7 * 86400000).toISOString()
                const snapshots = await supabase.from('leaderboard_snapshots')
                    .select('user_id,username,weekly_score,captured_at')
                    .gte('captured_at', since).order('captured_at', {ascending:false}).limit(200)
                if (snapshots.error) throw snapshots.error
                const latest = new Map()
                for (const row of snapshots.data) {
                    if (!latest.has(row.user_id)) latest.set(row.user_id, {...row, points:row.weekly_score})
                }
                const rows = [...latest.values()].sort((a,b) => b.points - a.points).slice(0,10)
                if (active) setData({board:rows, snapshots:true})
                return
            }
            if (board.error) throw board.error
            if (active) setData({board: board.data})
        }
        load().catch(e => {
            if (!active) return
            const missing = ['PGRST202','PGRST205','42P01','42883'].includes(e.code)
            setError(missing ? (friends ? 'Friends ranking is awaiting the server update.' : 'Shared scores are awaiting the server update.')
                : 'Live standings are unavailable right now.')
        })
        const online = () => refresh(n => n + 1)
        window.addEventListener('online', online)
        return () => { active = false; window.removeEventListener('online', online) }
    }, [friends, id, revision])

    useEffect(() => {
        let active = true
        setLinks([])
        setLinksError('')
        if (friends && id) {
            async function loadConnections() {
                const result = await supabase.from('friendships').select('sender,recipient,accepted')
                if (result.error) throw result.error
                if (active) setLinks(result.data || [])
            }
            loadConnections().catch(e => {
                if (active) setLinksError(['PGRST205','42P01'].includes(e.code)
                    ? 'Friend requests require the server update. You can share your code now.'
                    : 'Could not load existing connections.')
            })
        }
        return () => { active = false }
    }, [friends, id, revision])

    async function change(query, message) {
        setBusy(true)
        setNotice('')
        try {
            const { error } = await query
            if (error) throw error
            setNotice(message)
            setCode('')
            refresh(n => n + 1)
        } catch (e) {
            setNotice(['PGRST205','42P01'].includes(e.code) ? 'Request could not be sent until the server is updated.' : e.code === '23505' ? 'A connection or request already exists.' :
                'Could not save. Check the friend code and try again.')
        } finally { setBusy(false) }
    }
    return <section className="bg-surface border border-border p-4 mb-5 space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-condensed text-2xl text-white">Weekly leaderboard</h2>
            <button className={button} onClick={() => refresh(n => n + 1)}>Refresh</button></div>
        <p className="text-text2 text-sm">{data?.snapshots ? 'Latest reported weekly XP from recent shared scores.' : 'XP from tasks synced in the last seven days.'}</p>
        <div className="flex gap-2">{['Everyone','Friends'].map((label,i) =>
            <button key={label} aria-pressed={friends === Boolean(i)} className={button + (friends === Boolean(i) ? ' bg-amber/20 border-amber' : '')}
                onClick={() => {setFriends(Boolean(i)); setNotice('')}}>{label}</button>)}</div>
        {(error || data?.snapshots) && <DeviceScore userId={id} username={username}/> }
        <div aria-live="polite" className="text-sm">{error || (!data ? 'Loading standings…' : !data.board.length ? 'No scores yet. Complete a task to join the board.' :
            <ol>{data.board.map(row => <li key={row.user_id} className="flex gap-3 items-center py-2 border-b border-border">
                {row.board_rank != null && <span className="text-text2">#{row.board_rank}</span>}<span className="flex-1 truncate">{row.user_id === id ? username : row.username || 'Player ' + row.user_id.slice(0,8)}</span>
                <strong className="text-amber">{Math.round(row.points)} XP</strong></li>)}</ol>)}</div>
        {!friends && <button type="button" className={button} onClick={() => setFriends(true)}>Add friend</button>}
        {friends && <div className="space-y-3 border-t border-border pt-3">
            <h3 className="text-white font-bold">Add friend</h3>
            <p className="text-sm">Share your friend code</p><code className="block break-all select-all text-xs text-amber">{id}</code>
            <form className="flex flex-wrap gap-2" onSubmit={e => {
                e.preventDefault()
                change(supabase.from('friendships').insert({sender:id,recipient:code.trim()}),'Request sent.')
            }}><input aria-label="Friend code" placeholder="Paste a friend code" value={code} onChange={e=>setCode(e.target.value)}
                className="min-w-0 flex-1 bg-black border border-border px-2 text-sm" />
                <button className={button} disabled={busy || code.trim().toLowerCase() === id || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(code.trim())}>Send request</button></form>
            {linksError && <p className="text-sm text-text2">{linksError}</p>}
            {links.map(link => {
                const incoming = link.recipient === id
                const other = incoming ? link.sender : link.recipient
                const pair = {sender:link.sender,recipient:link.recipient}
                return <div key={other} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="flex-1">{link.accepted ? 'Friend' : incoming ? 'Incoming request' : 'Request sent'} · {data?.board.find(row => row.user_id === other)?.username || other.slice(0,8)}</span>
                    {!link.accepted && incoming && <button className={button} disabled={busy} onClick={()=>change(supabase.from('friendships').update({accepted:true}).match(pair),'Friend added.')}>Accept</button>}
                    <button className={button} disabled={busy} onClick={()=>change(supabase.from('friendships').delete().match(pair),'Connection removed.')}>{link.accepted ? 'Remove' : incoming ? 'Decline' : 'Cancel'}</button>
                </div>
            })}
            <p role="status" className="text-sm text-text2">{notice}</p>
        </div>}
    </section>
}

