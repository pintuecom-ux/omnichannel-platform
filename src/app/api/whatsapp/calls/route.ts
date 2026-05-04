/**
 * src/app/api/whatsapp/calls/route.ts
 *
 * FIXES IN THIS VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 * Issue 4 — "send_call_permission_request" is NOT a valid Meta API action.
 *   Valid actions per v23 YAML spec:
 *   accept | connect | media_update | pre_accept | reject | terminate
 *   Removed the entire request_permission action. The UI now surfaces
 *   clear instructions to the user instead of making a broken API call.
 *
 * Issue 3 — messages.content_type = 'call' blocked by DB constraint.
 *   Fixed by migration 005. Route is already correct — this note confirms
 *   why inserts were silently failing before.
 *
 * API surface (POST actions):
 *   initiate   → POST {action:'connect'} to Meta, store call_started message
 *   terminate  → POST {action:'terminate'} to Meta, update call message
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient, normalizePhone } from '@/lib/platforms/whatsapp'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Shared: resolve channel + contact from a conversation ID ─────────────────
async function resolveConversation(conversationId: string) {
  const { data: conv, error } = await admin
    .from('conversations')
    .select(`
      id, workspace_id, platform,
      channel:channels(id, access_token, external_id),
      contact:contacts(id, phone, name)
    `)
    .eq('id', conversationId)
    .maybeSingle()

  if (error || !conv) return null
  return conv as any
}

/* -------------------------------------------------------------------------- */
/* GET — Check call permission                                                */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (!user || authErr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conversationId = req.nextUrl.searchParams.get('conversation_id')
  if (!conversationId) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })

  const conv = await resolveConversation(conversationId)
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  if (conv.platform !== 'whatsapp') {
    return NextResponse.json({ error: 'Calling only supported for WhatsApp' }, { status: 400 })
  }

  const phone = conv.contact?.phone
  if (!phone) return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })

  const wa = new WhatsAppClient(conv.channel.access_token, conv.channel.external_id)

  try {
    const permission = await wa.checkCallPermission(phone)

    const canCall = permission.actions.find(
      (a: any) => a.action_name === 'start_call'
    )?.can_perform_action ?? false

    // NOTE: 'send_call_permission_request' may appear in the actions list
    // returned by Meta's GET call_permissions, but it CANNOT be used as an
    // action on POST /calls. We expose it as a UI hint only.
    const canRequestPermission = permission.actions.find(
      (a: any) => a.action_name === 'send_call_permission_request'
    )?.can_perform_action ?? false

    return NextResponse.json({
      ok: true,
      permission,
      can_call: canCall,
      // When true, show the user a message: "Ask this contact to allow calls
      // from your WhatsApp number in their privacy settings."
      // There is NO API to trigger this — it's a manual action by the contact.
      can_request_permission: canRequestPermission,
      contact: { name: conv.contact.name, phone },
    })
  } catch (err: any) {
    console.error('[Calls GET]', err.message)
    if (err.message.includes('138006')) {
      return NextResponse.json({
        ok: false,
        error: 'calling_not_enabled',
        message: 'WhatsApp Calling is not enabled. Go to Meta Business Suite → Phone Numbers → [your number] → Settings → Calling.',
      }, { status: 403 })
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

/* -------------------------------------------------------------------------- */
/* POST — Initiate or terminate a call                                        */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (!user || authErr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, conversation_id, sdp_offer, call_id } = body

  if (!action || !conversation_id) {
    return NextResponse.json({ error: 'action and conversation_id required' }, { status: 400 })
  }
const conv = await resolveConversation(conversation_id)
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  if (conv.platform !== 'whatsapp') {
    return NextResponse.json({ error: 'Calling only supported for WhatsApp' }, { status: 400 })
  }
  
  if (action === 'request_permission') {
    // conv already resolved above at line 124
    const phone = conv.contact?.phone
    if (!phone) return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })

    const wa = new WhatsAppClient(conv.channel.access_token, conv.channel.external_id)
    try {
      // Use the correct interactive message approach (not the invalid /calls action)
      const result = await wa.sendCallPermissionMessage(phone)
      console.log('[Calls POST] ✅ Permission request message sent, id:', result.message_id)

      // Log the permission request in call_logs for tracking
      await admin.from('call_logs').insert({
        workspace_id:    conv.workspace_id,
        conversation_id: conversation_id,
        direction:       'outbound',
        status:          'permission_requested',
        to_phone:        phone,
        meta:            { message_id: result.message_id, event: 'permission_requested' },
      }).then(({ error }) => {
        if (error) console.warn('[Calls POST] call_logs insert warning:', error.message)
      })

      // Also store as a message so it appears in conversation history
      await admin.from('messages').insert({
        conversation_id: conversation_id,
        workspace_id:    conv.workspace_id,
        direction:       'outbound',
        content_type:    'call',
        body:            '🔔 Call permission request sent',
        status:          'sent',
        sender_id:       user.id,
        is_note:         false,
        external_id:     result.message_id,
        meta: {
          call_event: 'permission_requested',
          to_phone:   phone,
        },
      }).then(({ error }) => {
        if (error) console.warn('[Calls POST] permission message insert warning:', error.message)
      })

      return NextResponse.json({ ok: true, message: 'Permission request sent.', message_id: result.message_id })
    } catch (err: any) {
      console.error('[Calls POST] sendCallPermissionMessage error:', err.message)
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
    }
  }


  const phone = conv.contact?.phone
  if (!phone) return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })

  const wa = new WhatsAppClient(conv.channel.access_token, conv.channel.external_id)

  /* ---------------------------------------------------------------------- */
  /* initiate — action: 'connect'                                           */
  /* ---------------------------------------------------------------------- */
  if (action === 'initiate') {
    if (!sdp_offer) {
      return NextResponse.json({ error: 'sdp_offer required' }, { status: 400 })
    }

    // Pre-flight permission check
    try {
      const perm = await wa.checkCallPermission(phone)
      const canCall = perm.actions.find(
        (a: any) => a.action_name === 'start_call'
      )?.can_perform_action
      if (!canCall) {
        return NextResponse.json({
          ok: false,
          error: 'permission_required',
          permission_status: perm.status,
          message:
            perm.status === 'pending'
              ? 'Permission request is pending. The contact has not approved yet.'
              : 'You do not have permission to call this contact. ' +
                'They must allow calls from your business in their WhatsApp privacy settings.',
        }, { status: 403 })
      }
    } catch (permErr: any) {
      // Non-fatal — let Meta reject it with its own error if needed
      console.warn('[Calls POST] Permission pre-check failed:', permErr.message)
    }

    try {
      const newCallId = await wa.initiateCall(phone, sdp_offer, {
        callbackData: `conv:${conversation_id}`,
      })

      // Store call_started log — requires migration 005 ('call' in constraint)
      await admin.from('messages').insert({
        conversation_id,
        workspace_id:  conv.workspace_id,
        direction:     'outbound',
        content_type:  'call',
        body:          '📞 Call started',
        status:        'sent',
        sender_id:     user.id,
        is_note:       false,
        meta: {
          call_event: 'call_started',
          call_id:    newCallId,
          to_phone:   normalizePhone(phone),
        },
      })

      return NextResponse.json({ ok: true, call_id: newCallId })
    } catch (err: any) {
      console.error('[Calls POST] initiate error:', err.message)
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
    }
  }

  /* ---------------------------------------------------------------------- */
  /* terminate — action: 'terminate'                                        */
  /* ---------------------------------------------------------------------- */
  if (action === 'terminate') {
    if (!call_id) {
      return NextResponse.json({ error: 'call_id required for terminate' }, { status: 400 })
    }

    try {
      const success = await wa.terminateCall(call_id)

      // Update the matching call message to 'ended'
      const { data: existing } = await admin
        .from('messages')
        .select('id, meta')
        .eq('conversation_id', conversation_id)
        .eq('content_type', 'call')
        .contains('meta', { call_id })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        await admin
          .from('messages')
          .update({
            body: '📞 Call ended',
            meta: {
              ...(existing.meta ?? {}),
              call_event: 'call_ended',
              call_id,
              ended_at: new Date().toISOString(),
            },
          })
          .eq('id', existing.id)
      }

      return NextResponse.json({ ok: success })
    } catch (err: any) {
      console.error('[Calls POST] terminate error:', err.message)
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
    }
  }

  /* ---------------------------------------------------------------------- */
  /* log_status — update call_logs row status (client-side helper)          */
  /* ---------------------------------------------------------------------- */
  if (action === 'log_status') {
    const { call_id: logCallId, status: logStatus } = body
    if (!logCallId || !logStatus) {
      return NextResponse.json({ error: 'call_id and status required for log_status' }, { status: 400 })
    }
    await admin
      .from('call_logs')
      .update({ status: logStatus, meta: { call_event: logStatus }, updated_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id)
      .eq('call_id', logCallId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json(
    { error: `Unknown action: ${action}. Valid: initiate | terminate | request_permission | accept | reject | log_status` },
    { status: 400 }
  )
}
