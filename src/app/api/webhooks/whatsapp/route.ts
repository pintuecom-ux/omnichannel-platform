/**
 * src/app/api/webhooks/whatsapp/route.ts
 *
 * CALLING ADDITIONS:
 *  - processCall(): handles inbound `calls` webhook field events
 *    Stores call state changes (ringing, connected, ended, missed, failed)
 *    as 'call' content_type messages so they appear in the chat timeline.
 *  - SDP answer is forwarded to the client via Supabase Realtime broadcast
 *    so the WebRTC peer connection can complete the handshake.
 *
 * Make sure "calls" is subscribed in Meta App Dashboard:
 *   App → WhatsApp → Webhooks → calls ✓
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
    events.map(ev => {
      if (ev.type === 'message') return processMessage(ev).catch(e => console.error('[WA] processMessage error:', e))
      if (ev.type === 'status')  return processStatus(ev).catch(e => console.error('[WA] processStatus error:', e))
      if (ev.type === 'call')    return processCall(ev).catch(e => console.error('[WA] processCall error:', e))
      return Promise.resolve()
    })
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

  if (data.type === 'unsupported') {
    return null
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

  if (data.conversation) updates.meta = { conversation: data.conversation, pricing: data.pricing }

  await admin.from('messages').update(updates).eq('external_id', data.external_id)

  if (data.status === 'failed' && data.errors) {
    await admin.from('messages')
      .update({ meta: { errors: data.errors } })
      .eq('external_id', data.external_id)
  }
}

// ── Process a call event (NEW) ────────────────────────────────────────────────
async function processCall(ev: any) {
  const { phoneNumberId, data } = ev

  console.log(`[WA Call] event: ${data.status} call_id: ${data.call_id}`)

  // Find the channel this call belongs to
  const { data: channel } = await admin
    .from('channels')
    .select('id, workspace_id')
    .eq('platform', 'whatsapp')
    .eq('external_id', phoneNumberId)
    .maybeSingle()

  if (!channel) {
    console.error(`[WA Call] No channel for phone_number_id: ${phoneNumberId}`)
    return
  }

  // Resolve conversation from callback_data (conv:uuid) or from phone number
  let conversationId: string | null = null

  if (data.callback_data?.startsWith('conv:')) {
    conversationId = data.callback_data.replace('conv:', '')
  } else if (data.from) {
    // Try to find conversation by caller's phone
    const phone = data.from.replace(/^\+/, '')
    const { data: conv } = await admin
      .from('conversations')
      .select('id')
      .eq('channel_id', channel.id)
      .eq('workspace_id', channel.workspace_id)
      .limit(1)
      .maybeSingle()
    conversationId = conv?.id ?? null
  }

  if (!conversationId) {
    console.warn('[WA Call] Could not resolve conversation for call event')
    return
  }

  // Map call status to human-readable body
  const callBodyMap: Record<string, string> = {
    ringing:    '📞 Call ringing…',
    accepted:   '📞 Call accepted',
    connecting: '📞 Call connecting…',
    connected:  '📞 Call connected',
    ended:      `📞 Call ended${data.duration ? ` (${formatDuration(data.duration)})` : ''}`,
    missed:     '📞 Missed call',
    failed:     '📞 Call failed',
    rejected:   '📞 Call rejected',
    terminated: '📞 Call ended',
  }

  const body = callBodyMap[data.status] ?? `📞 Call ${data.status}`

  // For terminal events, update existing call message if one exists
  const terminalEvents = ['ended', 'missed', 'failed', 'rejected', 'terminated']

  if (terminalEvents.includes(data.status)) {
    // Try to update existing call_started message first
    const { data: existing } = await admin
      .from('messages')
      .select('id, meta')
      .eq('conversation_id', conversationId)
      .eq('content_type', 'call')
      .contains('meta', { call_id: data.call_id })
      .maybeSingle()

    if (existing) {
      await admin.from('messages').update({
        body,
        meta: {
          ...existing.meta,
          call_event: data.status,
          duration:   data.duration ?? null,
          reason:     data.reason ?? null,
          ended_at:   data.timestamp,
        },
      }).eq('id', existing.id)

      // Update conversation last_message
      await admin.from('conversations').update({
        last_message:    body,
        last_message_at: data.timestamp,
        updated_at:      new Date().toISOString(),
      }).eq('id', conversationId)

      console.log(`[WA Call] Updated call message to: ${data.status}`)
    } else {
      // No existing message — insert a new terminal call record
      await insertCallMessage(conversationId, channel.workspace_id, body, data)
    }
  } else {
    // Non-terminal events: ringing, connected, connecting
    // Check idempotency on call_id + status pair
    const { data: dup } = await admin
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .contains('meta', { call_id: data.call_id, call_event: data.status })
      .maybeSingle()

    if (!dup) {
      await insertCallMessage(conversationId, channel.workspace_id, body, data)
    }
  }

  // ── Forward SDP answer to client via Realtime broadcast ──
  // When status is 'connecting' and session.sdp is present, the WebRTC
  // RTCPeerConnection needs to receive the remote SDP answer to establish media.
  // We broadcast it on a channel the useWhatsAppCall hook is listening to.
  if (data.session?.sdp && data.session?.sdp_type === 'answer') {
    await admin
      .channel(`call:${data.call_id}`)
      .send({
        type: 'broadcast',
        event: 'sdp_answer',
        payload: {
          call_id:  data.call_id,
          sdp_type: data.session.sdp_type,
          sdp:      data.session.sdp,
        },
      })
    console.log(`[WA Call] SDP answer broadcasted for call: ${data.call_id}`)
  }
}

async function insertCallMessage(
  conversationId: string,
  workspaceId: string,
  body: string,
  data: any
) {
  await admin.from('messages').insert({
    conversation_id: conversationId,
    workspace_id:    workspaceId,
    direction:       data.from ? 'inbound' : 'outbound',
    content_type:    'call',
    body,
    status:          'delivered',
    is_note:         false,
    meta: {
      call_event: data.status,
      call_id:    data.call_id,
      from_phone: data.from ?? null,
      to_phone:   data.to ?? null,
      duration:   data.duration ?? null,
      reason:     data.reason ?? null,
    },
  })

  await admin.from('conversations').update({
    last_message:    body,
    last_message_at: data.timestamp,
    updated_at:      new Date().toISOString(),
  }).eq('id', conversationId)
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
