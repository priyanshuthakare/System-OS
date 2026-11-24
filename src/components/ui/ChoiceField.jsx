import { useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Expand in the form so a long menu stays within the phone frame.
export default function ChoiceField({ label, value, options, onChange, disabled = false }) {
    const id = useId()
    const trigger = useRef(null)
    const [open, setOpen] = useState(false)
    const expanded = open && !disabled
    const selected = options.find(option => option.value === value)
    function close() {
        setOpen(false)
        trigger.current?.focus()
    }
    return <div className="min-w-0" onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={event => {
        if (expanded && event.key === 'Escape') { event.stopPropagation(); close() }
    }}>
        <span id={id} className="block text-sm text-text2 mb-1">{label}</span>
        <button type="button" ref={trigger} disabled={disabled} aria-expanded={expanded}
            aria-controls={id + '-choices'} aria-labelledby={id + ' ' + id + '-value'}
            onClick={() => setOpen(!expanded)}
            className="flex items-center justify-between gap-3 w-full min-h-11 p-3 text-left bg-surface border border-border2 disabled:opacity-60">
            <span id={id + '-value'} className="min-w-0 break-words">{selected?.label}</span>
            <ChevronDown size={16} aria-hidden="true" className={'shrink-0 text-amber ' + (expanded ? 'rotate-180' : '')}/>
        </button>
        <fieldset hidden={!expanded} id={id + '-choices'} aria-labelledby={id}
            className="min-w-0 max-h-[32dvh] overflow-y-auto overscroll-contain border border-border2 bg-surface">
            {options.map(option => <button key={option.value} type="button" disabled={disabled}
                aria-pressed={value === option.value}
                className={'flex w-full items-center gap-3 min-h-11 p-3 text-left focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-amber ' +
                    (value === option.value ? 'bg-amber/10 text-amber' : 'text-white')}
                onClick={() => {
                    onChange(option.value)
                    close()
                }}>
                <span aria-hidden="true" className={'w-3 h-3 rounded-full border border-current shrink-0 ' +
                    (value === option.value ? 'bg-amber' : '')} />
                <span className="min-w-0 break-words">{option.label}</span>
            </button>)}
        </fieldset>
    </div>
}
