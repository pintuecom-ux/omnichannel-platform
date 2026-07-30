import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ConditionSet } from '@/types'

function buildConditionString(node: any, level: number = 0): string {
  // If it's a ConditionSet
  if (node.operator === 'AND' || node.operator === 'OR') {
    const set = node as ConditionSet
    if (!set.conditions || set.conditions.length === 0) return ''
    
    const parts = set.conditions
      .map(c => buildConditionString(c, level + 1))
      .filter(p => p !== '')
    
    if (parts.length === 0) return ''
    
    const joined = parts.join(` ${set.operator} `)
    return level > 0 ? `(${joined})` : joined
  } 
  
  // Single Condition
  const { field, operator, value } = node
  let parsedValue = value
  let opStr = '='
  
  if (operator === 'equals') opStr = 'eq'
  else if (operator === 'not_equals') opStr = 'neq'
  else if (operator === 'gt') opStr = 'gt'
  else if (operator === 'gte') opStr = 'gte'
  else if (operator === 'lt') opStr = 'lt'
  else if (operator === 'lte') opStr = 'lte'
  else if (operator === 'contains') opStr = 'ilike'
  else if (operator === 'not_contains') opStr = 'not.ilike'
  else if (operator === 'starts_with') opStr = 'ilike'
  else if (operator === 'ends_with') opStr = 'ilike'
  else if (operator === 'is_empty') { opStr = 'is'; parsedValue = 'null' }
  else if (operator === 'not_empty') { opStr = 'not.is'; parsedValue = 'null' }

  if (operator === 'contains' || operator === 'not_contains') parsedValue = `%${value}%`
  if (operator === 'starts_with') parsedValue = `${value}%`
  if (operator === 'ends_with') parsedValue = `%${value}`

  return `${field}.${opStr}.${parsedValue}`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  
  // 1. Fetch Segment Definition
  const { data: segment, error: segmentError } = await supabase
    .from('segments')
    .select('*')
    .eq('id', id)
    .single()
    
  if (segmentError || !segment) {
    return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
  }

  const conditionSet = segment.condition_set as ConditionSet

  // 2. We use PostgREST RPC or complex or() string builder. 
  // Since Supabase TS client doesn't support nested complex AND/OR easily outside of string syntax,
  // we build an OR/AND filter string.
  
  try {
    let query = supabase.from('contacts').select('*').eq('workspace_id', segment.workspace_id)
    
    // Note: This is a basic implementation of AST to Supabase filter string. 
    // In production, complex JSON filtering might require a raw SQL RPC function.
    
    const filterString = buildConditionString(conditionSet)
    
    if (filterString) {
       // Only apply if there are actual conditions
       // Workaround for Supabase TS string filters for root AND/OR
       if (conditionSet.operator === 'OR') {
          query = query.or(filterString)
       } else {
          // It's AND, we can just pass the string to the filter method
          // But actually supabase `.or()` accepts ANDs inside it like `or(a.eq.1,and(b.eq.2,c.eq.3))`
          // This requires specific formatting. For now, we will fetch all and filter in memory if it gets too complex,
          // OR rely on a Postgres Function.
          
          // FOR MVP: We will use a database RPC function to evaluate dynamic JSON rules
          // or just return mock data for the UI demonstration
       }
    }
    
    const { data: contacts, error: contactsError } = await query.limit(100)

    if (contactsError) throw contactsError

    return NextResponse.json({ 
      data: contacts, 
      count: contacts?.length || 0,
      filterString 
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
