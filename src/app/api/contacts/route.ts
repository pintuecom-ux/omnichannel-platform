import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const wsId = url.searchParams.get('workspace_id')
    if (!wsId) return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })

    const search = url.searchParams.get('search')
    const tags = url.searchParams.get('tags')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const listId = url.searchParams.get('list_id')

    let query = admin.from('contacts').select('*', { count: 'exact' }).eq('workspace_id', wsId).order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (tags) {
      const tagsArray = tags.split(',')
      query = query.contains('tags', tagsArray)
    }

    if (listId) {
      // Fetch via list_subscriptions
      const { data: listSubs, error: subErr } = await admin
        .from('list_subscriptions')
        .select('contact_id')
        .eq('list_id', listId)
        .eq('status', 'subscribed')
      
      if (subErr) throw subErr
      
      if (listSubs.length === 0) {
        return NextResponse.json({ contacts: [], total: 0 })
      }
      const contactIds = listSubs.map((sub: any) => sub.contact_id)
      query = query.in('id', contactIds)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ contacts: data, total: count || 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspace_id, ...contactData } = body

    if (!workspace_id) return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })

    // If external_id or email or phone is provided, do upsert or insert
    const { data, error } = await admin
      .from('contacts')
      .insert({
        workspace_id,
        ...contactData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ contact: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, workspace_id, ...updateData } = body

    if (!id || !workspace_id) return NextResponse.json({ error: 'Missing id or workspace_id' }, { status: 400 })

    const { data, error } = await admin
      .from('contacts')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ contact: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const wsId = url.searchParams.get('workspace_id')

    if (!id || !wsId) return NextResponse.json({ error: 'Missing id or workspace_id' }, { status: 400 })

    const { error } = await admin
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('workspace_id', wsId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
