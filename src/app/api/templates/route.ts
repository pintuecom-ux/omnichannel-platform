import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import axios from 'axios'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WA_BASE = 'https://graph.facebook.com/v25.0'

// ── GET: Fetch all templates from Meta + local DB ────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles').select('workspace_id').eq('id', session.user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Get channel info (token + WABA ID)
  const { data: channel } = await admin
    .from('channels')
    .select('access_token, meta')
    .eq('workspace_id', profile.workspace_id)
    .eq('platform', 'whatsapp')
    .maybeSingle()

  const token = channel?.access_token ?? process.env.WHATSAPP_TOKEN
  const wabaId = channel?.meta?.waba_id ?? process.env.WHATSAPP_WABA_ID

  // If no WABA ID, return only local templates
  if (!wabaId || !token) {
    const { data: local } = await admin
      .from('templates')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: false })
    return NextResponse.json({ templates: local ?? [], source: 'local_only', missing: !wabaId ? 'WABA_ID' : 'TOKEN' })
  }

  // Fetch from Meta
  let metaTemplates: any[] = []
  try {
    const res = await axios.get(
      `${WA_BASE}/${wabaId}/message_templates`,
      {
        params: {
          fields: 'id,name,status,category,language,components,quality_score,rejected_reason',
          limit: 100,
        },
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    metaTemplates = res.data?.data ?? []

    // Sync Meta templates into local DB (upsert by meta_template_id)
    for (const t of metaTemplates) {
      const body = t.components?.find((c: any) => c.type === 'BODY')?.text ?? ''
      const header = t.components?.find((c: any) => c.type === 'HEADER')
      const footer = t.components?.find((c: any) => c.type === 'FOOTER')?.text ?? null
      const buttons = t.components?.find((c: any) => c.type === 'BUTTONS')?.buttons ?? []

      await admin.from('templates').upsert({
        workspace_id: profile.workspace_id,
        platform: 'whatsapp',
        name: t.name,
        category: t.category,
        language: t.language,
        body,
        header_text: header?.format === 'TEXT' ? header.text : null,
        footer_text: footer,
        status: t.status.toLowerCase(),
        meta_template_id: t.id,
        variables: [],
        meta: {
          header_type: header?.format ?? 'NONE',
          buttons,
          quality_score: t.quality_score,
          rejected_reason: t.rejected_reason ?? null,
          components: t.components,
        },
      }, { onConflict: 'meta_template_id', ignoreDuplicates: false })
    }
  } catch (err: any) {
    console.error('[Templates API] Meta fetch error:', err?.response?.data ?? err.message)
  }

  // Return merged list (local + any that weren't in Meta)
  const { data: all } = await admin
    .from('templates')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    templates: all ?? [],
    meta_count: metaTemplates.length,
    source: 'meta_synced',
  })
}

// ── POST: Create template on Meta + save locally ─────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles').select('workspace_id').eq('id', session.user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: channel } = await admin
    .from('channels').select('access_token, meta').eq('workspace_id', profile.workspace_id).eq('platform', 'whatsapp').maybeSingle()

  const token = channel?.access_token ?? process.env.WHATSAPP_TOKEN
  const wabaId = channel?.meta?.waba_id ?? process.env.WHATSAPP_WABA_ID

  const body = await req.json()
  const {
    name, category, language,
    header_type, header_text, header_url,
    body_text, footer_text,
    buttons = [],
    body_examples = [],  // sample values for {{1}}, {{2}} etc
  } = body

  if (!name || !category || !language || !body_text) {
    return NextResponse.json({ error: 'name, category, language, body_text are required' }, { status: 400 })
  }

  // Build components array for Meta API
  const components: any[] = []

  // Header
  if (header_type && header_type !== 'NONE') {
    const hComp: any = { type: 'HEADER', format: header_type }
    if (header_type === 'TEXT') {
      hComp.text = header_text ?? ''
    } else if (header_url) {
      // IMAGE/VIDEO/DOCUMENT header with example URL
      hComp.example = { header_handle: [header_url] }
    }
    components.push(hComp)
  }

  // Body (with example values for variables)
  const bodyComp: any = { type: 'BODY', text: body_text }
  if (body_examples.length > 0) {
    bodyComp.example = { body_text: [body_examples] }
  }
  components.push(bodyComp)

  // Footer
  if (footer_text?.trim()) {
    components.push({ type: 'FOOTER', text: footer_text })
  }

  // Buttons
  if (buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: buttons.map((b: any) => {
        if (b.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: b.text }
        if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.url }
        if (b.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone }
        return b
      }),
    })
  }

  const metaPayload = {
    name: name.toLowerCase().replace(/\s+/g, '_'),
    category: category.toUpperCase(),
    language,
    components,
  }

  let metaTemplateId: string | null = null
  let metaStatus = 'pending'
  let metaError: string | null = null

  if (wabaId && token) {
    try {
      const res = await axios.post(
        `${WA_BASE}/${wabaId}/message_templates`,
        metaPayload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )
      metaTemplateId = res.data?.id ?? null
      metaStatus = res.data?.status?.toLowerCase() ?? 'pending'
      console.log('[Templates] Created on Meta:', metaTemplateId)
    } catch (err: any) {
      metaError = err?.response?.data?.error?.message ?? err.message
      console.error('[Templates] Meta create error:', metaError)
      // Don't fail — save locally as draft
      metaStatus = 'draft'
    }
  } else {
    metaStatus = 'draft'
    metaError = 'No WABA_ID or token configured — saved locally as draft'
  }

  // Save to local DB
  const { data: saved, error: dbErr } = await admin
    .from('templates')
    .insert({
      workspace_id: profile.workspace_id,
      platform: 'whatsapp',
      name: metaPayload.name,
      category: category.toUpperCase(),
      language,
      body: body_text,
      header_text: header_type === 'TEXT' ? header_text : null,
      footer_text: footer_text || null,
      status: metaStatus,
      meta_template_id: metaTemplateId,
      variables: [],
      meta: {
        header_type: header_type ?? 'NONE',
        buttons,
        components,
        meta_error: metaError,
      },
    })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({
    template: saved,
    meta_id: metaTemplateId,
    meta_status: metaStatus,
    meta_error: metaError,
  })
}

// ── DELETE: Remove from Meta + local DB ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles').select('workspace_id').eq('id', session.user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { template_id, template_name } = await req.json()
  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  const { data: channel } = await admin
    .from('channels').select('access_token, meta').eq('workspace_id', profile.workspace_id).eq('platform', 'whatsapp').maybeSingle()
  const token = channel?.access_token ?? process.env.WHATSAPP_TOKEN
  const wabaId = channel?.meta?.waba_id ?? process.env.WHATSAPP_WABA_ID

  // Delete from Meta
  if (wabaId && token && template_name) {
    try {
      await axios.delete(
        `${WA_BASE}/${wabaId}/message_templates`,
        {
          params: { name: template_name },
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      console.log('[Templates] Deleted from Meta:', template_name)
    } catch (err: any) {
      console.warn('[Templates] Meta delete failed:', err?.response?.data?.error?.message)
      // Continue — still delete locally
    }
  }

  // Delete from local DB
  await admin.from('templates').delete().eq('id', template_id)

  return NextResponse.json({ success: true })
}
