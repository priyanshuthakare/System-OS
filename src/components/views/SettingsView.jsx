import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useSettingsLogic } from '../../hooks/useSettingsLogic'
import { useTierGuard } from '../../hooks/useTierGuard'
import { cn } from '../../lib/utils'
import ProUpgradeModal from '../ui/ProUpgradeModal'

const CATEGORIES = [
    { id: 'physical', label: 'PHYSICAL', color: 'text-green', border: 'border-green/30' },
    { id: 'grounding', label: 'GROUNDING', color: 'text-blue-400', border: 'border-blue-400/30' },
    { id: 'target', label: 'TARGET', color: 'text-amber', border: 'border-amber/30' }
]

/**
 * @intent System 1: State Builder — with neurological sequence enforcement
 * @param None
 */
export default function SettingsView() {
    const { timeBlocks, templates, addBlock, deleteBlock, addTemplate, deleteTemplate } = useSettingsLogic()
    const { canAddState, canAddChecklist, isPro } = useTierGuard()
    const [showUpgrade, setShowUpgrade] = useState(false)

    if (!timeBlocks) return <div className="p-6 text-text3 font-mono text-[10px]">Loading Settings...</div>

    return (
        <div className="flex-1 overflow-y-auto w-full bg-black flex flex-col p-6 pt-10 pb-20">
            <h1 className="font-condensed font-black text-[40px] leading-none text-white uppercase tracking-[-1px] mb-2">
                State<br />Builder
            </h1>
            <p className="font-mono text-[8px] text-text3 tracking-[2px] uppercase mb-8">
                System 1 — Define your operating states
            </p>

            <div className="space-y-6">
                <div className="relative flex items-center justify-between border-b border-border pb-2">
                    <h2 className="font-mono text-[10px] tracking-[2px] uppercase text-text2">Operating States</h2>
                    <AddBlockButton onAdd={(data) => {
                        if (!canAddState()) {
                            setShowUpgrade(true)
                            return
                        }
                        addBlock(data)
                    }} />
                </div>

                <div className="flex flex-col gap-3">
                    {timeBlocks.map(block => {
                        const blockTemplates = templates?.filter(t => t.block_id === block.id) || []
                        return (
                            <BlockItem
                                key={block.id}
                                block={block}
                                templates={blockTemplates}
                                onDelete={deleteBlock}
                                onAddTemplate={(data) => {
                                    if (!canAddChecklist(blockTemplates.length)) {
                                        setShowUpgrade(true)
                                        return
                                    }
                                    addTemplate(data)
                                }}
                                onDeleteTemplate={deleteTemplate}
                            />
                        )
                    })}
                </div>
            </div>

            {showUpgrade && <ProUpgradeModal onClose={() => setShowUpgrade(false)} />}
        </div>
    )
}

