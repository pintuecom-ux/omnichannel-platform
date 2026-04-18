import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import axios from 'axios'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WA_BASE = 'https://graph.facebook.com/v25.0'

// ── GET: Load templates from local DB; if ?sync=true also fetch from Meta ────
export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles').select('workspace_id').eq('id', session.user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Check if WABA is configured (for UI indicator)
  const { data: channel } = await admin
    .from('channels')
    .select('access_token, meta')
    .eq('workspace_id', profile.workspace_id)
    .eq('platform', 'whatsapp')
    .maybeSingle()

  const token = channel?.access_token ?? process.env.WHATSAPP_TOKEN
  const wabaId = channel?.meta?.waba_id ?? process.env.WHATSAPP_WABA_ID
  const hasWaba = !!(wabaId && token)

  const shouldSync = req.nextUrl.searchParams.get('sync') === 'true'

  // ── Default: just return local DB (fast, no Meta call) ───────────────────
  if (!shouldSync || !hasWaba) {
    const { data: local } = await admin
      .from('templates')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: false })
    return NextResponse.json({
      templates: local ?? [],
      source: 'local',
      has_waba: hasWaba,
      missing: !wabaId ? 'WABA_ID' : !token ? 'TOKEN' : null,
    })
  }

  // ── sync=true: Fetch from Meta, upsert into local DB, return merged ───────
  let metaTemplates: any[] = []
  let syncError: string | null = null

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

    // Upsert each Meta template into local DB
    for (const t of metaTemplates) {
      const bodyComp  = t.components?.find((c: any) => c.type === 'BODY')
      const header    = t.components?.find((c: any) => c.type === 'HEADER')
      const footer    = t.components?.find((c: any) => c.type === 'FOOTER')?.text ?? null
      const buttons   = t.components?.find((c: any) => c.type === 'BUTTONS')?.buttons ?? []
      const body      = bodyComp?.text ?? ''

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

    // Delete local templates not present in Meta anymore (only synced ones)
    if (metaTemplates.length > 0) {
      const metaIds = metaTemplates.map(t => t.id)
      await admin
        .from('templates')
        .delete()
        .eq('workspace_id', profile.workspace_id)
        .not('meta_template_id', 'is', null)
        .not('meta_template_id', 'in', `(${metaIds.map(id => `'${id}'`).join(',')})`)
    }
  } catch (err: any) {
    syncError = err?.response?.data?.error?.message ?? err.message
    console.error('[Templates API] Meta sync error:', syncError)
  }

  const { data: all } = await admin
    .from('templates')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    templates: all ?? [],
    meta_count: metaTemplates.length,
    source: 'meta_synced',
    has_waba: hasWaba,
    sync_error: syncError,
  })
}

// ── POST: Create template on Meta + save locally ─────────────────────────────
// Supports both JSON and multipart/form-data (for media header file uploads)
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

  // Parse body — supports both JSON and FormData (for media uploads)
  const ct = req.headers.get('content-type') ?? ''
  let fields: any = {}
  let mediaFile: File | null = null

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    fields = {
      name:          form.get('name') as string,
      category:      form.get('category') as string,
      language:      form.get('language') as string,
      header_type:   form.get('header_type') as string,
      header_text:   form.get('header_text') as string,
      header_url:    form.get('header_url') as string ?? '',
      body_text:     form.get('body_text') as string,
      footer_text:   form.get('footer_text') as string ?? '',
      buttons:       JSON.parse((form.get('buttons') as string) ?? '[]'),
      body_examples: JSON.parse((form.get('body_examples') as string) ?? '[]'),
    }
    mediaFile = form.get('media_file') as File | null
  } else {
    fields = await req.json()
  }

  let {
    name, category, language,
    header_type, header_text, header_url,
    body_text, footer_text,
    buttons = [],
    body_examples = [],
  } = fields

  if (!name || !category || !language || !body_text) {
    return NextResponse.json({ error: 'name, category, language, body_text are required' }, { status: 400 })
  }

  // ── Upload media file to Supabase Storage if provided ────────────────────
  if (mediaFile && mediaFile.size > 0 && header_type !== 'NONE' && header_type !== 'TEXT') {
    try {
      const buffer = Buffer.from(await mediaFile.arrayBuffer())
      const ext = mediaFile.name.split('.').pop()?.split('?')[0] ?? 'bin'
      const storagePath = `${profile.workspace_id}/templates/${Date.now()}_${mediaFile.name.replace(/[^a-z0-9._-]/gi, '_')}`
      const { error: upErr } = await admin.storage
        .from('media')
        .upload(storagePath, buffer, { contentType: mediaFile.type, upsert: true })
      if (!upErr) {
        const { data: pub } = admin.storage.from('media').getPublicUrl(storagePath)
        header_url = pub.publicUrl
      } else {
        console.warn('[Templates] Storage upload error:', upErr.message)
      }
    } catch (err: any) {
      console.error('[Templates] Media upload error:', err.message)
    }
  }

  // ── Build Meta components array ───────────────────────────────────────────
  const components: any[] = []

  if (header_type && header_type !== 'NONE') {
    const hComp: any = { type: 'HEADER', format: header_type }
    if (header_type === 'TEXT') {
      hComp.text = header_text ?? ''
    } else if (header_url) {
      hComp.example = { header_handle: [header_url] }
    }
    components.push(hComp)
  }

  const bodyComp: any = { type: 'BODY', text: body_text }
  if (body_examples.length > 0) {
    bodyComp.example = { body_text: [body_examples] }
  }
  components.push(bodyComp)

  if (footer_text?.trim()) {
    components.push({ type: 'FOOTER', text: footer_text })
  }

  if (buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: buttons.map((b: any) => {
        if (b.type === 'QUICK_REPLY')  return { type: 'QUICK_REPLY',  text: b.text }
        if (b.type === 'URL')          return { type: 'URL',          text: b.text, url: b.url }
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
    } catch (err: any) {
      metaError = err?.response?.data?.error?.message ?? err.message
      console.error('[Templates] Meta create error:', metaError)
      metaStatus = 'draft'
    }
  } else {
    metaStatus = 'draft'
    metaError = 'No WABA_ID or token configured — saved locally as draft'
  }

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
        header_media_url: header_url || null,
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

  if (wabaId && token && template_name) {
    try {
      await axios.delete(
        `${WA_BASE}/${wabaId}/message_templates`,
        {
          params: { name: template_name },
          headers: { Authorization: `Bearer ${token}` },
        }
      )
    } catch (err: any) {
      console.warn('[Templates] Meta delete failed:', err?.response?.data?.error?.message)
    }
  }

  await admin.from('templates').delete().eq('id', template_id)
  return NextResponse.json({ success: true })
}