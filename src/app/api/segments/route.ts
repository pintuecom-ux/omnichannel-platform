import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      .from('segments')
      .select('*')
      .eq('workspace_id', wsId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ segments: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspace_id, name, description, condition_set, tags } = body

    if (!workspace_id || !name || !condition_set) return NextResponse.json({ error: 'Missing workspace_id, name, or condition_set' }, { status: 400 })

    const { data, error } = await admin
      .from('segments')
      .insert({
        workspace_id,
        name,
        description,
        condition_set,
        tags: tags || [],
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ segment: data })
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
      .from('segments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ segment: data })
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
      .from('segments')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('workspace_id', wsId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