function BlockItem({ block, templates, onDelete, onAddTemplate, onDeleteTemplate }) {
    const [expanded, setExpanded] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    // Group templates by category
    const physical = templates.filter(t => t.category === 'physical')
    const grounding = templates.filter(t => t.category === 'grounding')
    const target = templates.filter(t => t.category === 'target')
    const uncategorized = templates.filter(t => !t.category)

    // Compute dynamic day color based on start_time
    const [startH, startM] = block.start_time.split(':').map(Number)
    const startVal = startH * 60 + startM
    let dynamicColor = 'bg-surface2'
    if (startVal >= 5 * 60 && startVal < 12 * 60) dynamicColor = 'bg-amber'
    else if (startVal >= 12 * 60 && startVal < 17 * 60) dynamicColor = 'bg-green'
    else if (startVal >= 17 * 60 && startVal < 22 * 60) dynamicColor = 'bg-red'

    const colorToUse = block.ui_color && block.ui_color !== 'bg-surface2' ? block.ui_color : dynamicColor

    return (
        <div className="border border-border bg-surface p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-center gap-3 mb-1">
                        <div className={cn("w-2 h-2 rounded-full", colorToUse)} />
                        <h3 className="font-condensed font-bold text-xl text-white tracking-widest uppercase">{block.name}</h3>
                        {block.is_sleep && <span className="text-[8px] font-mono text-amber border border-amber px-1">SHUTDOWN</span>}
                        {expanded ? <ChevronDown size={14} className="text-text3" /> : <ChevronRight size={14} className="text-text3" />}
                    </div>
                    <div className="font-mono text-[10px] text-text3">
                        {block.start_time} — {block.end_time}
                    </div>
                </div>

                {confirmDelete ? (
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-red tracking-[1px]">CONFIRM DELETE?</span>
                        <button
                            onClick={() => { onDelete(block.id); setConfirmDelete(false) }}
                            className="px-2 py-1 border border-red text-red font-mono text-[9px] hover:bg-red/10 transition-colors"
                        >
                            YES
                        </button>
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="px-2 py-1 border border-border text-text3 font-mono text-[9px] hover:text-white transition-colors"
                        >
                            NO
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="p-2 text-text3 hover:text-red transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {expanded && (
                <div className="pt-4 border-t border-border flex flex-col gap-4">
                    {/* Neurological sequence info */}
                    <div className="font-mono text-[8px] text-text3 tracking-[1px] leading-relaxed bg-black p-3 border border-border">
                        SEQUENCE ORDER: <span className="text-green">PHYSICAL</span> → <span className="text-blue-400">GROUNDING</span> → <span className="text-amber">TARGET</span>
                    </div>

                    {/* Physical items */}
                    <CategorySection
                        category={CATEGORIES[0]}
                        items={physical}
                        onDelete={onDeleteTemplate}
                    />

                    {/* Grounding items */}
                    <CategorySection
                        category={CATEGORIES[1]}
                        items={grounding}
                        onDelete={onDeleteTemplate}
                    />

                    {/* Target items */}
                    <CategorySection
                        category={CATEGORIES[2]}
                        items={target}
                        onDelete={onDeleteTemplate}
                    />

                    {/* Uncategorized (legacy) */}
                    {uncategorized.length > 0 && (
                        <CategorySection
                            category={{ id: 'uncategorized', label: 'UNCATEGORIZED', color: 'text-text3', border: 'border-border' }}
                            items={uncategorized}
                            onDelete={onDeleteTemplate}
                        />
                    )}

                    <AddTemplateButton blockId={block.id} onAdd={onAddTemplate} />
                </div>
            )}
        </div>
    )
}

