/**
 * src/app/api/webhooks/whatsapp/route.ts
 *
 * FIXES IN THIS VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 * Issue 2a — "Call undefined" in message bubble:
 *   Meta sends call status in UPPERCASE (RINGING, COMPLETED, MISSED, etc.)
 *   but our callBodyMap and callEvent stored in meta were using lowercase keys.
 *   Fix: normalise status to lowercase immediately on entry to processCall().
 *
 * Issue 2b — Voice not working (SDP answer never reaches the browser):
 *   The previous code used `admin.channel('call:ID').send(...)` to broadcast
 *   the SDP answer. This DOES NOT WORK in a serverless Next.js API route because
 *   the Supabase JS client's Realtime module requires a persistent WebSocket
 *   connection, which serverless functions don't maintain.
 *
 *   Fix: Use Supabase's Realtime REST Broadcast API instead:
 *     POST {SUPABASE_URL}/realtime/v1/api/broadcast
 *   This is an HTTP endpoint — it works in serverless environments and delivers
 *   the message to all subscribed clients immediately.
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

/* -------------------------------------------------------------------------- */
/* Verification                                                               */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* Events dispatcher                                                          */
/* -------------------------------------------------------------------------- */
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
      if (ev.type === 'message') return processMessage(ev).catch(e => console.error('[WA] processMessage:', e))
      if (ev.type === 'status')  return processStatus(ev).catch(e =>  console.error('[WA] processStatus:',  e))
      if (ev.type === 'call')    return processCall(ev).catch(e =>    console.error('[WA] processCall:',    e))
      return Promise.resolve()
    })
  )
}

/* -------------------------------------------------------------------------- */
/* Helpers for message processing                                             */
/* -------------------------------------------------------------------------- */
function extractMessageBody(data: any): string | null {
  if (data.text)   return data.text
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

  if (data.contacts?.length > 0) {
    return `[Contact: ${data.contacts[0]?.name?.formatted_name ?? 'Contact'}]`
  }

  const mediaObj = data.image ?? data.video ?? data.audio ?? data.document ?? data.sticker ?? null
  if (mediaObj) return mediaObj.caption ?? null

  if (data.location) {
    return `[Location: ${data.location.name ?? data.location.address ?? 'shared location'}]`
  }

  if (data.reaction) return `[Reaction: ${data.reaction.emoji ?? '👍'}]`
  if (data.type === 'unsupported') return null

  return null
}

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

