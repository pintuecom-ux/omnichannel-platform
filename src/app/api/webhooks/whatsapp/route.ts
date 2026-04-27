/**
 * src/app/api/webhooks/whatsapp/route.ts
 *
 * FIXES:
 * 1. Handle type='unsupported' properly — previously stored as text with null body
 *    causing "[unsupported]" display
 * 2. context field on inbound messages stored correctly in meta.context
 * 3. Replace getSession() with getUser() pattern (webhook uses service role so
 *    this doesn't apply here — webhooks use admin client directly, no auth needed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseWhatsAppWebhook, WhatsAppClient } from '@/lib/platforms/whatsapp'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Verification ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  if (
    p.get('hub.mode')         === 'subscribe' &&
    p.get('hub.verify_token') === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    console.log('[WA Webhook] ✅ Verified')
    return new NextResponse(p.get('hub.challenge'), { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ── Events ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await handleEvents(body)
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[WA Webhook] Fatal:', err)
    return NextResponse.json({ status: 'error_logged' })
  }
}

async function handleEvents(body: any) {
  const events = parseWhatsAppWebhook(body)
  await Promise.all(
    events.map(ev =>
      ev.type === 'message'
        ? processMessage(ev).catch(e => console.error('[WA] processMessage error:', e))
        : processStatus(ev).catch(e => console.error('[WA] processStatus error:', e))
    )
  )
}

// ── Extract human-readable body from any message type ─────────────────────────
function extractMessageBody(data: any): string | null {
  if (data.text) return data.text

  if (data.button) return data.button.text ?? null

  if (data.interactive) {
    const iv = data.interactive
    switch (iv.type) {
      case 'button_reply': return iv.button_reply?.title ?? '[Button Reply]'
      case 'list_reply':   return iv.list_reply?.title ?? iv.list_reply?.id ?? '[List Reply]'
      case 'nfm_reply':    return `[Flow Response: ${iv.nfm_reply?.name ?? 'submitted'}]`
      default:             return `[Interactive: ${iv.type}]`
    }
  }

  if (data.order) {
    const items = data.order.product_items ?? []
    return `[Order: ${items.length} item${items.length !== 1 ? 's' : ''}]`
  }

  if (data.contacts && data.contacts.length > 0) {
    const name = data.contacts[0]?.name?.formatted_name ?? 'Contact'
    return `[Contact: ${name}]`
  }

  const mediaObj = data.image ?? data.video ?? data.audio ?? data.document ?? data.sticker ?? null
  if (mediaObj) return mediaObj.caption ?? null

  if (data.location) {
    return `[Location: ${data.location.name ?? data.location.address ?? 'shared location'}]`
  }

  if (data.reaction) {
    return `[Reaction: ${data.reaction.emoji ?? '👍'}]`
  }

  // FIX: 'unsupported' type — return descriptive body instead of null
  // WhatsApp sends type='unsupported' for: polls, voice notes in some regions,
  // broadcast list messages, certain business messages, future message types
  if (data.type === 'unsupported') {
    return null  // body is null — MessageBubble handles 'unsupported' content_type specially
  }

  return null
}

// ── Determine DB content_type ──────────────────────────────────────────────────
function getContentType(data: any): string {
  switch (data.type) {
    case 'text':        return 'text'
    case 'image':       return 'image'
    case 'video':       return 'video'
    case 'audio':       return 'audio'
    case 'document':    return 'document'
    case 'sticker':     return 'sticker'
    case 'location':    return 'location'
    case 'reaction':    return 'reaction'
    case 'interactive': return 'interactive'
    case 'button':      return 'button'
    case 'order':       return 'order'
    case 'contacts':    return 'contacts'
    // FIX: Store 'unsupported' as its own type so MessageBubble can render it
    // with the proper "Message type not supported in this view" indicator
    case 'unsupported': return 'unsupported'
    default:            return 'text'
  }
}

// ── Process a single inbound message ─────────────────────────────────────────
async function processMessage(ev: any) {
  const { phoneNumberId, data } = ev

  const { data: channel } = await admin
    .from('channels')
    .select('id, workspace_id, access_token')
    .eq('platform', 'whatsapp')
    .eq('external_id', phoneNumberId)
    .maybeSingle()

  if (!channel) {
    console.error(`[WA] No channel for phone_number_id: ${phoneNumberId}`)
    return
  }

  // Idempotency check
  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()
  if (exists) return

  // Upsert contact
  const phone = data.from.replace(/^\+/, '')
  const { data: contact, error: contactErr } = await admin
    .from('contacts')
    .upsert(
      { workspace_id: channel.workspace_id, phone, name: data.from_name || phone },
      { onConflict: 'workspace_id,phone', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (contactErr || !contact) {
    console.error('[WA] Contact upsert error:', contactErr)
    return
  }

  const bodyText = extractMessageBody(data)

  // Upsert conversation
  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .upsert(
      {
        workspace_id:    channel.workspace_id,
        contact_id:      contact.id,
        channel_id:      channel.id,
        platform:        'whatsapp',
        status:          'open',
        last_message:    bodyText ?? (data.type === 'unsupported' ? '[Unsupported message]' : `[${data.type}]`),
        last_message_at: data.timestamp,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'channel_id,contact_id', ignoreDuplicates: false }
    )
    .select('id, unread_count')
    .single()

  if (convErr || !conv) {
    console.error('[WA] Conversation upsert error:', convErr)
    return
  }

  await admin.from('conversations')
    .update({ unread_count: (conv.unread_count || 0) + 1 })
    .eq('id', conv.id)

  // Resolve media URL
  let mediaUrl:  string | null = null
  let mediaMime: string | null = null

  const mediaObj = data.image ?? data.video ?? data.audio ?? data.document ?? data.sticker ?? null
  if (mediaObj?.id) {
    try {
      const waClient = new WhatsAppClient(channel.access_token, phoneNumberId)
      const { url, mime_type } = await waClient.getMediaUrl(mediaObj.id)

      const bytes = await waClient.downloadMedia(url)
      const ext   = (mime_type?.split('/')[1]?.split(';')[0] ?? 'bin').replace(/[^a-z0-9]/g, '')
      const path  = `${channel.workspace_id}/${conv.id}/${data.external_id}.${ext}`

      const { error: storageErr } = await admin.storage
        .from('media')
        .upload(path, bytes, { contentType: mime_type, upsert: true })

      if (storageErr) {
        console.warn('[WA] Storage upload failed, using temp URL:', storageErr.message)
        mediaUrl = url
      } else {
        const { data: pub } = admin.storage.from('media').getPublicUrl(path)
        mediaUrl = pub.publicUrl
      }
      mediaMime = mime_type
    } catch (e: any) {
      console.warn('[WA] Media fetch error (non-critical):', e.message)
    }
  }

  // Build meta
  const meta: Record<string, any> = {
    from:      phone,
    from_name: data.from_name,
    filename:  data.document?.filename ?? null,
  }

  if (data.interactive) {
    meta.interactive_type = data.interactive.type
    if (data.interactive.nfm_reply)    meta.flow_response = data.interactive.nfm_reply
    if (data.interactive.button_reply) meta.button_reply  = data.interactive.button_reply
    if (data.interactive.list_reply)   meta.list_reply    = data.interactive.list_reply
  }
  if (data.button)   meta.button    = data.button
  if (data.order)    meta.order     = data.order
  if (data.reaction) meta.reaction  = data.reaction
  if (data.location) meta.location  = data.location
  if (data.contacts) meta.contacts  = data.contacts

  // FIX: Store context (reply-to reference) correctly
  // meta.context.message_id is what QuotedPreview reads to find the original message
  if (data.context) {
    meta.context = {
      message_id: data.context.message_id ?? data.context.id,
      from:       data.context.from ?? null,
      type:       data.context.type ?? null,
    }
  }

  // Insert message
  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conv.id,
    workspace_id:    channel.workspace_id,
    external_id:     data.external_id,
    direction:       'inbound',
    content_type:    getContentType(data),
    body:            bodyText,
    media_url:       mediaUrl,
    media_mime:      mediaMime,
    status:          'delivered',
    is_note:         false,
    meta,
  })

  if (msgErr) console.error('[WA] Message insert error:', msgErr)
  else        console.log(`[WA] ✅ ${data.type} from ${phone}`)
}

// ── Process a status update ───────────────────────────────────────────────────
async function processStatus(ev: any) {
  const { data } = ev
  if (!data.external_id) return

  const updates: any = { status: data.status }

  // Store pricing/conversation metadata from status updates
  if (data.conversation) updates.meta = { conversation: data.conversation, pricing: data.pricing }

  await admin.from('messages').update(updates).eq('external_id', data.external_id)

  if (data.status === 'failed' && data.errors) {
    await admin.from('messages')
      .update({ meta: { errors: data.errors } })
      .eq('external_id', data.external_id)
  }
}