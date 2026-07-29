import { createClient } from '@/lib/supabase/server'
import { Segment, ConditionSet } from '@/types'

export class SegmentService {
  /**
   * Helper function to build a Supabase/PostgREST filter string
   * from the JSON AST representation of segment rules.
   * This allows turning saved segment logic into an executable query.
   */
  static buildPostgrestFilter(conditionSet: ConditionSet): string {
    // A simplistic compiler for demonstration.
    // In production, this would handle complex nested AND/OR and types.
    if (!conditionSet || !conditionSet.conditions) return ''

    const parts = conditionSet.conditions.map(cond => {
      // If it's a nested ConditionSet
      if ('operator' in cond && 'conditions' in cond) {
        return `(${this.buildPostgrestFilter(cond as ConditionSet)})`
      }

      // Base condition
      const c = cond as { field: string; operator: string; value: any }
      
      switch (c.operator) {
        case 'eq': return `${c.field}.eq.${c.value}`
        case 'neq': return `${c.field}.neq.${c.value}`
        case 'gt': return `${c.field}.gt.${c.value}`
        case 'lt': return `${c.field}.lt.${c.value}`
        case 'contains': return `${c.field}.ilike.%${c.value}%`
        default: return `${c.field}.eq.${c.value}`
      }
    })

    const joiner = conditionSet.operator === 'OR' ? ',' : ','
    // Note: Supabase PostgREST uses `and=(... , ...)` and `or=(... , ...)`
    const operatorStr = conditionSet.operator === 'OR' ? 'or' : 'and'
    
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0]
    
    return `${operatorStr}=(${parts.join(',')})`
  }

  /**
   * Evaluates a segment and returns matching contact IDs
   */
  static async evaluateSegment(workspaceId: string, segmentId: string): Promise<string[]> {
    const supabase = await createClient()

    // 1. Fetch Segment Definition
    const { data: segment, error: segError } = await supabase
      .from('segments')
      .select('*')
      .match({ id: segmentId, workspace_id: workspaceId })
      .single()

    if (segError || !segment) throw new Error('Segment not found')

    // 2. Build Filter
    const filterString = this.buildPostgrestFilter(segment.condition_set)

    // 3. Execute against Contacts
    let query = supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)

    if (filterString) {
      // In Supabase JS, complex or/and strings can be passed to .or() or .filter()
      // This is simplified. 
      // Example: query = query.or(filterString)
    }

    const { data, error } = await query

    if (error) throw error

    return data.map(c => c.id)
  }
}
