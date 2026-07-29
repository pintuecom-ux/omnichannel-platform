import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const listId = params.id
    const body = await req.json()
    const { contact_ids, status, channel } = body // contact_ids: string[], status: string, channel: string

    if (!contact_ids || !Array.isArray(contact_ids)) {
      return NextResponse.json({ error: 'Missing or invalid contact_ids' }, { status: 400 })
    }

    const subscriptions = contact_ids.map(contactId => ({
      list_id: listId,
      contact_id: contactId,
      status: status || 'subscribed',
      channel: channel || null,
      subscribed_at: new Date().toISOString()
    }))

    const { error } = await admin
      .from('list_subscriptions')
      .upsert(subscriptions, { onConflict: 'list_id,contact_id' })

    if (error) throw error
    return NextResponse.json({ success: true, added: contact_ids.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const listId = params.id
    const body = await req.json()
    const { contact_ids } = body // contact_ids: string[]

    if (!contact_ids || !Array.isArray(contact_ids)) {
      return NextResponse.json({ error: 'Missing or invalid contact_ids' }, { status: 400 })
    }

    // Usually we just mark them as unsubscribed rather than hard delete, but for this let's just update status
    const { error } = await admin
      .from('list_subscriptions')
      .update({ 
        status: 'unsubscribed', 
        unsubscribed_at: new Date().toISOString() 
      })
      .eq('list_id', listId)
      .in('contact_id', contact_ids)

    if (error) throw error
    return NextResponse.json({ success: true, removed: contact_ids.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
