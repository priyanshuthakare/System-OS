import React from 'react'

/**
 * @intent Wrapper for a block of checklist items
 * @param {object} props
 * @param {string} props.title - Block name
 * @param {string} props.subtitle - Meta counter (e.g. "2/6 done")
 * @param {React.ReactNode} props.children - Checkbox items
 */
export default function ChecklistCard({ title, subtitle, children }) {
    return (
        <div className="bg-surface border border-border mb-4">
            <div className="px-4 py-[14px] pb-2.5 font-condensed text-[18px] font-bold tracking-[1px] uppercase text-white border-b border-border flex items-center justify-between">
                {title}
                {subtitle && (
                    <span className="font-mono text-[9px] text-text3 font-normal">
                        {subtitle}
                    </span>
                )}
            </div>
            <div>
                {children}
            </div>
        </div>
    )
}
