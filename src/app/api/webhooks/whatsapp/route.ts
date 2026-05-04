/**
 * src/app/api/webhooks/whatsapp/route.ts
 *
 * FIXES IN THIS VERSION:
 *
 * Issue 2 (No voice / "Call undefined"):
 *   Meta sends call status in UPPERCASE: COMPLETED, RINGING, CONNECTED etc.
 *   callBodyMap only had lowercase keys → body was always undefined → "Call undefined"
 *   FIX: normalise status to lowercase before all lookups.
 *
 * Issue 2 (SDP answer not reaching browser):
 *   admin.channel().send() opens a WebSocket — impossible in serverless routes.
 *   FIX: Use Supabase Realtime REST broadcast endpoint (HTTP POST, no socket needed).
 *
 * Issue 3 (No DB call logs):
 *   content_type 'call' was missing from the DB check constraint.
 *   FIX: Run migration 005_add_call_content_type.sql first, then this file.
 *
 * Issue 4 (send_call_permission_request invalid):
 *   That action does NOT exist on POST /calls. It only appears as an informational
 *   field in the GET /call_permissions response. The whatsapp.ts method that
 *   tried to POST it has been removed / replaced in whatsapp.ts.
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
    console.error('[WA Webhook] Fatal parse error:', err)
    return NextResponse.json({ status: 'error_logged' })
  }
}

async function handleEvents(body: any) {
  const events = parseWhatsAppWebhook(body)
  await Promise.all(
    events.map(ev => {
      if (ev.type === 'message') return processMessage(ev).catch(e => console.error('[WA] processMessage error:', e))
      if (ev.type === 'status')  return processStatus(ev).catch(e  => console.error('[WA] processStatus error:',  e))
      if (ev.type === 'call')    return processCall(ev).catch(e    => console.error('[WA] processCall error:',    e))
    })
  )
}

// ── Extract human-readable body ───────────────────────────────────────────────
function extractMessageBody(data: any): string | null {
  if (data.text)    return data.text
  if (data.button)  return data.button.text ?? null
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
  if (data.location) return `[Location: ${data.location.name ?? data.location.address ?? 'shared location'}]`
  if (data.reaction) return `[Reaction: ${data.reaction.emoji ?? '👍'}]`
  if (data.type === 'unsupported') data.meta.raw_type = data.type
  return null
}

function getContentType(data: any): string {
  const map: Record<string, string> = {
    text: 'text', image: 'image', video: 'video', audio: 'audio',
    document: 'document', sticker: 'sticker', location: 'location',
    reaction: 'reaction', interactive: 'interactive', button: 'button',
    order: 'order', contacts: 'contacts', unsupported: 'unsupported',
  }
  return map[data.type] ?? 'text'
}

// ── Process inbound message ───────────────────────────────────────────────────
async function processMessage(ev: any) {
  const { phoneNumberId, data } = ev

  const { data: channel, error: channelErr } = await admin
    .from('channels')
    .select('id, workspace_id, access_token')
    .eq('platform', 'whatsapp')
    .eq('external_id', phoneNumberId)
    .maybeSingle()

  if (channelErr || !channel) {
    console.error(`[WA] No channel for phone_number_id: ${phoneNumberId}`, channelErr?.message)
    return
  }

  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()
  if (exists) {
    console.log(`[WA] Already processed message ${data.external_id} — skipping`)
    return
  }

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
    console.error('[WA] Contact upsert error:', contactErr?.message)
    return
  }

  const bodyText = extractMessageBody(data)

  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .upsert(
      {
        workspace_id:    channel.workspace_id,
        contact_id:      contact.id,
        channel_id:      channel.id,
        platform:        'whatsapp',
        status:          'open',
        last_message:    bodyText ?? (data.type === 'unsupported' ? { raw_type: data.type, wa_type: data.type } : {}),
        last_message_at: data.timestamp,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'channel_id,contact_id', ignoreDuplicates: false }
    )
    .select('id, unread_count')
    .single()

  if (convErr || !conv) {
    console.error('[WA] Conversation upsert error:', convErr?.message)
    return
  }

  // Atomic unread increment
  const { error: unreadErr } = await admin.rpc('increment_unread', { conv_id: conv.id })
  if (unreadErr) {
    console.warn('[WA] RPC increment_unread failed, using fallback:', unreadErr.message)
    await admin.from('conversations').update({ unread_count: (conv.unread_count || 0) + 1 }).eq('id', conv.id)
  }

  // Media upload
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
      const { error: storageErr } = await admin.storage.from('media').upload(path, bytes, { contentType: mime_type, upsert: true })
      if (storageErr) { mediaUrl = url } else { mediaUrl = admin.storage.from('media').getPublicUrl(path).data.publicUrl }
      mediaMime = mime_type
    } catch (e: any) {
      console.warn('[WA] Media fetch error (non-critical):', e.message)
    }
  }

  const meta: Record<string, any> = { from: phone, from_name: data.from_name, filename: data.document?.filename ?? null }
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
  if (data.context)  meta.context  = { message_id: data.context.message_id ?? data.context.id, from: data.context.from ?? null }

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

  if (msgErr) console.error('[WA] Message insert error:', msgErr.message)
  else        console.log(`[WA] ✅ ${data.type} from ${phone} → conv ${conv.id}`)
}

// ── Process status update ─────────────────────────────────────────────────────
async function processStatus(ev: any) {
  const { data } = ev
  if (!data.external_id) return

  const { error: statusErr } = await admin
    .from('messages')
    .update({ status: data.status })
    .eq('external_id', data.external_id)

  if (statusErr) { console.error('[WA] Status update error:', statusErr.message); return }

  if (data.conversation || data.pricing) {
    const { error: mergeErr } = await admin.rpc('merge_message_meta', {
      msg_external_id: data.external_id,
      extra_meta: {
        ...(data.conversation ? { wa_conversation: data.conversation } : {}),
        ...(data.pricing      ? { wa_pricing: data.pricing }           : {}),
      },
    })
    if (mergeErr) console.debug('[WA] merge_message_meta skipped (optional):', mergeErr.message)
  }

  if (data.status === 'failed' && data.errors) {
    const { error: errMergeErr } = await admin.rpc('merge_message_meta', {
      msg_external_id: data.external_id,
      extra_meta: { errors: data.errors },
    })
    if (errMergeErr) console.warn('[WA] Failed message errors (could not merge):', data.errors)
  }

  console.log(`[WA] Status: ${data.external_id} → ${data.status}`)
}

// ── Process call event ────────────────────────────────────────────────────────
async function processCall(ev: any) {
  const { phoneNumberId, data } = ev

  // Meta sends call status as UPPERCASE — normalise to lowercase for all lookups
  const rawStatus  = data.status ?? ''
  const status     = rawStatus.toLowerCase()

  console.log(`[WA Call] event: ${status} (raw: ${rawStatus}) call_id: ${data.call_id}`)

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

  // Resolve conversation from callback_data or caller phone
  let conversationId: string | null = null

  if (data.callback_data?.startsWith('conv:')) {
    conversationId = data.callback_data.replace('conv:', '')
  } else if (data.from) {
    const phone = (data.from as string).replace(/^\+/, '')
    const { data: contactRow } = await admin
      .from('contacts')
      .select('id')
      .eq('workspace_id', channel.workspace_id)
      .eq('phone', phone)
      .maybeSingle()

    if (contactRow) {
      const { data: convRow } = await admin
        .from('conversations')
        .select('id')
        .eq('channel_id', channel.id)
        .eq('contact_id', contactRow.id)
        .maybeSingle()
      conversationId = convRow?.id ?? null
    }
  }

  if (!conversationId) {
    console.warn('[WA Call] Could not resolve conversation — no callback_data and no matching contact')
    return
  }

  // FIX (Issue 2): callBodyMap uses lowercase keys. Status is now lowercase.
  const callBodyMap: Record<string, string> = {
    ringing:    '📞 Call ringing…',
    accepted:   '📞 Call accepted',
    connecting: '📞 Call connecting…',
    connected:  '📞 Call connected',
    completed:  `📞 Call ended${data.duration ? ` (${formatDuration(data.duration)})` : ''}`,
    ended:      `📞 Call ended${data.duration ? ` (${formatDuration(data.duration)})` : ''}`,
    missed:     '📵 Missed call',
    failed:     '❌ Call failed',
    rejected:   '🚫 Call rejected',
    terminated: '📞 Call ended',
    canceled:   '📞 Call cancelled',
    busy:       '📵 Contact is busy',
    no_answer:  '📵 No answer',
    permission_requested: '🔔 Call permission requested',
  }

  const body = callBodyMap[status] ?? `📞 Call ${status}`

  const terminalStatuses = ['ended', 'completed', 'missed', 'failed', 'rejected', 'terminated', 'canceled', 'busy', 'no_answer']
  const isTerminal = terminalStatuses.includes(status)

  if (isTerminal) {
    // Update the existing call message for this call_id
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
      await admin.from('messages').update({
        body,
        meta: {
          ...existing.meta,
          call_event: status,
          duration:   data.duration ?? null,
          reason:     data.reason   ?? null,
          ended_at:   data.timestamp,
        },
      }).eq('id', existing.id)
      console.log(`[WA Call] Updated call message → ${status}`)
    } else {
      await insertCallMessage(conversationId, channel.workspace_id, body, data, status)
    }

    // ── Update call_logs with terminal status ──────────────────────────────
    const { data: existingLog } = await admin
      .from('call_logs')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('call_id', data.call_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingLog) {
      await admin.from('call_logs').update({
        status:           status,
        duration_seconds: data.duration ?? null,
        ended_at:         data.timestamp ?? new Date().toISOString(),
        meta:             { call_event: status, reason: data.reason ?? null },
        updated_at:       new Date().toISOString(),
      }).eq('id', existingLog.id)
    } else {
      // Insert new log if none found (e.g. missed call with no prior ringing event)
      await admin.from('call_logs').insert({
        workspace_id:     channel.workspace_id,
        conversation_id:  conversationId,
        call_id:          data.call_id,
        direction:        data.from ? 'inbound' : 'outbound',
        status:           status,
        from_phone:       data.from ? (data.from as string).replace(/^\+/, '') : null,
        to_phone:         data.to   ? (data.to   as string).replace(/^\+/, '') : null,
        duration_seconds: data.duration ?? null,
        started_at:       data.timestamp ?? new Date().toISOString(),
        ended_at:         data.timestamp ?? new Date().toISOString(),
        meta:             { call_event: status, reason: data.reason ?? null },
      }).then(({ error }) => {
        if (error) console.warn('[WA Call] call_logs terminal insert warning:', error.message)
      })
    }

  } else if (status === 'ringing' || status === 'connecting' || status === 'connected') {
    // Non-terminal: only insert message once per call_id + status pair
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


    // ── call_logs + inbound broadcast ────────────────────────────────────────
    if (status === 'ringing') {
      // Insert call_log row (deduplicated by call_id)
      const { data: existingLog } = await admin
        .from('call_logs')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('call_id', data.call_id)
        .maybeSingle()

      if (!existingLog) {
        await admin.from('call_logs').insert({
          workspace_id:    channel.workspace_id,
          conversation_id: conversationId,
          call_id:         data.call_id,
          direction:       data.from ? 'inbound' : 'outbound',
          status:          'ringing',
          from_phone:      data.from ? (data.from as string).replace(/^\+/, '') : null,
          to_phone:        data.to   ? (data.to   as string).replace(/^\+/, '') : null,
          started_at:      data.timestamp ?? new Date().toISOString(),
          meta:            { call_event: 'ringing' },
        }).then(({ error }) => {
          if (error) console.warn('[WA Call] call_logs ringing insert warning:', error.message)
        })
      }

      // Only broadcast inbound ringing (data.from = someone calling you)
      if (data.from) {
        const callerPhone = (data.from as string).replace(/^\+/, '')
        const { data: contactRow } = await admin
          .from('contacts')
          .select('name')
          .eq('workspace_id', channel.workspace_id)
          .eq('phone', callerPhone)
          .maybeSingle()

        await broadcastIncomingCall({
          workspaceId:    channel.workspace_id,
          callId:         data.call_id,
          fromPhone:      callerPhone,
          contactName:    contactRow?.name ?? callerPhone,
          conversationId: conversationId,
          sdp:            data.session?.sdp      ?? null,
          sdpType:        data.session?.sdp_type ?? null,
        })
      }
    } else if (status === 'connected') {
      await admin.from('call_logs')
        .update({ status: 'connected', meta: { call_event: 'connected' }, updated_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('call_id', data.call_id)
        .then(({ error }) => {
          if (error) console.warn('[WA Call] call_logs connected update warning:', error.message)
        })
    }
  }

  // Update conversation preview
  await admin.from('conversations').update({
    last_message:    body,
    last_message_at: data.timestamp ?? new Date().toISOString(),
    updated_at:      new Date().toISOString(),
  }).eq('id', conversationId)

  // ── Forward SDP answer to browser via Realtime REST broadcast ────────────
  // FIX (Issue 2): admin.channel().send() opens a WebSocket — impossible in
  // serverless/edge routes. Use Supabase's HTTP REST broadcast endpoint instead.
  if (data.session?.sdp && data.session?.sdp_type === 'answer') {
    await broadcastSdpAnswer(data.call_id, data.session.sdp_type, data.session.sdp)
  }
}

// ── Realtime REST broadcast ───────────────────────────────────────────────────
// Serverless routes cannot hold a WebSocket connection for Supabase Realtime.
// The REST broadcast endpoint is a single HTTP POST — no socket needed.
// Docs: https://supabase.com/docs/guides/realtime/broadcast#send-messages-using-rest-api
async function broadcastSdpAnswer(callId: string, sdpType: string, sdp: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  try {
    const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey':        serviceKey,
      },
      body: JSON.stringify({
        messages: [
          {
            topic:   `call:${callId}`,
            event:   'sdp_answer',
            payload: { call_id: callId, sdp_type: sdpType, sdp },
          },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.warn(`[WA Call] Realtime broadcast failed (${res.status}): ${text}`)
    } else {
      console.log(`[WA Call] ✅ SDP answer broadcast for call: ${callId}`)
    }
  } catch (e: any) {
    console.error('[WA Call] Realtime broadcast error:', e.message)
  }
}

async function broadcastIncomingCall(opts: {
  workspaceId:    string
  callId:         string
  fromPhone:      string
  contactName:    string
  conversationId: string
  sdp:            string | null
  sdpType:        string | null
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  try {
    const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey':         serviceKey,
      },
      body: JSON.stringify({
        messages: [{
          topic:   `workspace:${opts.workspaceId}`,
          event:   'incoming_call',
          payload: {
            call_id:         opts.callId,
            from_phone:      opts.fromPhone,
            contact_name:    opts.contactName,
            conversation_id: opts.conversationId,
            sdp:             opts.sdp,
            sdp_type:        opts.sdpType,
          },
        }],
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.warn(`[WA Call] incoming_call broadcast failed (${res.status}): ${text}`)
    } else {
      console.log(`[WA Call] ✅ incoming_call broadcast for workspace: ${opts.workspaceId}`)
    }
  } catch (e: any) {
    console.error('[WA Call] broadcastIncomingCall error:', e.message)
  }
}


async function insertCallMessage(
  conversationId: string,
  workspaceId: string,
  body: string,
  data: any,
  status: string        // normalised lowercase
) {
  const { error } = await admin.from('messages').insert({
    conversation_id: conversationId,
    workspace_id:    workspaceId,
    direction:       data.from ? 'inbound' : 'outbound',
    content_type:    'call',           // allowed after migration 005
    body,
    status:          'delivered',
    is_note:         false,
    meta: {
      call_event: status,
      call_id:    data.call_id,
      from_phone: data.from     ?? null,
      to_phone:   data.to       ?? null,
      duration:   data.duration ?? null,
      reason:     data.reason   ?? null,
    },
  })
  if (error) console.error('[WA Call] insertCallMessage error:', error.message)
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}