import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { useSyncEngine } from './useSyncEngine'

/**
 * @intent Settings CRUD — writes to Supabase first, then syncs local Dexie via SyncEngine
 * @param None
 */
export function useSettingsLogic() {
    const user = useAuthStore(s => s.user)
    const { syncAll } = useSyncEngine()

    // Local reads from Dexie (instant UI via useLiveQuery)
    const timeBlocks = useLiveQuery(() => db.time_blocks.orderBy('sort_order').toArray())
    const templates = useLiveQuery(() => db.checklist_templates.orderBy('sort_order').toArray())

    const addBlock = async (block) => {
        if (!user) return
        const count = timeBlocks?.length || 0

        const { error } = await supabase.from('states').insert({
            user_id: user.id,
            name: block.name,
            start_time: block.start_time,
            end_time: block.end_time,
            is_sleep: block.is_sleep || false,
            is_keystone: block.is_keystone || false,
            ui_color: block.ui_color || 'bg-surface2',
            sort_order: count + 1,
            trigger_type: 'time',
            lock_type: 'soft'
        })

        if (error) {
            console.error('addBlock failed:', error.message)
            return
        }
        await syncAll()
    }

    const deleteBlock = async (id) => {
        // Optimistic: remove from local Dexie immediately
        await db.checklist_templates.where('block_id').equals(id).delete()
        await db.time_blocks.delete(id)

        // Then remote: delete child checklists first (avoid FK issues), then the state
        await supabase.from('checklists').delete().eq('state_id', id)
        const { error } = await supabase.from('states').delete().eq('id', id)
        if (error) {
            console.error('deleteBlock remote failed:', error.message)
        }
        await syncAll()
    }

    const addTemplate = async (template) => {
        if (!user) return
        const { error } = await supabase.from('checklists').insert({
            state_id: template.block_id,
            user_id: user.id,
            label: template.label,
            has_timer: template.has_timer || false,
            time_estimate_mins: template.time_estimate_mins || 5,
            is_locked: template.is_locked || false,
            category: template.category || 'target',
            sort_order: (templates?.filter(t => t.block_id === template.block_id).length || 0) + 1
        })

        if (error) {
            console.error('addTemplate failed:', error.message)
            return
        }
        await syncAll()
    }

    const deleteTemplate = async (id) => {
        // Optimistic: remove from local Dexie immediately
        await db.checklist_templates.delete(id)

        const { error } = await supabase.from('checklists').delete().eq('id', id)
        if (error) {
            console.error('deleteTemplate remote failed:', error.message)
        }
        await syncAll()
    }

    return {
        timeBlocks,
        templates,
        addBlock,
        deleteBlock,
        addTemplate,
        deleteTemplate
    }
}
