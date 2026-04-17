import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseWhatsAppWebhook } from '@/lib/platforms/whatsapp'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  if (
    p.get('hub.mode') === 'subscribe' &&
    p.get('hub.verify_token') === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    console.log('✅ WhatsApp webhook verified')
    return new NextResponse(p.get('hub.challenge'), { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // CRITICAL FIX: Process SYNCHRONOUSLY before returning 200
    // Previous code used .catch() which runs AFTER the response —
    // Vercel kills the function as soon as the response is sent on free tier.
    // Now we await processing, then return 200.
    // This still completes well within Meta's 5s requirement.
    await handleEvents(body)

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[WA Webhook] Fatal error:', err)
    // Still return 200 so Meta doesn't retry indefinitely
    return NextResponse.json({ status: 'error_logged' })
  }
}

async function handleEvents(body: any) {
  const events = parseWhatsAppWebhook(body)

  // Process all events in parallel where possible
  await Promise.all(events.map(ev => {
    if (ev.type === 'message') return processMessage(ev).catch(e => console.error('[WA] processMessage error:', e))
    if (ev.type === 'status')  return processStatus(ev).catch(e => console.error('[WA] processStatus error:', e))
    return Promise.resolve()
  }))
}

async function processMessage(ev: any) {
  const { phoneNumberId, data } = ev

  // 1. Find channel
  const { data: channel } = await admin
    .from('channels')
    .select('id, workspace_id, external_id, access_token')
    .eq('platform', 'whatsapp')
    .eq('external_id', phoneNumberId)
    .maybeSingle()

  if (!channel) {
    console.error(`[WA] No channel for phone_number_id: ${phoneNumberId}`)
    const { data: all } = await admin.from('channels').select('id, platform, external_id')
    console.error('[WA] Channels in DB:', JSON.stringify(all))
    return
  }

  // 2. Normalize phone (WA sends without +)
  const phone = (data.from as string).replace(/^\+/, '')

  // 3. Idempotency check FIRST — skip everything if already processed
  const { data: existing } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()

  if (existing) {
    console.log('[WA] Duplicate, skipping:', data.external_id)
    return
  }

  // 4. Upsert contact + find/create conversation in parallel
  const [contactResult, existingConvResult] = await Promise.all([
    admin.from('contacts').upsert(
      { workspace_id: channel.workspace_id, phone, name: data.from_name || phone },
      { onConflict: 'workspace_id,phone', ignoreDuplicates: false }
    ).select('id').single(),

    // Try to find existing open conversation to avoid needing contact.id first
    admin.from('conversations')
      .select('id, unread_count, contact_id')
      .eq('channel_id', channel.id)
      .in('status', ['open', 'pending'])
      .limit(1)
      .maybeSingle(),
  ])

  if (contactResult.error) {
    console.error('[WA] Contact upsert error:', contactResult.error)
    return
  }
  const contact = contactResult.data

  let conversationId: string
  let currentUnread = 0

  if (existingConvResult.data && existingConvResult.data.contact_id === contact.id) {
    // Reuse existing conversation
    conversationId = existingConvResult.data.id
    currentUnread = existingConvResult.data.unread_count || 0
  } else {
    // Create or upsert conversation
    const { data: conv, error: convErr } = await admin
      .from('conversations')
      .upsert(
        {
          workspace_id: channel.workspace_id,
          contact_id: contact.id,
          channel_id: channel.id,
          platform: 'whatsapp',
          status: 'open',
          last_message: data.text || `[${data.type}]`,
          last_message_at: data.timestamp,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'channel_id,contact_id', ignoreDuplicates: false }
      )
      .select('id, unread_count')
      .single()

    if (convErr || !conv) {
      console.error('[WA] Conversation upsert error:', convErr)
      return
    }
    conversationId = conv.id
    currentUnread = conv.unread_count || 0
  }

  // 5. Insert message + update conversation in parallel
  const [msgResult] = await Promise.all([
    admin.from('messages').insert({
      conversation_id: conversationId,
      workspace_id: channel.workspace_id,
      external_id: data.external_id,
      direction: 'inbound',
      content_type: data.type === 'text' ? 'text' : data.type,
      body: data.text,
      status: 'delivered',
      is_note: false,
      meta: {
        from: phone,
        from_name: data.from_name,
        image: data.image,
        audio: data.audio,
        document: data.document,
      },
    }),
    admin.from('conversations').update({
      last_message: data.text || `[${data.type}]`,
      last_message_at: data.timestamp,
      unread_count: currentUnread + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', conversationId),
  ])

  if (msgResult.error) {
    console.error('[WA] Message insert error:', msgResult.error)
  } else {
    console.log(`[WA] ✅ Saved: "${data.text?.slice(0, 40)}" from ${phone}`)
  }
}

async function processStatus(ev: any) {
  const { data } = ev
  await admin
    .from('messages')
    .update({ status: data.status })
    .eq('external_id', data.external_id)
}