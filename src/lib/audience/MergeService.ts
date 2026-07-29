import { createClient } from '@/lib/supabase/server'
import { ContactMerge } from '@/types'

export class MergeService {
  /**
   * Request a merge between two contacts.
   * This handles preserving the trace but delegates the actual field mutation
   * to a Postgres transaction internally or further application logic.
   */
  static async executeMerge(
    workspaceId: string,
    userId: string,
    primaryContactId: string,
    secondaryContactId: string,
    mergeStrategy: string = 'manual',
    conflictResolution: Record<string, any> = {}
  ): Promise<ContactMerge> {
    const supabase = await createClient()

    // 1. Snapshot both contacts before merge
    const { data: primary } = await supabase.from('contacts').select('*').eq('id', primaryContactId).single()
    const { data: secondary } = await supabase.from('contacts').select('*').eq('id', secondaryContactId).single()

    if (!primary || !secondary) throw new Error("One or both contacts do not exist")

    // 2. Perform Merge Tracking
    const mergeData = {
      workspace_id: workspaceId,
      primary_contact_id: primaryContactId,
      secondary_contact_id: secondaryContactId,
      merged_by: userId,
      merge_strategy: mergeStrategy,
      conflict_resolution: conflictResolution,
      original_primary_data: primary,
      original_secondary_data: secondary,
      status: 'completed'
    }

    const { data, error } = await supabase
      .from('contact_merges')
      .insert(mergeData)
      .select()
      .single()

    if (error) throw error

    // 3. Mark the secondary contact as merged and hide it from queries (soft delete)
    await supabase.from('contacts').update({ is_archived: true }).eq('id', secondaryContactId)

    // Note: In a full production system, this is where we re-parent all 
    // tags, list_memberships, custom_field_values, conversations, and orders
    // from the secondary contact to the primary contact.

    return data as ContactMerge
  }

  /**
   * Revert a merge operation if it was executed recently
   */
  static async revertMerge(workspaceId: string, userId: string, mergeId: string) {
    const supabase = await createClient()

    const { data: mergeJob, error: fetchErr } = await supabase
      .from('contact_merges')
      .select('*')
      .eq('id', mergeId)
      .single()
      
    if (fetchErr || !mergeJob) throw new Error("Merge job not found")
    if (mergeJob.status === 'reverted') throw new Error("Merge is already reverted")

    // 1. Un-archive the secondary contact
    await supabase.from('contacts').update({ is_archived: false }).eq('id', mergeJob.secondary_contact_id)

    // 2. Mark merge as reverted
    await supabase.from('contact_merges').update({
      status: 'reverted',
      reverted_at: new Date().toISOString(),
      reverted_by: userId
    }).eq('id', mergeId)

    return true
  }
}
