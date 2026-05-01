/**
 * src/app/api/whatsapp/calls/route.ts
 *
 * WhatsApp Cloud API Calling — v23.0
 *
 * Based on YAML spec: /{Version}/{Phone-Number-ID}/call_permissions
 *                 and /{Version}/{Phone-Number-ID}/calls
 *
 * Endpoints exposed:
 *   GET  /api/whatsapp/calls?conversation_id=...
 *     → Checks call permissions for the contact in this conversation.
 *       Returns { permission, actions } from Meta.
 *
 *   POST /api/whatsapp/calls  { conversation_id, action, call_id?, sdp?, sdp_type? }
 *     → Initiates, accepts, rejects, pre-accepts, or terminates a call.
 *       action: 'connect' | 'pre_accept' | 'accept' | 'reject' | 'terminate'
 *
 * PREREQUISITES (from YAML spec):
 *   1. WhatsApp Cloud API Calling must be enabled for your phone number.
 *      Enable via: Business Manager → Phone Numbers → Settings → Calling
 *   2. The contact must have granted call permission (status = 'granted').
 *      If status is 'denied' or 'expired', send a permission request first
 *      using action: 'send_call_permission_request' via the UI.
 *   3. For WebRTC calls (action: 'connect'), you must pass an SDP offer.
 *      The SDP must comply with RFC 8866.
 *
 * ERROR CODES (from YAML spec):
 *   138006 — No call request permission from the WhatsApp user
 *   4/2390008 — Rate limit exceeded for permission checks
 *   403 — Calling not enabled for your phone number
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import axios from 'axios'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE = 'https://graph.facebook.com/v23.0'

/* -------------------------------------------------------------------------- */
/* GET — Check call permissions                                               */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (!user || authErr) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversationId = req.nextUrl.searchParams.get('conversation_id')
  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
  }

  // Load conversation → contact.phone, channel.access_token, channel.external_id
  const { data: conv } = await admin
    .from('conversations')
    .select('platform, contact:contacts(phone), channel:channels(access_token, external_id)')
    .eq('id', conversationId)
    .single()

  if (!conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (conv.platform !== 'whatsapp') {
    return NextResponse.json(
      { error: 'Calling is only supported on WhatsApp conversations' },
      { status: 400 }
    )
  }

  const contact = Array.isArray(conv.contact) ? conv.contact[0] : conv.contact
  const channel = Array.isArray(conv.channel) ? conv.channel[0] : conv.channel

  if (!contact?.phone) {
    return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })
  }

  const phone = contact.phone.replace(/[\s\-\+\(\)]/g, '')

  try {
    // YAML spec: GET /{Version}/{Phone-Number-ID}/call_permissions?user_wa_id={phone}
    const res = await axios.get(
      `${BASE}/${channel.external_id}/call_permissions`,
      {
        params: { user_wa_id: phone },
        headers: { Authorization: `Bearer ${channel.access_token}` },
      }
    )

    const { permission, actions } = res.data

    // Determine whether the user can be called right now
    const canCall = actions?.some(
      (a: any) => a.action_name === 'start_call' && a.can_perform_action === true
    ) ?? false

    const canRequestPermission = actions?.some(
      (a: any) => a.action_name === 'send_call_permission_request' && a.can_perform_action === true
    ) ?? false

    return NextResponse.json({
      permission,
      actions,
      can_call:              canCall,
      can_request_permission: canRequestPermission,
    })
  } catch (err: any) {
    const e = err?.response?.data?.error
    const code    = e?.code ?? 0
    const message = e?.message ?? err.message

    if (code === 403 || err?.response?.status === 403) {
      return NextResponse.json(
        { error: 'WhatsApp Calling is not enabled for this phone number. Enable it in Business Manager → Phone Numbers → Settings → Calling.' },
        { status: 403 }
      )
    }

    if (code === 4 && e?.error_subcode === 2390008) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for call permission checks. Try again shortly.' },
        { status: 429 }
      )
    }

    console.error('[WA Calls] Permission check error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/* -------------------------------------------------------------------------- */
/* POST — Initiate / manage a call                                            */
/* -------------------------------------------------------------------------- */

/**
 * Body:
 * {
 *   conversation_id: string   (required always)
 *   action: 'connect' | 'pre_accept' | 'accept' | 'reject' | 'terminate'
 *   call_id?: string          (required for pre_accept, accept, reject, terminate)
 *   sdp?: string              (required for connect and accept — WebRTC SDP)
 *   sdp_type?: 'offer'|'answer'  (required with sdp)
 *   biz_opaque_callback_data?: string  (optional tracking string, max 512 chars)
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (!user || authErr) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    conversation_id,
    action,
    call_id,
    sdp,
    sdp_type,
    biz_opaque_callback_data,
  } = body

  // Validate
  if (!conversation_id) {
    return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
  }

  const VALID_ACTIONS = ['connect', 'pre_accept', 'accept', 'reject', 'terminate']
  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  // SDP is required for connect (offer) and accept (answer)
  if ((action === 'connect' || action === 'accept') && !sdp) {
    return NextResponse.json(
      { error: `sdp is required for action '${action}'` },
      { status: 400 }
    )
  }

  // call_id is required for everything except 'connect'
  if (action !== 'connect' && !call_id) {
    return NextResponse.json(
      { error: `call_id is required for action '${action}'` },
      { status: 400 }
    )
  }

  // Load conversation
  const { data: conv } = await admin
    .from('conversations')
    .select('platform, contact:contacts(phone), channel:channels(access_token, external_id)')
    .eq('id', conversation_id)
    .single()

  if (!conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (conv.platform !== 'whatsapp') {
    return NextResponse.json(
      { error: 'Calling is only supported on WhatsApp conversations' },
      { status: 400 }
    )
  }

  const contact = Array.isArray(conv.contact) ? conv.contact[0] : conv.contact
  const channel = Array.isArray(conv.channel) ? conv.channel[0] : conv.channel

  if (!contact?.phone) {
    return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })
  }

  const phone = contact.phone.replace(/[\s\-\+\(\)]/g, '')

  try {
    let metaPayload: Record<string, any>

    if (action === 'terminate') {
      // YAML spec: CallTerminateRequestPayload
      metaPayload = {
        messaging_product: 'whatsapp',
        call_id,
        action: 'terminate',
      }
    } else {
      // YAML spec: CallRequestPayload
      metaPayload = {
        messaging_product: 'whatsapp',
        to:     phone,
        action,
      }

      // SDP session for connect / pre_accept / accept
      if (sdp) {
        metaPayload.session = {
          sdp_type: sdp_type ?? (action === 'connect' ? 'offer' : 'answer'),
          sdp,
        }
      }

      if (call_id) {
        metaPayload.call_id = call_id
      }

      if (biz_opaque_callback_data) {
        // Max 512 chars per YAML spec
        metaPayload.biz_opaque_callback_data = String(biz_opaque_callback_data).slice(0, 512)
      }
    }

    // POST /{Version}/{Phone-Number-ID}/calls
    const res = await axios.post(
      `${BASE}/${channel.external_id}/calls`,
      metaPayload,
      { headers: { Authorization: `Bearer ${channel.access_token}`, 'Content-Type': 'application/json' } }
    )

    // For connect action: extract the call_id from response for the client
    // YAML spec: CallResponsePayload.calls[0].id
    const callId = res.data?.calls?.[0]?.id ?? null

    return NextResponse.json({
      success: true,
      call_id: callId,
      action,
      raw: res.data,
    })
  } catch (err: any) {
    const e       = err?.response?.data?.error
    const code    = e?.code ?? 0
    const subcode = e?.error_subcode
    const message = e?.message ?? err.message

    // Error 138006 = no call request permission from user
    if (code === 138006) {
      return NextResponse.json(
        { error: 'The contact has not granted call permission to your business. Use the "Request Permission" button first.' },
        { status: 403 }
      )
    }

    if (code === 403 || err?.response?.status === 403) {
      return NextResponse.json(
        { error: 'WhatsApp Calling is not enabled for this phone number.' },
        { status: 403 }
      )
    }

    console.error(`[WA Calls] action=${action} error [${code}/${subcode}]:`, message)
    return NextResponse.json(
      { error: `WhatsApp Calls error [${code}/-] ${message}` },
      { status: 500 }
    )
  }
}
