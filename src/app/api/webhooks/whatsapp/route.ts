import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseWhatsAppWebhook } from '@/lib/platforms/whatsapp'

// Admin client bypasses RLS — only used server-side in webhook
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── GET: Meta webhook verification ──────────────────────────────────────────
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

// ── POST: Incoming events ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Respond immediately — Meta requires < 5s
    handleEvents(body).catch(err => console.error('Webhook processing error:', err))
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// ── Event processing (async, after 200 is returned) ─────────────────────────
async function handleEvents(body: any) {
  const events = parseWhatsAppWebhook(body)
  for (const ev of events) {
    if (ev.type === 'message') await processMessage(ev)
    else if (ev.type === 'status') await processStatus(ev)
  }
}

async function processMessage(ev: any) {
  const { phoneNumberId, data } = ev

  // 1. Find channel
  const { data: channel } = await admin
    .from('channels')
    .select('*')
    .eq('platform', 'whatsapp')
    .eq('external_id', phoneNumberId)
    .single()

  if (!channel) {
    console.error(`No WhatsApp channel found for phone_number_id: ${phoneNumberId}`)
    return
  }

  // 2. Find or create contact
  let contact = await findOrCreateContact(channel.workspace_id, {
    phone: data.from,
    name: data.from_name,
  })
  if (!contact) return

  // 3. Find or create open conversation
  let conversation = await findOrCreateConversation(channel, contact.id, {
    platform: 'whatsapp',
    lastMessage: data.text || `[${data.type}]`,
    lastMessageAt: data.timestamp,
  })
  if (!conversation) return

  // 4. Idempotency — skip if already stored
  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()
  if (exists) return

  // 5. Insert message
  await admin.from('messages').insert({
    conversation_id: conversation.id,
    workspace_id: channel.workspace_id,
    external_id: data.external_id,
    direction: 'inbound',
    content_type: data.type === 'text' ? 'text' : data.type,
    body: data.text,
    status: 'delivered',
    is_note: false,
    meta: {
      from: data.from,
      from_name: data.from_name,
      timestamp: data.timestamp,
      image: data.image,
      audio: data.audio,
      document: data.document,
    },
  })
}

async function processStatus(ev: any) {
  const { data } = ev
  await admin
    .from('messages')
    .update({ status: data.status })
    .eq('external_id', data.external_id)
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function findOrCreateContact(workspaceId: string, info: { phone?: string; name?: string; facebookId?: string; instagramUsername?: string }) {
  // Try finding by phone
  if (info.phone) {
    const { data: existing } = await admin
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('phone', info.phone)
      .maybeSingle()
    if (existing) return existing
  }

  // Try finding by facebook_id
  if (info.facebookId) {
    const { data: existing } = await admin
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('facebook_id', info.facebookId)
      .maybeSingle()
    if (existing) return existing
  }

  // Create new contact
  const { data: created } = await admin
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      phone: info.phone ?? null,
      name: info.name ?? info.phone ?? info.facebookId ?? 'Unknown',
      facebook_id: info.facebookId ?? null,
      instagram_username: info.instagramUsername ?? null,
    })
    .select()
    .single()

  return created
}

async function findOrCreateConversation(
  channel: any,
  contactId: string,
  info: { platform: string; lastMessage: string; lastMessageAt: string }
) {
  // Look for existing open/pending conversation
  const { data: existing } = await admin
    .from('conversations')
    .select('*')
    .eq('channel_id', channel.id)
    .eq('contact_id', contactId)
    .in('status', ['open', 'pending'])
    .maybeSingle()

  if (existing) {
    await admin
      .from('conversations')
      .update({
        last_message: info.lastMessage,
        last_message_at: info.lastMessageAt,
        unread_count: (existing.unread_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return existing
  }

  // Create new conversation
  const { data: created } = await admin
    .from('conversations')
    .insert({
      workspace_id: channel.workspace_id,
      contact_id: contactId,
      channel_id: channel.id,
      platform: info.platform,
      status: 'open',
      last_message: info.lastMessage,
      last_message_at: info.lastMessageAt,
      unread_count: 1,
    })
    .select()
    .single()

  return created
}

// Export helpers for use by other webhook routes
export { findOrCreateContact, findOrCreateConversation }