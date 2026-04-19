/**
 * WhatsApp Webhook Route
 *
 * Bugs fixed vs original:
 *  BUG-03: Now processes interactive/button/order messages and extracts readable body
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
    // Must await BEFORE returning 200 — Vercel terminates after response
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
// FIX BUG-03: proper extraction for interactive/button/flow/order messages
function extractMessageBody(data: any): string | null {
  // Plain text
  if (data.text) return data.text

  // Quick-reply button click (from template buttons)
  if (data.button) {
    return data.button.text ?? null
  }

  // Interactive message (button reply, list reply, flow completion)
  if (data.interactive) {
    const iv = data.interactive
    switch (iv.type) {
      case 'button_reply':
        // User clicked a reply button
        return iv.button_reply?.title ?? '[Button Reply]'
      case 'list_reply':
        // User selected from a list
        return iv.list_reply?.title ?? iv.list_reply?.id ?? '[List Reply]'
      case 'nfm_reply':
        // Flow completion response
        // body field contains JSON response from the flow
        return `[Flow Response: ${iv.nfm_reply?.name ?? 'submitted'}]`
      default:
        return `[Interactive: ${iv.type}]`
    }
  }

  // Order message
  if (data.order) {
    const items = data.order.product_items ?? []
    return `[Order: ${items.length} item${items.length !== 1 ? 's' : ''}]`
  }

  // Contacts
  if (data.contacts && data.contacts.length > 0) {
    const name = data.contacts[0]?.name?.formatted_name ?? 'Contact'
    return `[Contact: ${name}]`
  }

  // Media — use caption if present
  const mediaObj = data.image ?? data.video ?? data.audio ?? data.document ?? data.sticker ?? null
  if (mediaObj) return mediaObj.caption ?? null

  // Location
  if (data.location) {
    return `[Location: ${data.location.name ?? data.location.address ?? 'shared location'}]`
  }

  // Reaction
  if (data.reaction) {
    return `[Reaction: ${data.reaction.emoji ?? '👍'}]`
  }

  return null
}

// ── Determine DB content_type from parsed message data ──────────────────────
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
    default:            return 'text'
  }
}

// ── Process a single inbound message ─────────────────────────────────────────
async function processMessage(ev: any) {
  const { phoneNumberId, data } = ev

  // 1. Find channel by phone_number_id
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

  // 2. Idempotency
  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()
  if (exists) return

  // 3. Upsert contact
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

  // 4. Upsert conversation
  const bodyText = extractMessageBody(data) ?? `[${data.type}]`
  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .upsert(
      {
        workspace_id:    channel.workspace_id,
        contact_id:      contact.id,
        channel_id:      channel.id,
        platform:        'whatsapp',
        status:          'open',
        last_message:    bodyText,
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

  await admin
    .from('conversations')
    .update({ unread_count: (conv.unread_count || 0) + 1 })
    .eq('id', conv.id)

  // 5. Resolve media URL (images, video, audio, documents)
  let mediaUrl:  string | null = null
  let mediaMime: string | null = null

  const mediaObj = data.image ?? data.video ?? data.audio ?? data.document ?? data.sticker ?? null
  if (mediaObj?.id) {
    try {
      const waClient = new WhatsAppClient(channel.access_token, phoneNumberId)
      // FIX BUG-01: getMediaUrl now includes phone_number_id
      const { url, mime_type } = await waClient.getMediaUrl(mediaObj.id)

      // Download and persist to Supabase Storage
      const bytes = await waClient.downloadMedia(url)
      const ext   = (mime_type?.split('/')[1]?.split(';')[0] ?? 'bin').replace(/[^a-z0-9]/g, '')
      const path  = `${channel.workspace_id}/${conv.id}/${data.external_id}.${ext}`

      const { error: storageErr } = await admin.storage
        .from('media')
        .upload(path, bytes, { contentType: mime_type, upsert: true })

      if (storageErr) {
        console.warn('[WA] Storage upload failed, using WA URL directly:', storageErr.message)
        mediaUrl = url   // temp URL — will expire in ~5 min
      } else {
        const { data: pub } = admin.storage.from('media').getPublicUrl(path)
        mediaUrl = pub.publicUrl
      }
      mediaMime = mime_type
    } catch (e: any) {
      console.warn('[WA] Media fetch error (non-critical):', e.message)
    }
  }

  // 6. Build full meta for storage (includes flow response data, interactive data, etc.)
  const meta: Record<string, any> = {
    from:      phone,
    from_name: data.from_name,
    filename:  data.document?.filename ?? null,
  }

  // FIX BUG-03: preserve flow response data
  if (data.interactive) {
    meta.interactive_type = data.interactive.type
    if (data.interactive.nfm_reply) {
      // Flow completion — store the response JSON
      meta.flow_response = data.interactive.nfm_reply
    }
    if (data.interactive.button_reply) meta.button_reply = data.interactive.button_reply
    if (data.interactive.list_reply)   meta.list_reply   = data.interactive.list_reply
  }
  if (data.button)   meta.button    = data.button
  if (data.order)    meta.order     = data.order
  if (data.context)  meta.context   = data.context
  if (data.reaction) meta.reaction  = data.reaction
  if (data.location) meta.location  = data.location
  if (data.contacts) meta.contacts  = data.contacts

  // 7. Insert message
  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conv.id,
    workspace_id:    channel.workspace_id,
    external_id:     data.external_id,
    direction:       'inbound',
    content_type:    getContentType(data),
    body:            bodyText !== `[${data.type}]` ? bodyText : (data.text ?? null),
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

  await admin
    .from('messages')
    .update({ status: data.status })
    .eq('external_id', data.external_id)

  // If status failed, store error info
  if (data.status === 'failed' && data.errors) {
    await admin
      .from('messages')
      .update({ meta: { errors: data.errors } })
      .eq('external_id', data.external_id)
  }
}
