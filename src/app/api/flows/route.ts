/**
 * /api/flows
 *
 * WhatsApp Flows API v25.0
 *
 * GET    ?sync=true   → fetch all flows from Meta, upsert local
 * GET                 → local DB only (fast)
 * POST   action=create         → create new flow on Meta + local
 * POST   action=update_json    → upload Flow JSON to Meta
 * POST   action=publish        → publish flow on Meta
 * POST   action=deprecate      → deprecate flow on Meta
 * POST   action=preview        → get fresh preview URL
 * POST   action=send           → send flow to a conversation
 * DELETE                       → delete flow from Meta + local
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient } from '@/lib/platforms/whatsapp'
import axios from 'axios'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WA_BASE = 'https://graph.facebook.com/v25.0'

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function getSessionAndWorkspace(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await admin
    .from('profiles').select('workspace_id').eq('id', session.user.id).single()
  return profile ? { session, workspaceId: profile.workspace_id } : null
}

async function getChannel(workspaceId: string) {
  const { data } = await admin
    .from('channels')
    .select('id, access_token, meta, external_id')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'whatsapp')
    .maybeSingle()
  const token  = data?.access_token ?? process.env.WHATSAPP_TOKEN ?? ''
  const wabaId = data?.meta?.waba_id ?? process.env.WHATSAPP_WABA_ID ?? ''
  const phoneId = data?.external_id ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
  return { token, wabaId, phoneId, hasWaba: !!(wabaId && token) }
}

// ── Meta API call helper ──────────────────────────────────────────────────────
async function metaGet(url: string, token: string, params?: any) {
  const res = await axios.get(url, { params, headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

async function metaPost(url: string, token: string, data: any) {
  const res = await axios.post(url, data, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  return res.data
}

// ── Flow fields to request from Meta ─────────────────────────────────────────
const FLOW_FIELDS = 'id,name,categories,preview,status,validation_errors,json_version,data_api_version,data_channel_uri,health_status,whatsapp_business_account,application'

// ═════════════════════════════════════════════════════════════════════════════
// GET — list flows (local only, or sync from Meta)
// ═════════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await getSessionAndWorkspace(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = auth
  const { token, wabaId, hasWaba } = await getChannel(workspaceId)
  const doSync = req.nextUrl.searchParams.get('sync') === 'true'

  // ── Local only ───────────────────────────────────────────────────────────
  if (!doSync || !hasWaba) {
    const { data } = await admin
      .from('flows')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    return NextResponse.json({ flows: data ?? [], source: 'local', has_waba: hasWaba })
  }

  // ── Sync from Meta (GET /{waba-id}/flows) ─────────────────────────────────
  let metaFlows: any[] = []
  let syncError: string | null = null

  try {
    const res = await metaGet(
      `${WA_BASE}/${wabaId}/flows`,
      token,
      { fields: FLOW_FIELDS, limit: 100 }
    )
    metaFlows = res.data ?? []

    // Upsert each flow into Supabase
    for (const f of metaFlows) {
      const { data: existing } = await admin
        .from('flows')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('meta_flow_id', String(f.id))
        .maybeSingle()

      const record = {
        workspace_id:      workspaceId,
        meta_flow_id:      String(f.id),
        name:              f.name,
        status:            f.status,
        categories:        f.categories ?? [],
        validation_errors: f.validation_errors ?? [],
        json_version:      f.json_version ?? null,
        data_api_version:  f.data_api_version ?? null,
        data_channel_uri:  f.data_channel_uri ?? null,
        health_status:     f.health_status ?? null,
        preview_url:       f.preview?.preview_url ?? null,
      }

      if (existing) {
        await admin.from('flows').update(record).eq('id', existing.id)
      } else {
        await admin.from('flows').insert(record)
      }
    }

    // Delete stale local flows
    if (metaFlows.length > 0) {
      const metaIds = metaFlows.map(f => String(f.id))
      const { data: localFlows } = await admin
        .from('flows')
        .select('id, meta_flow_id')
        .eq('workspace_id', workspaceId)
        .not('meta_flow_id', 'is', null)
      if (localFlows) {
        const stale = localFlows.filter(f => !metaIds.includes(String(f.meta_flow_id))).map(f => f.id)
        if (stale.length > 0) await admin.from('flows').delete().in('id', stale)
      }
    }
  } catch (err: any) {
    syncError = err?.response?.data?.error?.message ?? err.message
    console.error('[Flows] Meta sync error:', syncError)
  }

  const { data: all } = await admin
    .from('flows')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    flows:       all ?? [],
    meta_count:  metaFlows.length,
    source:      'meta_synced',
    has_waba:    hasWaba,
    sync_error:  syncError,
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// POST — multi-action: create | update_json | publish | deprecate | preview | send
// ═════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const auth = await getSessionAndWorkspace(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = auth
  const { token, wabaId, phoneId, hasWaba } = await getChannel(workspaceId)

  const body = await req.json()
  const { action } = body

  // ── CREATE ─────────────────────────────────────────────────────────────────
  // POST /v25.0/{waba-id}/flows
  // Body: { name, categories, flow_json? }
  if (action === 'create') {
    const { name, categories = ['OTHER'], flow_json } = body
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    let metaFlowId: string | null = null
    let metaStatus = 'DRAFT'
    let metaError: string | null = null
    let validationErrors: any[] = []

    if (hasWaba) {
      try {
        const payload: any = { name, categories }
        if (flow_json) payload.clone_flow_id = undefined  // future: clone support
        const res = await metaPost(`${WA_BASE}/${wabaId}/flows`, token, payload)
        metaFlowId = String(res.id ?? '')
        metaStatus = res.status ?? 'DRAFT'
        metaError = null
        console.log(`[Flows] Created on Meta: ${name} (${metaFlowId})`)
      } catch (err: any) {
        metaError = err?.response?.data?.error?.message ?? err.message
        console.error('[Flows] Meta create error:', metaError)
      }
    } else {
      metaError = 'No WABA_ID configured — saved locally as draft'
    }

    const { data: saved, error: dbErr } = await admin.from('flows').insert({
      workspace_id:      workspaceId,
      meta_flow_id:      metaFlowId,
      name,
      status:            metaStatus,
      categories,
      validation_errors: validationErrors,
      flow_json:         flow_json ?? null,
    }).select().single()

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
    return NextResponse.json({ flow: saved, meta_error: metaError })
  }

  // ── UPDATE FLOW JSON ───────────────────────────────────────────────────────
  // POST /v25.0/{flow-id}/assets  (multipart, file field = "file")
  if (action === 'update_json') {
    const { flow_id, meta_flow_id, flow_json } = body
    if (!flow_id || !flow_json) return NextResponse.json({ error: 'flow_id and flow_json required' }, { status: 400 })

    let metaError: string | null = null
    let validationErrors: any[] = []

    if (hasWaba && meta_flow_id) {
      try {
        // Meta requires multipart/form-data with a "file" field containing the JSON
        const FormData = (await import('form-data')).default
        const form = new FormData()
        const jsonStr = typeof flow_json === 'string' ? flow_json : JSON.stringify(flow_json)
        form.append('file', Buffer.from(jsonStr), {
          filename: 'flow.json',
          contentType: 'application/json',
        })
        form.append('name', 'flow.json')
        form.append('asset_type', 'FLOW_JSON')
        const res = await axios.post(
          `${WA_BASE}/${meta_flow_id}/assets`,
          form,
          { headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() } }
        )
        validationErrors = res.data?.validation_errors ?? []
        console.log(`[Flows] Updated JSON on Meta: ${meta_flow_id}`)
      } catch (err: any) {
        metaError = err?.response?.data?.error?.message ?? err.message
        console.error('[Flows] Meta update JSON error:', metaError)
      }
    }

    await admin.from('flows').update({
      flow_json: typeof flow_json === 'string' ? JSON.parse(flow_json) : flow_json,
      validation_errors: validationErrors,
    }).eq('id', flow_id)

    const { data: updated } = await admin.from('flows').select('*').eq('id', flow_id).single()
    return NextResponse.json({ flow: updated, meta_error: metaError })
  }

  // ── PUBLISH ───────────────────────────────────────────────────────────────
  // POST /v25.0/{flow-id}/publish
  if (action === 'publish') {
    const { flow_id, meta_flow_id } = body
    if (!flow_id) return NextResponse.json({ error: 'flow_id required' }, { status: 400 })

    let metaError: string | null = null

    if (hasWaba && meta_flow_id) {
      try {
        await metaPost(`${WA_BASE}/${meta_flow_id}/publish`, token, {})
        console.log(`[Flows] Published on Meta: ${meta_flow_id}`)
      } catch (err: any) {
        metaError = err?.response?.data?.error?.message ?? err.message
        console.error('[Flows] Meta publish error:', metaError)
        return NextResponse.json({ error: metaError }, { status: 400 })
      }
    }

    await admin.from('flows').update({ status: 'PUBLISHED' }).eq('id', flow_id)
    const { data: updated } = await admin.from('flows').select('*').eq('id', flow_id).single()
    return NextResponse.json({ flow: updated, meta_error: metaError })
  }

  // ── DEPRECATE ─────────────────────────────────────────────────────────────
  // POST /v25.0/{flow-id}/deprecate
  if (action === 'deprecate') {
    const { flow_id, meta_flow_id } = body
    if (!flow_id) return NextResponse.json({ error: 'flow_id required' }, { status: 400 })

    let metaError: string | null = null

    if (hasWaba && meta_flow_id) {
      try {
        await metaPost(`${WA_BASE}/${meta_flow_id}/deprecate`, token, {})
        console.log(`[Flows] Deprecated on Meta: ${meta_flow_id}`)
      } catch (err: any) {
        metaError = err?.response?.data?.error?.message ?? err.message
        console.error('[Flows] Meta deprecate error:', metaError)
      }
    }

    await admin.from('flows').update({ status: 'DEPRECATED' }).eq('id', flow_id)
    const { data: updated } = await admin.from('flows').select('*').eq('id', flow_id).single()
    return NextResponse.json({ flow: updated, meta_error: metaError })
  }

  // ── GET PREVIEW URL ────────────────────────────────────────────────────────
  // GET /v25.0/{flow-id}?fields=preview.invalidate(false)
  if (action === 'preview') {
    const { flow_id, meta_flow_id, invalidate = false } = body
    if (!meta_flow_id) return NextResponse.json({ error: 'meta_flow_id required' }, { status: 400 })

    if (!hasWaba) return NextResponse.json({ error: 'No WABA_ID configured' }, { status: 400 })

    try {
      const res = await metaGet(
        `${WA_BASE}/${meta_flow_id}`,
        token,
        { fields: `preview.invalidate(${invalidate})` }
      )
      const previewUrl = res.preview?.preview_url ?? null
      if (flow_id && previewUrl) {
        await admin.from('flows').update({ preview_url: previewUrl }).eq('id', flow_id)
      }
      return NextResponse.json({ preview_url: previewUrl })
    } catch (err: any) {
      return NextResponse.json({
        error: err?.response?.data?.error?.message ?? err.message,
      }, { status: 500 })
    }
  }

  // ── SEND FLOW ─────────────────────────────────────────────────────────────
  // Sends an interactive flow message to a conversation
  if (action === 'send') {
    const {
      conversation_id, meta_flow_id, flow_name,
      header_text = '', body_text, footer_text = '',
      cta_text = 'Open', screen_id, mode = 'published',
      flow_token = `flow_${Date.now()}`,
      action_payload = {},
    } = body

    if (!conversation_id) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
    if (!body_text)       return NextResponse.json({ error: 'body_text required' }, { status: 400 })
    if (!meta_flow_id && !flow_name) return NextResponse.json({ error: 'meta_flow_id or flow_name required' }, { status: 400 })

    const { data: conv } = await admin
      .from('conversations')
      .select('*, contact:contacts(*), channel:channels(*)')
      .eq('id', conversation_id)
      .single()

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    if (!conv.contact?.phone) return NextResponse.json({ error: 'Contact has no phone' }, { status: 400 })

    try {
      const wa = new WhatsAppClient(conv.channel.access_token, conv.channel.external_id)
      const externalId = await wa.sendFlow(conv.contact.phone, {
        flowId:        meta_flow_id || undefined,
        flowName:      flow_name || undefined,
        flowToken:     flow_token,
        headerText:    header_text || undefined,
        bodyText:      body_text,
        footerText:    footer_text || undefined,
        ctaText:       cta_text,
        screenId:      screen_id || undefined,
        mode:          mode as 'draft' | 'published',
        actionPayload: action_payload,
      })

      // Save to messages
      const { data: msg } = await admin.from('messages').insert({
        conversation_id,
        workspace_id: workspaceId,
        external_id:  externalId,
        direction:    'outbound',
        content_type: 'flow',
        body:         body_text,
        sender_id:    auth.session.user.id,
        status:       'sent',
        is_note:      false,
        meta: { flow_id: meta_flow_id, flow_name, flow_token, mode, screen_id },
      }).select().single()

      await admin.from('conversations').update({
        last_message:    `[Flow: ${body_text}]`,
        last_message_at: new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      }).eq('id', conversation_id)

      return NextResponse.json({ message: msg, external_id: externalId })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  // ── UPDATE METADATA ────────────────────────────────────────────────────────
  // POST /v25.0/{flow-id}
  if (action === 'update_metadata') {
    const { flow_id, meta_flow_id, name, categories, data_channel_uri } = body
    if (!flow_id) return NextResponse.json({ error: 'flow_id required' }, { status: 400 })

    let metaError: string | null = null

    if (hasWaba && meta_flow_id) {
      try {
        const payload: any = {}
        if (name)             payload.name = name
        if (categories)       payload.categories = categories
        if (data_channel_uri) payload.data_channel_uri = data_channel_uri
        await metaPost(`${WA_BASE}/${meta_flow_id}`, token, payload)
      } catch (err: any) {
        metaError = err?.response?.data?.error?.message ?? err.message
      }
    }

    const updateData: any = {}
    if (name)             updateData.name = name
    if (categories)       updateData.categories = categories
    if (data_channel_uri) updateData.data_channel_uri = data_channel_uri

    await admin.from('flows').update(updateData).eq('id', flow_id)
    const { data: updated } = await admin.from('flows').select('*').eq('id', flow_id).single()
    return NextResponse.json({ flow: updated, meta_error: metaError })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}

// ═════════════════════════════════════════════════════════════════════════════
// DELETE — delete flow from Meta + local
// DELETE /v25.0/{flow-id}
// ═════════════════════════════════════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  const auth = await getSessionAndWorkspace(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = auth
  const { token, hasWaba } = await getChannel(workspaceId)
  const { flow_id, meta_flow_id } = await req.json()

  if (!flow_id) return NextResponse.json({ error: 'flow_id required' }, { status: 400 })

  let metaError: string | null = null

  if (hasWaba && meta_flow_id) {
    try {
      // Only DRAFT and DEPRECATED flows can be deleted
      await axios.delete(`${WA_BASE}/${meta_flow_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log(`[Flows] Deleted from Meta: ${meta_flow_id}`)
    } catch (err: any) {
      metaError = err?.response?.data?.error?.message ?? err.message
      console.warn('[Flows] Meta delete warning:', metaError)
    }
  }

  await admin.from('flows').delete().eq('id', flow_id)
  return NextResponse.json({ success: true, meta_error: metaError })
}
