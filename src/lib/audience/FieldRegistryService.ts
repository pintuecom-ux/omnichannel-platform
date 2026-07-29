import { createClient } from '@/lib/supabase/server'
import { CustomFieldDefinition, CustomFieldValue, EntityType } from '@/types'

export class FieldRegistryService {
  /**
   * Retrieves all field definitions for a specific entity type (e.g. 'contact')
   */
  static async getDefinitions(
    workspaceId: string,
    entityType: EntityType,
    includeArchived: boolean = false
  ): Promise<CustomFieldDefinition[]> {
    const supabase = await createClient()

    let query = supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .order('created_at', { ascending: true })

    if (!includeArchived) {
      query = query.eq('is_archived', false)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch field definitions: ${error.message}`)

    return data as CustomFieldDefinition[]
  }

  /**
   * Creates a new custom field definition
   */
  static async createDefinition(
    workspaceId: string,
    payload: Partial<CustomFieldDefinition>
  ): Promise<CustomFieldDefinition> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('custom_field_definitions')
      .insert({
        ...payload,
        workspace_id: workspaceId
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create field definition: ${error.message}`)

    return data as CustomFieldDefinition
  }

  /**
   * Retrieves all custom values for a specific entity (e.g. a specific contact)
   */
  static async getEntityValues(
    workspaceId: string,
    entityId: string
  ): Promise<Record<string, any>> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('custom_field_values')
      .select(`
        value,
        field_id,
        definition:custom_field_definitions(key)
      `)
      .eq('workspace_id', workspaceId)
      .eq('entity_id', entityId)

    if (error) throw new Error(`Failed to fetch entity values: ${error.message}`)

    // Transform into a flat key-value object
    const result: Record<string, any> = {}
    if (data) {
      for (const row of data as any[]) {
        if (row.definition && row.definition.key) {
          result[row.definition.key] = row.value
        }
      }
    }

    return result
  }

  /**
   * Saves custom field values for an entity.
   * valuesRecord should be an object mapping field `key` to `value`.
   */
  static async saveValues(
    workspaceId: string,
    entityType: EntityType,
    entityId: string,
    valuesRecord: Record<string, any>
  ): Promise<void> {
    const supabase = await createClient()

    // 1. Fetch definitions to map keys to field_ids and perform validation
    const definitions = await this.getDefinitions(workspaceId, entityType)
    const defMap = new Map<string, CustomFieldDefinition>()
    definitions.forEach(def => defMap.set(def.key, def))

    // 2. Prepare upsert payload
    const upsertPayload = Object.keys(valuesRecord).map(key => {
      const def = defMap.get(key)
      if (!def) {
        throw new Error(`Field definition not found for key: ${key}`)
      }

      const value = valuesRecord[key]
      
      // Perform basic validation here if needed (e.g., regex, required)
      this.validateValue(value, def)

      return {
        workspace_id: workspaceId,
        field_id: def.id,
        entity_id: entityId,
        value
      }
    })

    if (upsertPayload.length === 0) return

    // 3. Upsert values (handles updates if conflict exists on field_id + entity_id)
    const { error } = await supabase
      .from('custom_field_values')
      .upsert(upsertPayload, { onConflict: 'field_id,entity_id' })

    if (error) throw new Error(`Failed to save field values: ${error.message}`)
  }

  /**
   * Validates a value against its field definition
   */
  static validateValue(value: any, def: CustomFieldDefinition): void {
    if (def.is_required && (value === null || value === undefined || value === '')) {
      throw new Error(`Field '${def.label}' is required.`)
    }

    if (value === null || value === undefined) return;

    if (def.validation) {
      if (def.validation.regex && typeof value === 'string') {
        const regex = new RegExp(def.validation.regex)
        if (!regex.test(value)) {
          throw new Error(`Field '${def.label}' is invalid.`)
        }
      }

      if (def.field_type === 'number' || def.field_type === 'decimal') {
        if (def.validation.min !== undefined && value < def.validation.min) {
          throw new Error(`Field '${def.label}' must be at least ${def.validation.min}.`)
        }
        if (def.validation.max !== undefined && value > def.validation.max) {
          throw new Error(`Field '${def.label}' must be at most ${def.validation.max}.`)
        }
      }
    }
  }
}
