import { createClient } from '@/lib/supabase/server'
import { List, ListMembership } from '@/types'

export class ListService {
  /**
   * Add an entity (like a contact) to a list.
   * If the relationship already exists, this can gracefully ignore or update.
   */
  static async addToList(
    workspaceId: string, 
    listId: string, 
    entityId: string, 
    entityType: string = 'contact',
    source: string = 'manual'
  ) {
    const supabase = await createClient()

    const membership = {
      list_id: listId,
      entity_type: entityType,
      entity_id: entityId,
      workspace_id: workspaceId,
      status: 'active',
      source: source,
    }

    const { error } = await supabase
      .from('list_memberships')
      .upsert(membership, {
        onConflict: 'list_id, entity_type, entity_id',
        ignoreDuplicates: false // Updates if exists
      })

    if (error) throw error

    // We could emit an event here to recalculate list counts asynchronously
    return true
  }

  /**
   * Remove an entity from a list safely without deleting the contact.
   */
  static async removeFromList(
    workspaceId: string,
    listId: string,
    entityId: string,
    entityType: string = 'contact'
  ) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('list_memberships')
      .delete()
      .match({
        workspace_id: workspaceId,
        list_id: listId,
        entity_type: entityType,
        entity_id: entityId
      })

    if (error) throw error
    return true
  }

  /**
   * Get all lists an entity belongs to
   */
  static async getEntityLists(workspaceId: string, entityId: string, entityType: string = 'contact'): Promise<List[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('list_memberships')
      .select(`
        lists (*)
      `)
      .match({
        workspace_id: workspaceId,
        entity_type: entityType,
        entity_id: entityId,
        status: 'active'
      })

    if (error) throw error

    return data.map((d: any) => d.lists as List)
  }
}