/* -------------------------------------------------------------------------- */
/* processMessage                                                             */
/* -------------------------------------------------------------------------- */
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

  // Idempotency
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

  // Atomic unread increment (uses RPC from migration 003 if available)
  const { error: rpcErr } = await admin.rpc('increment_unread', { conv_id: conv.id })
  if (rpcErr) {
    await admin
      .from('conversations')
      .update({ unread_count: (conv.unread_count || 0) + 1 })
      .eq('id', conv.id)
  }

  // Resolve media
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

      const { error: stErr } = await admin.storage
        .from('media')
        .upload(path, bytes, { contentType: mime_type, upsert: true })

      if (stErr) { mediaUrl = url }
      else {
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
  if (data.button)   meta.button   = data.button
  if (data.order)    meta.order    = data.order
  if (data.reaction) meta.reaction = data.reaction
  if (data.location) meta.location = data.location
  if (data.contacts) meta.contacts = data.contacts
  if (data.context) {
    meta.context = {
      message_id: data.context.message_id ?? data.context.id,
      from:       data.context.from ?? null,
      type:       data.context.type ?? null,
    }
  }

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

/* -------------------------------------------------------------------------- */
/* processStatus                                                              */
/* -------------------------------------------------------------------------- */
async function processStatus(ev: any) {
  const { data } = ev
  if (!data.external_id) return

  const { error: statusErr } = await admin
    .from('messages')
    .update({ status: data.status })
    .eq('external_id', data.external_id)

  if (statusErr) {
    console.error('[WA] Status update error:', statusErr.message)
    return
  }

  if (data.conversation || data.pricing) {
    const { error: mergeErr } = await admin.rpc('merge_message_meta', {
      msg_external_id: data.external_id,
      extra_meta: {
        ...(data.conversation ? { wa_conversation: data.conversation } : {}),
        ...(data.pricing      ? { wa_pricing: data.pricing }           : {}),
      },
    })
    if (mergeErr) console.debug('[WA] merge_message_meta (optional):', mergeErr.message)
  }

  if (data.status === 'failed' && data.errors) {
    const { error: errMergeErr } = await admin.rpc('merge_message_meta', {
      msg_external_id: data.external_id,
      extra_meta: { errors: data.errors },
    })
    if (errMergeErr) console.warn('[WA] Failed message errors (could not merge):', data.errors)
  }
}

/* -------------------------------------------------------------------------- */
/* processCall — FIX: normalise status, use Realtime REST for SDP broadcast  */
/* -------------------------------------------------------------------------- */
async function processCall(ev: any) {
  const { phoneNumberId, data } = ev

  // ── FIX Issue 2a: Meta sends status in UPPERCASE ──────────────────────────
  // "COMPLETED", "RINGING", "MISSED", etc.
  // Normalise to lowercase so callBodyMap lookups always succeed.
  const rawStatus: string = data.status ?? ''
  const status = rawStatus.toLowerCase()   // ← THE FIX

  console.log(`[WA Call] event: ${status} | call_id: ${data.call_id}`)

  // Find channel
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

  // Resolve conversation — prefer callback_data, fallback to caller's phone
  let conversationId: string | null = null

  if (data.callback_data?.startsWith('conv:')) {
    conversationId = data.callback_data.replace('conv:', '')
  } else if (data.from) {
    const callerPhone = data.from.replace(/^\+/, '')
    const { data: contact } = await admin
      .from('contacts')
      .select('id')
      .eq('workspace_id', channel.workspace_id)
      .eq('phone', callerPhone)
      .maybeSingle()

    if (contact) {
      const { data: conv } = await admin
        .from('conversations')
        .select('id')
        .eq('channel_id', channel.id)
        .eq('contact_id', contact.id)
        .maybeSingle()
      conversationId = conv?.id ?? null
    }
  }

  if (!conversationId) {
    console.warn('[WA Call] Could not resolve conversation — dropping event')
    return
  }

  // ── Map normalised status to human-readable body ──────────────────────────
  // All keys are now lowercase so they match the normalised status.
  const duration = data.duration
  const callBodyMap: Record<string, string> = {
    ringing:    '📞 Call ringing…',
    accepted:   '📞 Call accepted',
    connecting: '📞 Call connecting…',
    connected:  '📞 Call connected',
    initiated:  '📞 Call initiated',
    // terminal events
    ended:      `📞 Call ended${duration ? ` (${formatDuration(duration)})` : ''}`,
    completed:  `📞 Call ended${duration ? ` (${formatDuration(duration)})` : ''}`,
    missed:     '📞 Missed call',
    failed:     '📞 Call failed',
    rejected:   '📞 Call rejected',
    terminated: '📞 Call ended',
    cancelled:  '📞 Call cancelled',
    busy:       '📞 Contact is busy',
  }

  // Guarantee we never fall through to "Call undefined"
  const body = callBodyMap[status] ?? `📞 Call ${status || 'event'}`

  // ── Terminal states: update existing message or insert new one ────────────
  const terminalStatuses = ['ended', 'completed', 'missed', 'failed', 'rejected', 'terminated', 'cancelled']
  const isTerminal = terminalStatuses.includes(status)

  if (isTerminal) {
    const { data: existing } = await admin
      .from('messages')
      .select('id, meta')
      .eq('conversation_id', conversationId)
      .eq('content_type', 'call')
      .contains('meta', { call_id: data.call_id })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      await admin
        .from('messages')
        .update({
          body,
          meta: {
            ...(existing.meta ?? {}),
            call_event: status,
            duration:   data.duration ?? null,
            reason:     data.reason ?? null,
            ended_at:   data.timestamp,
          },
        })
        .eq('id', existing.id)

      console.log(`[WA Call] Updated call message → ${status}`)
    } else {
      await insertCallMessage(conversationId, channel.workspace_id, body, data, status)
    }
  } else {
    // Non-terminal (ringing, connecting, connected, etc.)
    // Check idempotency to avoid duplicate rows
    const { data: dup } = await admin
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('content_type', 'call')
      .contains('meta', { call_id: data.call_id, call_event: status })
      .maybeSingle()

    if (!dup) {
      await insertCallMessage(conversationId, channel.workspace_id, body, data, status)
    }
  }

  // Update conversation last_message for all events
  await admin
    .from('conversations')
    .update({
      last_message:    body,
      last_message_at: data.timestamp ?? new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    })
    .eq('id', conversationId)

  // ── FIX Issue 2b: Forward SDP answer via Realtime REST Broadcast API ──────
  //
  // WHY THIS WAS BROKEN:
  //   admin.channel('call:X').send(...)  requires a live WebSocket connection.
  //   A serverless Next.js function closes immediately — no persistent socket.
  //   The SDP answer was never reaching the browser, so WebRTC never completed.
  //
  // FIX: Supabase's REST broadcast endpoint works over plain HTTP.
  //   It fires-and-forgets a broadcast to all subscribed clients.
  //   The useWhatsAppCall hook listens on channel `call:{callId}` and
  //   calls pc.setRemoteDescription() when it receives this event.
  //
  if (data.session?.sdp && data.session?.sdp_type === 'answer' && data.call_id) {
    await broadcastSdpAnswer(data.call_id, data.session.sdp, data.session.sdp_type)
  }
}

