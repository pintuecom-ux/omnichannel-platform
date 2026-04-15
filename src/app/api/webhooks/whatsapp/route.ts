import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseWhatsAppWebhook } from '@/lib/platforms/whatsapp'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── GET: Webhook verification ────────────────────────────────
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

// ── POST: Incoming events ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Return 200 immediately — Meta requires response in < 5s
    handleEvents(body).catch(err => console.error('[WA Webhook Error]', err))
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

async function handleEvents(body: any) {
  const events = parseWhatsAppWebhook(body)
  for (const ev of events) {
    if (ev.type === 'message') await processMessage(ev)
    else if (ev.type === 'status') await processStatus(ev)
  }
}

async function processMessage(ev: any) {
  const { phoneNumberId, data } = ev

  // ── 1. Find channel ──────────────────────────────────────
  const { data: channel, error: channelErr } = await admin
    .from('channels')
    .select('id, workspace_id, external_id, access_token')
    .eq('platform', 'whatsapp')
    .eq('external_id', phoneNumberId)
    .maybeSingle()

  if (channelErr) console.error('[WA] Channel lookup error:', channelErr)
  if (!channel) {
    console.error('[WA] No channel found for phone_number_id:', phoneNumberId)
    // Log all channels for debugging
    const { data: allChannels } = await admin.from('channels').select('id, platform, external_id, name')
    console.error('[WA] Available channels:', allChannels)
    return
  }

  // ── 2. Normalize phone number ────────────────────────────
  // WhatsApp sends without +, store as-is but search both formats
  const rawPhone = data.from as string
  const normalizedPhone = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone

  // ── 3. Find or UPSERT contact (prevents duplicates) ──────
  const { data: contact, error: contactErr } = await admin
    .from('contacts')
    .upsert(
      {
        workspace_id: channel.workspace_id,
        phone: normalizedPhone,
        name: data.from_name || normalizedPhone,
      },
      {
        onConflict: 'workspace_id,phone',
        ignoreDuplicates: false, // update name if it changed
      }
    )
    .select('id, workspace_id, phone, name')
    .single()

  if (contactErr) {
    console.error('[WA] Contact upsert error:', contactErr)
    return
  }

  // ── 4. Find or UPSERT conversation ───────────────────────
  // Use the unique constraint on (channel_id, contact_id)
  const { data: conversation, error: convErr } = await admin
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
      {
        onConflict: 'channel_id,contact_id',
        ignoreDuplicates: false, // always update last_message
      }
    )
    .select('id, unread_count')
    .single()

  if (convErr) {
    console.error('[WA] Conversation upsert error:', convErr)
    return
  }

  // Increment unread count separately (upsert can't do math)
  await admin
    .from('conversations')
    .update({ unread_count: (conversation.unread_count || 0) + 1 })
    .eq('id', conversation.id)

  // ── 5. Idempotency check ─────────────────────────────────
  const { data: existing } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()

  if (existing) {
    console.log('[WA] Message already processed:', data.external_id)
    return
  }

  // ── 6. Insert message ────────────────────────────────────
  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conversation.id,
    workspace_id: channel.workspace_id,
    external_id: data.external_id,
    direction: 'inbound',
    content_type: data.type === 'text' ? 'text' : data.type,
    body: data.text,
    status: 'delivered',
    is_note: false,
    meta: {
      from: normalizedPhone,
      from_name: data.from_name,
      timestamp: data.timestamp,
      image: data.image,
      audio: data.audio,
      document: data.document,
    },
  })

  if (msgErr) console.error('[WA] Message insert error:', msgErr)
  else console.log('[WA] ✅ Message saved for:', normalizedPhone, '|', data.text?.slice(0, 50))
}

async function processStatus(ev: any) {
  const { data } = ev
  await admin
    .from('messages')
    .update({ status: data.status })
    .eq('external_id', data.external_id)
}