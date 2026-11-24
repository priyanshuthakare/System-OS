import { FileText, Layers, LayoutGrid, Moon, User } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'

/**
 * @intent Main application routing and navigation tabs
 * @param None
 */
export default function BottomNav() {
    const currentTab = useAppStore(state => state.currentTab)
    const setTab = useAppStore(state => state.setTab)

    const tabs = [
        { id: 'today', label: 'Today', icon: LayoutGrid },
        { id: 'log', label: 'Schedule', icon: FileText },
        { id: 'closure', label: 'Review', icon: Moon },
        { id: 'settings', label: 'Settings', icon: Layers },
        { id: 'profile', label: 'Profile', icon: User },
    ]

    return (
        <div className="h-[72px] bg-surface2 border-t border-border flex items-center justify-around px-5 pb-2 shrink-0">
            {tabs.map((tab) => {
                const isActive = currentTab === tab.id
                const Icon = tab.icon

                return (
                    <button
                        key={tab.id}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setTab(tab.id)}
                        className={cn(
                            "flex flex-col items-center gap-1 cursor-pointer flex-1 transition-opacity",
                            isActive ? "opacity-100 text-white" : "opacity-80 text-text2"
                        )}
                    >
                        <div className="w-[22px] h-[22px] flex items-center justify-center">
                            <Icon strokeWidth={1.5} size={20} />
                        </div>
                        <span className="font-mono text-[10px] tracking-normal uppercase">
                            {tab.label}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
