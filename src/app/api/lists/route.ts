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

    const { data, error } = await admin
      .from('lists')
      .select('*')
      .eq('workspace_id', wsId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ lists: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspace_id, name, type, list_type, description, visibility } = body

    if (!workspace_id || !name) return NextResponse.json({ error: 'Missing workspace_id or name' }, { status: 400 })

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `list-${Date.now()}`

    const { data, error } = await admin
      .from('lists')
      .insert({
        workspace_id,
        name,
        slug,
        description: description || null,
        type: type || list_type || 'static',
        visibility: visibility || 'shared'
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ list: data })
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
      .from('lists')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ list: data })
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

    // Soft delete / archive
    const { error } = await admin
      .from('lists')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('workspace_id', wsId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