/* -------------------------------------------------------------------------- */
/* Supabase Realtime REST Broadcast — works in serverless                    */
/* -------------------------------------------------------------------------- */
async function broadcastSdpAnswer(callId: string, sdp: string, sdpType: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // The topic must match exactly what the client subscribes to.
  // Client code: supabase.channel(`call:${callId}`)
  // The Realtime REST API prefixes topics with "realtime:"
  const topic = `realtime:call:${callId}`

  try {
    const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey':         serviceKey,
      },
      body: JSON.stringify({
        messages: [
          {
            topic,
            event:   'sdp_answer',
            payload: {
              call_id:  callId,
              sdp_type: sdpType,
              sdp,
            },
          },
        ],
      }),
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error(`[WA Call] Realtime broadcast failed (${res.status}):`, txt)
    } else {
      console.log(`[WA Call] SDP answer broadcasted for call: ${callId}`)
    }
  } catch (e: any) {
    console.error('[WA Call] Realtime broadcast error:', e.message)
  }
}

/* -------------------------------------------------------------------------- */
/* insertCallMessage                                                          */
/* -------------------------------------------------------------------------- */
async function insertCallMessage(
  conversationId: string,
  workspaceId:    string,
  body:           string,
  data:           any,
  normalisedStatus: string  // already lowercase
) {
  const { error } = await admin.from('messages').insert({
    conversation_id: conversationId,
    workspace_id:    workspaceId,
    direction:       data.from ? 'inbound' : 'outbound',
    content_type:    'call',   // requires migration 005
    body,
    status:          'delivered',
    is_note:         false,
    meta: {
      call_event: normalisedStatus,    // always lowercase — matches callBodyMap + MessageBubble
      call_id:    data.call_id,
      from_phone: data.from   ?? null,
      to_phone:   data.to     ?? null,
      duration:   data.duration ?? null,
      reason:     data.reason ?? null,
    },
  })

  if (error) console.error('[WA Call] insertCallMessage error:', error.message)
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