function CategorySection({ category, items, onDelete }) {
    if (items.length === 0) return null

    return (
        <div>
            <div className={cn("font-mono text-[8px] tracking-[2px] uppercase mb-2", category.color)}>
                {category.label}
            </div>
            <div className="flex flex-col gap-1">
                {items.map(t => (
                    <div key={t.id} className={cn("flex items-center justify-between bg-black p-3 border", category.border)}>
                        <span className="font-body text-sm text-textPrimary leading-none">
                            {t.label} {t.has_timer ? '⏳' : ''}
                        </span>
                        <button onClick={() => onDelete(t.id)} className="text-text3 hover:text-red">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AddBlockButton({ onAdd }) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [startTime, setStartTime] = useState('12:00:00')
    const [endTime, setEndTime] = useState('13:00:00')
    const [isSleep, setIsSleep] = useState(false)

    const handleSubmit = () => {
        if (!name.trim()) return
        onAdd({
            name: name.trim(),
            start_time: startTime,
            end_time: endTime,
            is_sleep: isSleep,
            ui_color: 'bg-surface2',
            is_keystone: false
        })
        setName('')
        setStartTime('12:00:00')
        setEndTime('13:00:00')
        setIsSleep(false)
        setOpen(false)
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} className="flex items-center gap-1 font-mono text-[10px] text-green hover:text-green-dim transition-colors">
                <Plus size={12} /> ADD STATE
            </button>
        )
    }

    return (
        <div className="absolute right-0 top-8 z-20 w-72 max-h-[70vh] overflow-y-auto border border-green/30 bg-black p-4 flex flex-col gap-3 shadow-lg shadow-black/50">
            <div className="font-mono text-[9px] tracking-[2px] text-green uppercase">New Operating State</div>

            <input
                type="text"
                placeholder="State name (e.g. DEEP WORK)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-surface border border-border p-3 font-body text-sm text-white placeholder-text3 outline-none focus:border-green transition-colors"
            />

            <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                    <label className="font-mono text-[8px] text-text3 tracking-[1px] uppercase">Start</label>
                    <input
                        type="time"
                        step="1"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full bg-surface border border-border p-2 font-mono text-[11px] text-white outline-none focus:border-green transition-colors"
                    />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                    <label className="font-mono text-[8px] text-text3 tracking-[1px] uppercase">End</label>
                    <input
                        type="time"
                        step="1"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full bg-surface border border-border p-2 font-mono text-[11px] text-white outline-none focus:border-green transition-colors"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => setIsSleep(!isSleep)}
                    className={cn(
                        "w-5 h-5 border flex items-center justify-center text-[10px]",
                        isSleep ? "border-amber bg-amber text-black" : "border-border text-text3"
                    )}
                >
                    {isSleep ? '✓' : ''}
                </button>
                <span className="font-mono text-[9px] text-text2 tracking-[1px]">SHUTDOWN / SLEEP MODE</span>
            </div>

            <div className="flex gap-2 mt-1">
                <button
                    onClick={handleSubmit}
                    disabled={!name.trim()}
                    className="flex-1 p-3 bg-green text-black font-mono text-[10px] tracking-[2px] uppercase font-bold disabled:opacity-30 hover:bg-green/90 transition-colors"
                >
                    CREATE
                </button>
                <button
                    onClick={() => setOpen(false)}
                    className="px-4 p-3 border border-border text-text3 font-mono text-[10px] tracking-[1px] uppercase hover:text-white transition-colors"
                >
                    CANCEL
                </button>
            </div>
        </div>
    )
}

function AddTemplateButton({ blockId, onAdd }) {
    const [open, setOpen] = useState(false)
    const [label, setLabel] = useState('')
    const [category, setCategory] = useState('physical')
    const [hasTimer, setHasTimer] = useState(false)
    const [timeMins, setTimeMins] = useState('5')

    const handleSubmit = () => {
        if (!label.trim()) return
        onAdd({
            block_id: blockId,
            label: label.trim(),
            has_timer: hasTimer,
            is_locked: false,
            time_estimate_mins: parseInt(timeMins, 10) || 5,
            category
        })
        setLabel('')
        setCategory('physical')
        setHasTimer(false)
        setTimeMins('5')
        setOpen(false)
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 mt-2 w-full justify-center p-3 border border-dashed border-border text-text3 hover:text-white hover:border-text3 transition-colors font-mono text-[10px] tracking-[1px] uppercase"
            >
                <Plus size={12} /> ADD ITEM
            </button>
        )
    }

    return (
        <div className="border border-amber/30 bg-black p-4 flex flex-col gap-3 mt-2">
            <div className="font-mono text-[9px] tracking-[2px] text-amber uppercase">New Checklist Item</div>

            {/* Label */}
            <input
                type="text"
                placeholder="Action name (e.g. 10 pushups)"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full bg-surface border border-border p-3 font-body text-sm text-white placeholder-text3 outline-none focus:border-amber transition-colors"
            />

            {/* Category selector */}
            <div className="flex gap-2">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={cn(
                            "flex-1 p-2 font-mono text-[8px] tracking-[1px] uppercase border transition-all text-center",
                            category === cat.id
                                ? `${cat.border} ${cat.color} bg-surface`
                                : "border-border text-text3 hover:text-white"
                        )}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Timer toggle */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setHasTimer(!hasTimer)}
                    className={cn(
                        "w-5 h-5 border flex items-center justify-center text-[10px]",
                        hasTimer ? "border-amber bg-amber text-black" : "border-border text-text3"
                    )}
                >
                    {hasTimer ? '✓' : ''}
                </button>
                <span className="font-mono text-[9px] text-text2 tracking-[1px]">TIMED SESSION</span>
                {hasTimer && (
                    <input
                        type="number"
                        value={timeMins}
                        onChange={e => setTimeMins(e.target.value)}
                        className="w-16 bg-surface border border-border px-2 py-1 font-mono text-[10px] text-white outline-none focus:border-amber"
                        min="1"
                    />
                )}
                {hasTimer && <span className="font-mono text-[8px] text-text3">min</span>}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-1">
                <button
                    onClick={handleSubmit}
                    disabled={!label.trim()}
                    className="flex-1 p-3 bg-green text-black font-mono text-[10px] tracking-[2px] uppercase font-bold disabled:opacity-30 hover:bg-green/90 transition-colors"
                >
                    ADD
                </button>
                <button
                    onClick={() => setOpen(false)}
                    className="px-4 p-3 border border-border text-text3 font-mono text-[10px] tracking-[1px] uppercase hover:text-white transition-colors"
                >
                    CANCEL
                </button>
            </div>
        </div>
    )
}
