import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient } from '@/lib/platforms/whatsapp'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    conversation_id,
    body,
    type = 'text',
    template_name,
    template_language = 'en_US',
    template_vars = [],
  } = await req.json()

  if (!conversation_id) {
    return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
  }
  if (!body && !template_name) {
    return NextResponse.json({ error: 'body or template_name required' }, { status: 400 })
  }

  // Get conversation + channel + contact
  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .select('*, contact:contacts(*), channel:channels(*)')
    .eq('id', conversation_id)
    .single()

  if (convErr || !conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('workspace_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Check that contact has a phone number (required for WA)
  if (conv.platform === 'whatsapp' && !conv.contact?.phone) {
    return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })
  }

  try {
    let externalId: string | null = null
    const messageBody = body || `[Template: ${template_name}]`

    if (conv.platform === 'whatsapp') {
      const waClient = new WhatsAppClient(
        conv.channel.access_token,
        conv.channel.external_id
      )

      if (type === 'template' && template_name) {
        console.log(`[Send] Sending template "${template_name}" to ${conv.contact.phone}`)
        externalId = await waClient.sendTemplate(
          conv.contact.phone,
          template_name,
          template_language,
          template_vars
        )
      } else {
        console.log(`[Send] Sending text to ${conv.contact.phone}: "${body?.slice(0, 50)}"`)
        externalId = await waClient.sendText(conv.contact.phone, body)
      }
    }

    // Instagram / Facebook — sending added in Phase 1C
    if (conv.platform === 'instagram' || conv.platform === 'facebook') {
      // For now, save to DB without sending externally
      externalId = null
    }

    // Save outbound message to DB
    const { data: msg, error: msgErr } = await admin
      .from('messages')
      .insert({
        conversation_id,
        workspace_id: profile.workspace_id,
        external_id: externalId,
        direction: 'outbound',
        content_type: type === 'template' ? 'template' : 'text',
        body: messageBody,
        sender_id: session.user.id,
        status: externalId ? 'sent' : 'queued',
        is_note: false,
        meta: type === 'template' ? { template_name, template_language } : {},
      })
      .select()
      .single()

    if (msgErr) throw new Error(msgErr.message)

    // Update conversation last_message
    await admin
      .from('conversations')
      .update({
        last_message: messageBody,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)

    return NextResponse.json({ message: msg })
  } catch (err: any) {
    const errMsg = err?.response?.data?.error?.message || err?.message || 'Failed to send'
    console.error('[Send API Error]', errMsg, err?.response?.data)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
