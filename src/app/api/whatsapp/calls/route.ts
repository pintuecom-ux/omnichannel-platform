/**
 * src/app/api/whatsapp/calls/route.ts
 *
 * Handles all WhatsApp calling operations from the frontend:
 *  - GET  ?action=check_permission&conversation_id=  → check if we can call
 *  - POST { action: "request_permission" }           → send permission request
 *  - POST { action: "initiate", sdp_offer }          → start a call
 *  - POST { action: "terminate", call_id }           → end a call
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient, normalizePhone } from '@/lib/platforms/whatsapp'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Shared helper: resolve channel + contact from conversation ────────────────
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

// ── GET — Check call permission for a conversation contact ────────────────────
export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversationId = req.nextUrl.searchParams.get('conversation_id')
  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
  }

  const conv = await resolveConversation(conversationId)
  if (!conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (conv.platform !== 'whatsapp') {
    return NextResponse.json({ error: 'Calling only supported for WhatsApp' }, { status: 400 })
  }

  const phone = conv.contact?.phone
  if (!phone) {
    return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })
  }

  const wa = new WhatsAppClient(conv.channel.access_token, conv.channel.external_id)

  try {
    const permission = await wa.checkCallPermission(phone)
    return NextResponse.json({
      ok: true,
      permission,
      contact: { name: conv.contact.name, phone },
    })
  } catch (err: any) {
    console.error('[Calls GET] permission check error:', err.message)

    // Error 138006 = calling not enabled for this phone number
    if (err.message.includes('138006')) {
      return NextResponse.json({
        ok: false,
        error: 'calling_not_enabled',
        message: 'WhatsApp Calling is not enabled for this phone number. Enable it in Meta Business Suite → Phone Numbers → Calling.',
      }, { status: 403 })
    }

    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

// ── POST — request_permission | initiate | terminate ─────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, conversation_id, sdp_offer, call_id } = body

  if (!action || !conversation_id) {
    return NextResponse.json({ error: 'action and conversation_id required' }, { status: 400 })
  }

  const conv = await resolveConversation(conversation_id)
  if (!conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (conv.platform !== 'whatsapp') {
    return NextResponse.json({ error: 'Calling only supported for WhatsApp' }, { status: 400 })
  }

  const phone = conv.contact?.phone
  if (!phone) {
    return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })
  }

  const wa = new WhatsAppClient(conv.channel.access_token, conv.channel.external_id)

  // ── request_permission ────────────────────────────────────────────────────
  if (action === 'request_permission') {
    try {
      const result = await wa.sendCallPermissionRequest(phone)

      // Log permission request as a system message in the conversation
      await admin.from('messages').insert({
        conversation_id,
        workspace_id: conv.workspace_id,
        direction:    'outbound',
        content_type: 'call',
        body:         '📞 Call permission request sent',
        status:       'sent',
        sender_id:    user.id,
        is_note:      false,
        meta: {
          call_event: 'permission_request',
          call_id:    result.call_id ?? null,
          to_phone:   normalizePhone(phone),
        },
      })

      return NextResponse.json({ ok: true, call_id: result.call_id })
    } catch (err: any) {
      console.error('[Calls POST] request_permission error:', err.message)
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
    }
  }

  // ── initiate ──────────────────────────────────────────────────────────────
  if (action === 'initiate') {
    if (!sdp_offer) {
      return NextResponse.json({ error: 'sdp_offer required for initiate action' }, { status: 400 })
    }

    // Verify permission before attempting
    try {
      const perm = await wa.checkCallPermission(phone)
      const canCall = perm.actions.find(a => a.action_name === 'start_call')?.can_perform_action
      if (!canCall) {
        return NextResponse.json({
          ok: false,
          error: 'permission_required',
          permission_status: perm.status,
          message: 'You do not have permission to call this user. Send a permission request first.',
        }, { status: 403 })
      }
    } catch (err: any) {
      // If permission check fails, still try to initiate — Meta will reject with 138006
      console.warn('[Calls POST] permission pre-check failed, proceeding anyway:', err.message)
    }

    try {
      const newCallId = await wa.initiateCall(phone, sdp_offer, {
        callbackData: `conv:${conversation_id}`,
      })

      // Store call_started event as a message for audit trail
      await admin.from('messages').insert({
        conversation_id,
        workspace_id: conv.workspace_id,
        direction:    'outbound',
        content_type: 'call',
        body:         '📞 Call started',
        status:       'sent',
        sender_id:    user.id,
        is_note:      false,
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

  // ── terminate ─────────────────────────────────────────────────────────────
  if (action === 'terminate') {
    if (!call_id) {
      return NextResponse.json({ error: 'call_id required for terminate action' }, { status: 400 })
    }

    try {
      const success = await wa.terminateCall(call_id)

      // Update the call_started message to call_ended
      await admin.from('messages')
        .update({
          body: '📞 Call ended',
          meta: {
            call_event: 'call_ended',
            call_id,
            to_phone: normalizePhone(phone),
          },
        })
        .eq('conversation_id', conversation_id)
        .contains('meta', { call_id })

      return NextResponse.json({ ok: success })
    } catch (err: any) {
      console.error('[Calls POST] terminate error:', err.message)
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
