import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function applyConditionsToQuery(query: any, group: any) {
  if (!group || !group.rules || group.rules.length === 0) return query;

  // Since Supabase PostgREST JS client is limited in complex nested OR/AND logic natively without raw SQL,
  // we will build a basic translator for simple flat ANDs for now.
  // For a real production system, this would ideally build a raw SQL query or use a postgres function.
  // We'll support basic AND filtering.

  if (group.logic === 'AND') {
    for (const rule of group.rules) {
      if (rule.type === 'group') {
        // Recursive group application is tricky with plain JS builder, skip for basic implementation
        continue;
      }

      const { field, operator, value } = rule;
      if (!field) continue;

      if (field.startsWith('tags')) {
         if (operator === 'contains') query = query.contains('tags', [value])
         if (operator === 'not_contains') query = query.not('tags', 'cs', `{${value}}`) // array not contains
      } else if (field.startsWith('meta.')) {
         const metaField = field.replace('meta.', '')
         // Supabase jsonb querying
         if (operator === 'equals') query = query.eq(`meta->>${metaField}`, value)
         if (operator === 'contains') query = query.ilike(`meta->>${metaField}`, `%${value}%`)
      } else {
        // Standard fields
        if (operator === 'equals') query = query.eq(field, value)
        if (operator === 'not_equals') query = query.neq(field, value)
        if (operator === 'contains') query = query.ilike(field, `%${value}%`)
        if (operator === 'starts_with') query = query.ilike(field, `${value}%`)
        if (operator === 'ends_with') query = query.ilike(field, `%${value}`)
        if (operator === 'greater_than') query = query.gt(field, value)
        if (operator === 'less_than') query = query.lt(field, value)
        if (operator === 'is_empty') query = query.is(field, null)
        if (operator === 'not_empty') query = query.not(field, 'is', null)
      }
    }
  } else if (group.logic === 'OR') {
     // OR logic across top-level fields requires a constructed string for PostgREST .or()
     const orClauses = []
     for (const rule of group.rules) {
       if (rule.type !== 'rule') continue;
       const { field, operator, value } = rule;
       if (field.startsWith('tags') || field.startsWith('meta.')) continue; // skip complex jsonb/array in OR for now
       
       if (operator === 'equals') orClauses.push(`${field}.eq.${value}`)
       if (operator === 'contains') orClauses.push(`${field}.ilike.%${value}%`)
     }
     if (orClauses.length > 0) {
       query = query.or(orClauses.join(','))
     }
  }

  return query;
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const segmentId = params.id
    const url = new URL(req.url)
    const wsId = url.searchParams.get('workspace_id')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    if (!wsId) return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })

    // 1. Fetch Segment
    const { data: segment, error: segErr } = await admin
      .from('segments')
      .select('condition_set')
      .eq('id', segmentId)
      .eq('workspace_id', wsId)
      .single()

    if (segErr) throw segErr
    if (!segment) return NextResponse.json({ error: 'Segment not found' }, { status: 404 })

    // 2. Build Query
    let query = admin
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })

    query = applyConditionsToQuery(query, segment.condition_set)
    query = query.range(offset, offset + limit - 1)

    const { data: contacts, error: contactErr, count } = await query

    if (contactErr) throw contactErr

    // Update Segment Count asynchronously
    if (offset === 0) {
       admin.from('segments').update({ contact_count: count, last_computed_at: new Date().toISOString() }).eq('id', segmentId).then();
    }

    return NextResponse.json({ contacts, total: count || 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
