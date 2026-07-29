import { createClient } from '@/lib/supabase/server'
import { PlatformEvent } from '@/types'

export class EventStoreService {
  /**
   * Log an event to the unified timeline.
   */
  static async logEvent(
    workspaceId: string,
    eventType: string,
    entityType: string,
    entityId: string,
    actorId?: string,
    source: string = 'system',
    metadata: Record<string, any> = {},
    correlationId?: string
  ): Promise<PlatformEvent> {
    const supabase = await createClient()

    const eventPayload = {
      workspace_id: workspaceId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      actor_id: actorId,
      source,
      metadata,
      correlation_id: correlationId
    }

    const { data, error } = await supabase
      .from('platform_events')
      .insert(eventPayload)
      .select()
      .single()

    if (error) throw error
    return data as PlatformEvent
  }

  /**
   * Retrieve the chronological timeline for a specific entity (e.g., a contact)
   */
  static async getTimelineForEntity(
    workspaceId: string,
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<PlatformEvent[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('platform_events')
      .select('*')
      .match({ workspace_id: workspaceId, entity_type: entityType, entity_id: entityId })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as PlatformEvent[]
  }
}
