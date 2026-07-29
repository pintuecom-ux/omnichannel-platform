import { createClient } from '@/lib/supabase/server'
import { Tag } from '@/types'

export class TagService {
  /**
   * Apply a tag to an entity (polymorphic tagging)
   */
  static async applyTag(
    workspaceId: string,
    tagId: string,
    entityId: string,
    entityType: string = 'contact'
  ) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('entity_tags')
      .upsert({
        workspace_id: workspaceId,
        tag_id: tagId,
        entity_type: entityType,
        entity_id: entityId
      }, {
        onConflict: 'tag_id, entity_type, entity_id',
        ignoreDuplicates: true
      })

    if (error) throw error
    return true
  }

  /**
   * Remove a tag from an entity
   */
  static async removeTag(
    workspaceId: string,
    tagId: string,
    entityId: string,
    entityType: string = 'contact'
  ) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('entity_tags')
      .delete()
      .match({
        workspace_id: workspaceId,
        tag_id: tagId,
        entity_type: entityType,
        entity_id: entityId
      })

    if (error) throw error
    return true
  }

  /**
   * Fetch all tags for a specific entity
   */
  static async getEntityTags(
    workspaceId: string,
    entityId: string,
    entityType: string = 'contact'
  ): Promise<Tag[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('entity_tags')
      .select(`
        tags (*)
      `)
      .match({
        workspace_id: workspaceId,
        entity_type: entityType,
        entity_id: entityId
      })

    if (error) throw error
    return data.map((d: any) => d.tags as Tag)
  }
}
