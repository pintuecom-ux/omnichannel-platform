import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient } from '@/lib/platforms/whatsapp'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversation_id, body, type = 'text', template_name, template_vars } = await req.json()
  if (!conversation_id || (!body && !template_name)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get conversation + channel + contact
  const { data: conv } = await admin
    .from('conversations')
    .select('*, contact:contacts(*), channel:channels(*)')
    .eq('id', conversation_id)
    .single()

  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  // Get sender profile
  const { data: profile } = await admin
    .from('profiles')
    .select('workspace_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  try {
    let externalId: string | null = null

    if (conv.platform === 'whatsapp') {
      const client = new WhatsAppClient(
        conv.channel.access_token,
        conv.channel.external_id
      )
      if (type === 'template' && template_name) {
        externalId = await client.sendTemplate(conv.contact.phone, template_name, 'en', template_vars)
      } else {
        externalId = await client.sendText(conv.contact.phone, body)
      }
    }

    // Instagram & Facebook sending will be added in Phase 1C
    if (conv.platform === 'instagram' || conv.platform === 'facebook') {
      // Placeholder — mark as sent without external_id for now
      externalId = null
    }

    // Save message to DB
    const { data: msg } = await admin
      .from('messages')
      .insert({
        conversation_id,
        workspace_id: profile.workspace_id,
        external_id: externalId,
        direction: 'outbound',
        content_type: type === 'template' ? 'template' : 'text',
        body,
        sender_id: session.user.id,
        status: externalId ? 'sent' : 'queued',
        is_note: false,
      })
      .select()
      .single()

    // Update conversation
    await admin
      .from('conversations')
      .update({
        last_message: body,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)

    return NextResponse.json({ message: msg })
  } catch (err: any) {
    const errMsg = err?.response?.data?.error?.message || err?.message || 'Failed to send'
    console.error('Send message error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}