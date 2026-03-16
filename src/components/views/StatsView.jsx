import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'

/**
 * @intent Screen 4: Weekly Review and Metrics (Wired to Dexie)
 * @param None
 */
export default function StatsView() {
    const metrics = useLiveQuery(async () => {
        // Fetch the latest row 
        const latestRow = await db.weekly_reviews.orderBy('week_start_date').reverse().first()
        return latestRow || null
    }, [])

    const loading = metrics === undefined

    const compRow = (rule, days) => (
        <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
            <div className="font-body text-[13px] text-text2 flex-1">{rule}</div>
            <div className="flex gap-[2px]">
                {days.map((status, i) => (
                    <div key={i} className={`w-[18px] h-[18px] flex items-center justify-center font-mono text-[9px]
            ${status === 'pass' ? 'bg-green/10 text-green' : 'bg-red-dim text-red'}`}
                    >
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </div>
                ))}
            </div>
        </div>
    )

    const MetricCard = ({ val, unit, label, status }) => (
        <div className={`p-4 border border-border flex flex-col justify-center items-center
      ${status === 'good' ? 'bg-green/5' : status === 'warn' ? 'bg-amber/5' : status === 'bad' ? 'bg-red/5' : 'bg-surface'}`
        }>
            <div className={`font-condensed font-black text-[32px] leading-none mb-1
        ${status === 'good' ? 'text-green' : status === 'warn' ? 'text-amber' : status === 'bad' ? 'text-red' : 'text-white'}`
            }>
                {val}<span className="text-[14px] text-text3 ml-1">{unit}</span>
            </div>
            <div className="font-mono text-[8px] tracking-[2px] uppercase text-text3 text-center">{label}</div>
        </div>
    )

    if (loading) return <div className="p-6 font-mono text-white">SYNCING SYSTEM LOGS...</div>

    // Defaults if DB lacks seed rows
    const dbMetrics = metrics || {
        rule_compliance_percent: 100,
        total_incidents: 0,
        deep_work_hours: 0,
        sleep_avg_hours: "00:00"
    }

    return (
        <div className="flex-1 overflow-y-auto w-full flex flex-col bg-black">
            {/* Header */}
            <div className="px-6 py-5 pb-4 border-b border-border shrink-0">
                <div className="font-mono text-[9px] tracking-[3px] text-text3 mb-1.5 uppercase">
                    WEEKLY REVIEW
                </div>
                <div className="font-condensed font-black text-[36px] uppercase tracking-[0.5px] text-white leading-none">
                    CALIBRATION
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">

                {/* Metrics Grid */}
                <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-2.5">
          // metrics
                </div>
                <div className="grid grid-cols-2 gap-2 mb-6">
                    <MetricCard val={dbMetrics.rule_compliance_percent} unit="%" label="Rule Compliance" status={dbMetrics.rule_compliance_percent > 80 ? 'good' : 'warn'} />
                    <MetricCard val={dbMetrics.total_incidents} label="Incidents" status={dbMetrics.total_incidents === 0 ? 'good' : 'bad'} />
                    <MetricCard val={dbMetrics.deep_work_hours} unit="h" label="Deep Work" status="warn" />
                    <MetricCard val={dbMetrics.sleep_avg_hours} label="Avg Sleep" />
                </div>

                {/* Rule Compliance Grid */}
                <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3 mb-2.5">
          // rule compliance by day
                </div>
                <div className="bg-surface border border-border p-3 mb-6">
                    {compRow('No laptop on bed', ['pass', 'pass', 'fail', 'pass', 'pass', 'pass', 'pass'])}
                    {compRow('No screens lying down', ['pass', 'fail', 'fail', 'pass', 'pass', 'pass', 'pass'])}
                    {compRow('WiFi off 9:45 PM', ['pass', 'pass', 'pass', 'pass', 'fail', 'fail', 'pass'])}
                </div>

            </div>
        </div>
    )
}
