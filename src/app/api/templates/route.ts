/**
 * /api/templates
 *
 * Meta WhatsApp Business Management API v25.0
 *
 * GET    ?sync=true  → fetch ALL templates from Meta (cursor pagination), upsert into Supabase, return merged list
 * GET               → fast local Supabase read only
 * POST              → create new template on Meta + save to Supabase (supports JSON + multipart for media)
 * PATCH             → edit existing template in-place via POST /{meta_template_id} (Meta's edit endpoint)
 * DELETE            → delete from Meta by name (+ optional hsm_id) then remove from Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import axios from 'axios'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WA_BASE = 'https://graph.facebook.com/v25.0'

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getAuth(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return session
}

async function getWorkspaceId(userId: string): Promise<string | null> {
  const { data } = await admin.from('profiles').select('workspace_id').eq('id', userId).single()
  return data?.workspace_id ?? null
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

// ── Parse request body (JSON or multipart) ───────────────────────────────────
async function parseBody(req: NextRequest) {
  const ct = req.headers.get('content-type') ?? ''
  if (!ct.includes('multipart/form-data')) {
    return { fields: await req.json(), mediaFile: null as File | null }
  }
  const form = await req.formData()
  const fields: Record<string, any> = {}
  for (const [k, v] of form.entries()) {
    if (typeof v === 'string') {
      // Try to parse JSON fields
      if (['buttons', 'body_examples', 'header_examples'].includes(k)) {
        try { fields[k] = JSON.parse(v) } catch { fields[k] = [] }
      } else {
        fields[k] = v
      }
    }
  }
  const mediaFile = form.get('media_file') as File | null
  return { fields, mediaFile }
}

// ── Upload file to Supabase Storage, return public URL ───────────────────────
async function uploadToStorage(file: File, workspaceId: string): Promise<string | null> {
  try {
    const buf  = Buffer.from(await file.arrayBuffer())
    const safe = file.name.replace(/[^a-z0-9._-]/gi, '_')
    const path = `${workspaceId}/templates/${Date.now()}_${safe}`
    const { error } = await admin.storage.from('media').upload(path, buf, { contentType: file.type, upsert: true })
    if (error) { console.warn('[TPL] Storage upload error:', error.message); return null }
    const { data: pub } = admin.storage.from('media').getPublicUrl(path)
    return pub.publicUrl
  } catch (e: any) {
    console.error('[TPL] Storage error:', e.message)
    return null
  }
}

// ── Upload media to WhatsApp servers, return media_id (for template header handle) ─
// Meta requires a media "handle" (not a URL) for media header examples.
// We upload via the phone number's media endpoint to get a handle.
async function uploadMediaToWA(
  file: File,
  token: string,
  phoneNumberId: string
): Promise<string | null> {
  try {
    const FormDataNode = (await import('form-data')).default
    const form = new FormDataNode()
    const buf  = Buffer.from(await file.arrayBuffer())
    form.append('file', buf, { filename: file.name, contentType: file.type })
    form.append('type', file.type)
    form.append('messaging_product', 'whatsapp')
    const res = await axios.post(
      `${WA_BASE}/${phoneNumberId}/media`,
      form,
      { headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() } }
    )
    return res.data?.id ?? null
  } catch (e: any) {
    console.warn('[TPL] WA media upload failed:', e?.response?.data?.error?.message ?? e.message)
    return null
  }
}

// ── Build Meta components array from form fields ──────────────────────────────
function buildComponents(f: {
  template_type?:  string
  header_type?:    string
  header_text?:    string
  header_handle?:  string   // WA media_id or public URL
  header_examples?: string[]
  body_text:       string
  body_examples?:  string[]
  footer_text?:    string
  buttons?:        any[]
  // Auth specific
  add_security_recommendation?: boolean
  code_expiration_minutes?: number
}) {
  const comps: any[] = []
  const ht = (f.header_type ?? 'NONE').toUpperCase()

  // ── Header ────────────────────────────────────────────────────────────────
  if (ht !== 'NONE' && ht !== '') {
    if (f.template_type === 'AUTHENTICATION') {
      // Auth templates have no header
    } else if (ht === 'TEXT') {
      const hComp: any = { type: 'HEADER', format: 'TEXT', text: f.header_text ?? '' }
      if (f.header_examples?.length) {
        hComp.example = { header_text: f.header_examples }
      }
      comps.push(hComp)
    } else if (ht === 'LOCATION') {
      comps.push({ type: 'HEADER', format: 'LOCATION' })
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(ht)) {
      const hComp: any = { type: 'HEADER', format: ht }
      if (f.header_handle) {
        hComp.example = { header_handle: [f.header_handle] }
      }
      comps.push(hComp)
    }
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  if (f.template_type === 'AUTHENTICATION') {
    const bodyComp: any = { type: 'BODY' }
    if (f.add_security_recommendation) bodyComp.add_security_recommendation = true
    comps.push(bodyComp)
  } else {
    const bodyComp: any = { type: 'BODY', text: f.body_text }
    const examples = (f.body_examples ?? []).filter(Boolean)
    if (examples.length > 0) {
      bodyComp.example = { body_text: [examples] }
    }
    comps.push(bodyComp)
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  if (f.template_type === 'AUTHENTICATION' && f.code_expiration_minutes) {
    comps.push({ type: 'FOOTER', code_expiration_minutes: f.code_expiration_minutes })
  } else if (f.footer_text?.trim()) {
    comps.push({ type: 'FOOTER', text: f.footer_text })
  }

  // ── Buttons ───────────────────────────────────────────────────────────────
  const btns = f.buttons ?? []
  if (btns.length > 0) {
    const mapped = btns.map((b: any) => {
      switch (b.type) {
        case 'QUICK_REPLY':   return { type: 'QUICK_REPLY',   text: b.text }
        case 'URL':           return { type: 'URL',           text: b.text, url: b.url, ...(b.url_example ? { example: [b.url_example] } : {}) }
        case 'PHONE_NUMBER':  return { type: 'PHONE_NUMBER',  text: b.text, phone_number: b.phone }
        case 'OTP':           return { type: 'OTP', otp_type: b.otp_type ?? 'COPY_CODE', text: b.text ?? 'Copy Code' }
        case 'CATALOG':       return { type: 'CATALOG',       text: b.text }
        case 'MPM':           return { type: 'MPM',           text: b.text }
        default:              return b
      }
    })
    comps.push({ type: 'BUTTONS', buttons: mapped })
  }

  return comps
}

// ── Extract readable body text from Meta components ──────────────────────────
function extractBody(components: any[]): string {
  return components?.find(c => c.type === 'BODY')?.text ?? ''
}

// ── Map a Meta template object to our local DB schema ────────────────────────
function metaToLocal(t: any, workspaceId: string) {
  const components = t.components ?? []
  const header     = components.find((c: any) => c.type === 'HEADER')
  const body       = extractBody(components)
  const footer     = components.find((c: any) => c.type === 'FOOTER')
  const btnComp    = components.find((c: any) => c.type === 'BUTTONS')

  return {
    workspace_id:     workspaceId,
    platform:         'whatsapp',
    name:             t.name,
    category:         t.category,             // keep Meta casing e.g. "MARKETING"
    language:         t.language,
    body,
    header_text:      header?.format === 'TEXT' ? (header.text ?? null) : null,
    footer_text:      footer?.text ?? null,
    status:           t.status.toLowerCase(),  // "approved" / "pending" etc.
    meta_template_id: String(t.id),
    variables:        [],
    meta: {
      // Preserve the COMPLETE Meta structure so we can always reconstruct
      components,
      header_type:       header?.format ?? 'NONE',
      header_media_url:  null,                 // set after Supabase Storage upload
      buttons:           btnComp?.buttons ?? [],
      quality_score:     t.quality_score   ?? null,
      rejected_reason:   t.rejected_reason ?? null,
      parameter_format:  t.parameter_format ?? 'POSITIONAL',
      template_type:     'STANDARD',           // may be overridden for AUTH
    },
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// GET — fast local read, or full Meta sync if ?sync=true
// ═════════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const session = await getAuth(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wsId = await getWorkspaceId(session.user.id)
  if (!wsId)  return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { token, wabaId, hasWaba } = await getChannel(wsId)
  const doSync = req.nextUrl.searchParams.get('sync') === 'true'

  // ── Local-only (default) ──────────────────────────────────────────────────
  if (!doSync || !hasWaba) {
    const { data } = await admin
      .from('templates')
      .select('*')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })
    return NextResponse.json({
      templates: data ?? [],
      source:    'local',
      has_waba:  hasWaba,
      missing:   !wabaId ? 'WABA_ID' : !token ? 'TOKEN' : null,
    })
  }

  // ── Meta full sync (cursor-paginated) ─────────────────────────────────────
  let metaAll:   any[]         = []
  let syncError: string | null = null

  try {
    // Fetch ALL pages from Meta
    let nextUrl: string | null = `${WA_BASE}/${wabaId}/message_templates`
    let params: Record<string, any> | undefined = {
      fields: 'id,name,status,category,language,components,quality_score,rejected_reason,parameter_format',
      limit:  250,
    }

    while (nextUrl) {
      const res: any = await axios.get(nextUrl, {
        params:  params,
        headers: { Authorization: `Bearer ${token}` },
      })
      metaAll  = metaAll.concat(res.data?.data ?? [])
      nextUrl  = res.data?.paging?.next ?? null
      params   = undefined  // next URL already includes query params
    }

    console.log(`[TPL SYNC] Fetched ${metaAll.length} templates from Meta`)

    // Upsert each Meta template into Supabase
    for (const t of metaAll) {
      const record = metaToLocal(t, wsId)

      // Check for existing row by meta_template_id
      const { data: existing } = await admin
        .from('templates')
        .select('id, meta')
        .eq('workspace_id', wsId)
        .eq('meta_template_id', String(t.id))
        .maybeSingle()

      if (existing) {
        // Preserve our stored media URL during sync
        if (existing.meta?.header_media_url) {
          record.meta.header_media_url = existing.meta.header_media_url
        }
        await admin.from('templates').update(record).eq('id', existing.id)
      } else {
        await admin.from('templates').insert(record)
      }
    }

    // Delete local rows that no longer exist on Meta
    if (metaAll.length > 0) {
      const metaIds = metaAll.map(t => String(t.id))
      const { data: localSynced } = await admin
        .from('templates')
        .select('id, meta_template_id')
        .eq('workspace_id', wsId)
        .not('meta_template_id', 'is', null)

      if (localSynced) {
        const staleIds = localSynced
          .filter(r => !metaIds.includes(String(r.meta_template_id)))
          .map(r => r.id)
        if (staleIds.length > 0) {
          await admin.from('templates').delete().in('id', staleIds)
          console.log(`[TPL SYNC] Removed ${staleIds.length} stale local templates`)
        }
      }
    }
  } catch (err: any) {
    syncError = err?.response?.data?.error?.message ?? err.message
    console.error('[TPL SYNC] Meta error:', syncError)
  }

  // Return merged list
  const { data: all } = await admin
    .from('templates')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    templates:   all ?? [],
    meta_count:  metaAll.length,
    source:      'meta_synced',
    has_waba:    hasWaba,
    sync_error:  syncError,
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// POST — create new template
// ═════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const session = await getAuth(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wsId = await getWorkspaceId(session.user.id)
  if (!wsId)  return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { token, wabaId, phoneId } = await getChannel(wsId)
  const { fields: f, mediaFile }   = await parseBody(req)

  // Validate
  const name = (f.name ?? '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  if (!name)              return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!f.category)        return NextResponse.json({ error: 'category is required' }, { status: 400 })
  if (!f.language)        return NextResponse.json({ error: 'language is required' }, { status: 400 })
  if (!f.body_text && f.template_type !== 'AUTHENTICATION') {
    return NextResponse.json({ error: 'body_text is required' }, { status: 400 })
  }

  // ── Upload media if provided ───────────────────────────────────────────────
  let storageUrl:   string | null = null
  let headerHandle: string | null = null

  if (mediaFile && mediaFile.size > 0) {
    storageUrl = await uploadToStorage(mediaFile, wsId)
    // Also upload to WA servers to get a handle for the template example
    if (token && phoneId) {
      const waId = await uploadMediaToWA(mediaFile, token, phoneId)
      if (waId) headerHandle = waId
    }
    // Fall back to storage URL as handle if WA upload failed
    if (!headerHandle && storageUrl) headerHandle = storageUrl
  } else if (f.header_url) {
    headerHandle = f.header_url
    storageUrl   = f.header_url
  }

  // ── Build components ───────────────────────────────────────────────────────
  const components = buildComponents({
    template_type:                f.template_type,
    header_type:                  f.header_type,
    header_text:                  f.header_text,
    header_handle:                headerHandle ?? undefined,
    header_examples:              f.header_examples,
    body_text:                    f.body_text ?? '',
    body_examples:                f.body_examples,
    footer_text:                  f.footer_text,
    buttons:                      f.buttons,
    add_security_recommendation:  f.add_security_recommendation,
    code_expiration_minutes:      f.code_expiration_minutes ? Number(f.code_expiration_minutes) : undefined,
  })

  const metaPayload = {
    name,
    category:   f.category.toUpperCase(),
    language:   f.language,
    components,
  }

  // ── Submit to Meta ─────────────────────────────────────────────────────────
  let metaId:    string | null = null
  let metaStatus = 'draft'
  let metaError: string | null = null

  if (wabaId && token) {
    try {
      const res = await axios.post(
        `${WA_BASE}/${wabaId}/message_templates`,
        metaPayload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )
      metaId     = String(res.data?.id ?? '')
      metaStatus = res.data?.status?.toLowerCase() ?? 'pending'
      console.log(`[TPL] Created on Meta: ${name} (${metaId}) → ${metaStatus}`)
    } catch (err: any) {
      metaError = err?.response?.data?.error?.message ?? err.message
      console.error('[TPL] Meta create error:', metaError)
      metaStatus = 'draft'
    }
  } else {
    metaError = wabaId ? 'Missing token' : 'WHATSAPP_WABA_ID not set — saved as draft'
  }

  // ── Save to Supabase ───────────────────────────────────────────────────────
  const { data: saved, error: dbErr } = await admin.from('templates').insert({
    workspace_id:     wsId,
    platform:         'whatsapp',
    name,
    category:         f.category.toUpperCase(),
    language:         f.language,
    body:             f.body_text ?? '',
    header_text:      f.header_type === 'TEXT' ? (f.header_text ?? null) : null,
    footer_text:      f.footer_text || null,
    status:           metaStatus,
    meta_template_id: metaId,
    variables:        [],
    meta: {
      components,
      template_type:                f.template_type ?? 'STANDARD',
      header_type:                  f.header_type ?? 'NONE',
      header_media_url:             storageUrl ?? null,
      buttons:                      f.buttons ?? [],
      add_security_recommendation:  f.add_security_recommendation ?? false,
      code_expiration_minutes:      f.code_expiration_minutes ?? null,
      meta_error:                   metaError,
    },
  }).select().single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ template: saved, meta_id: metaId, meta_status: metaStatus, meta_error: metaError })
}

// ═════════════════════════════════════════════════════════════════════════════
// PATCH — edit existing template
//
// Meta edit rules (from API docs):
//   • Endpoint: POST /v25.0/{meta_template_id}  (NOT the WABA endpoint)
//   • Body: { name, components, language, category }
//   • Only APPROVED, REJECTED, PAUSED can be edited
//   • APPROVED: max 10 edits/30 days, 1/24h; category locked; name locked
//   • REJECTED / PAUSED: unlimited edits
//   • After edit → status becomes "pending" again
// ═════════════════════════════════════════════════════════════════════════════
export async function PATCH(req: NextRequest) {
  const session = await getAuth(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wsId = await getWorkspaceId(session.user.id)
  if (!wsId)  return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { token, wabaId, phoneId } = await getChannel(wsId)
  const { fields: f, mediaFile }   = await parseBody(req)

  const localId = f.template_id
  if (!localId) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  // Load current row
  const { data: current } = await admin.from('templates').select('*').eq('id', localId).single()
  if (!current) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const isApproved = current.status === 'approved'

  // ── Upload new media if provided ───────────────────────────────────────────
  let storageUrl   = current.meta?.header_media_url ?? null
  let headerHandle = f.header_url || storageUrl

  if (mediaFile && mediaFile.size > 0) {
    const uploaded = await uploadToStorage(mediaFile, wsId)
    if (uploaded) {
      storageUrl   = uploaded
      headerHandle = uploaded
      // Try to get a WA media handle too
      if (token && phoneId) {
        const waId = await uploadMediaToWA(mediaFile, token, phoneId)
        if (waId) headerHandle = waId
      }
    }
  }

  // ── Build updated components ───────────────────────────────────────────────
  const components = buildComponents({
    template_type:                f.template_type ?? current.meta?.template_type,
    header_type:                  f.header_type   ?? current.meta?.header_type,
    header_text:                  f.header_text   ?? current.header_text,
    header_handle:                headerHandle ?? undefined,
    header_examples:              f.header_examples,
    body_text:                    f.body_text ?? current.body ?? '',
    body_examples:                f.body_examples,
    footer_text:                  f.footer_text ?? current.footer_text,
    buttons:                      f.buttons     ?? current.meta?.buttons,
    add_security_recommendation:  f.add_security_recommendation ?? current.meta?.add_security_recommendation,
    code_expiration_minutes:      f.code_expiration_minutes ?? current.meta?.code_expiration_minutes,
  })

  // Use existing name/category (locked for approved; can change for rejected/paused)
  const finalName     = isApproved ? current.name     : (f.name     ?? current.name)
  const finalCategory = isApproved ? current.category : (f.category ?? current.category)
  const finalLanguage = f.language ?? current.language

  let metaError:    string | null = null
  let editStrategy  = 'local_only'
  let newMetaId     = current.meta_template_id

  // ── Call Meta edit endpoint ────────────────────────────────────────────────
  if (current.meta_template_id && token) {
    try {
      // Edit endpoint: POST /v25.0/{meta_template_id}
      await axios.post(
        `${WA_BASE}/${current.meta_template_id}`,
        {
          name:       finalName,
          components,
          language:   finalLanguage,
          category:   finalCategory.toUpperCase(),
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )
      editStrategy = 'inplace'
      console.log(`[TPL] Edited on Meta: ${finalName} (${current.meta_template_id})`)
    } catch (err: any) {
      metaError = err?.response?.data?.error?.message ?? err.message
      console.error('[TPL] Meta edit error:', metaError)

      // If in-place edit failed (e.g. pending templates can't be edited), try delete+recreate
      if (wabaId && !isApproved) {
        try {
          await axios.delete(`${WA_BASE}/${wabaId}/message_templates`, {
            params:  { hsm_id: current.meta_template_id, name: current.name },
            headers: { Authorization: `Bearer ${token}` },
          })
          const reCreate = await axios.post(
            `${WA_BASE}/${wabaId}/message_templates`,
            { name: finalName, category: finalCategory.toUpperCase(), language: finalLanguage, components },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
          )
          newMetaId    = String(reCreate.data?.id ?? '')
          metaError    = null
          editStrategy = 'recreated'
          console.log(`[TPL] Recreated on Meta: ${finalName} (${newMetaId})`)
        } catch (reErr: any) {
          metaError = reErr?.response?.data?.error?.message ?? reErr.message
          console.error('[TPL] Meta recreate error:', metaError)
        }
      }
    }
  } else if (!current.meta_template_id && wabaId && token) {
    // Draft → try to submit for the first time
    try {
      const res = await axios.post(
        `${WA_BASE}/${wabaId}/message_templates`,
        { name: finalName, category: finalCategory.toUpperCase(), language: finalLanguage, components },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )
      newMetaId    = String(res.data?.id ?? '')
      editStrategy = 'submitted'
      console.log(`[TPL] Submitted draft to Meta: ${finalName} (${newMetaId})`)
    } catch (err: any) {
      metaError = err?.response?.data?.error?.message ?? err.message
    }
  }

  // ── Update Supabase ────────────────────────────────────────────────────────
  const { data: updated, error: dbErr } = await admin
    .from('templates')
    .update({
      name:             finalName,
      category:         finalCategory.toUpperCase(),
      language:         finalLanguage,
      body:             f.body_text ?? current.body ?? '',
      header_text:      (f.header_type ?? current.meta?.header_type) === 'TEXT' ? (f.header_text ?? current.header_text) : null,
      footer_text:      f.footer_text ?? current.footer_text,
      status:           metaError && editStrategy === 'local_only' ? current.status : 'pending',
      meta_template_id: newMetaId,
      meta: {
        ...current.meta,
        components,
        template_type:               f.template_type ?? current.meta?.template_type ?? 'STANDARD',
        header_type:                 f.header_type   ?? current.meta?.header_type ?? 'NONE',
        header_media_url:            storageUrl,
        buttons:                     f.buttons ?? current.meta?.buttons ?? [],
        add_security_recommendation: f.add_security_recommendation ?? current.meta?.add_security_recommendation,
        code_expiration_minutes:     f.code_expiration_minutes ?? current.meta?.code_expiration_minutes,
        meta_error:                  metaError,
      },
    })
    .eq('id', localId)
    .select().single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ template: updated, meta_error: metaError, edit_strategy: editStrategy })
}

// ═════════════════════════════════════════════════════════════════════════════
// DELETE — remove from Meta (by hsm_id + name) and Supabase
// ═════════════════════════════════════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  const session = await getAuth(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wsId = await getWorkspaceId(session.user.id)
  if (!wsId)  return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { token, wabaId } = await getChannel(wsId)
  const { template_id, template_name, meta_template_id } = await req.json()

  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  let metaDeleted = false
  let metaError:  string | null = null

  if (wabaId && token && template_name) {
    try {
      // Use hsm_id (= meta_template_id) if available for precise single-language delete
      const params: Record<string, string> = { name: template_name }
      if (meta_template_id) params.hsm_id = String(meta_template_id)

      await axios.delete(
        `${WA_BASE}/${wabaId}/message_templates`,
        { params, headers: { Authorization: `Bearer ${token}` } }
      )
      metaDeleted = true
      console.log(`[TPL] Deleted from Meta: ${template_name} (${meta_template_id ?? 'no id'})`)
    } catch (err: any) {
      metaError = err?.response?.data?.error?.message ?? err.message
      console.warn('[TPL] Meta delete warning:', metaError)
      // Still delete locally
    }
  }

  await admin.from('templates').delete().eq('id', template_id)

  return NextResponse.json({ success: true, meta_deleted: metaDeleted, meta_error: metaError })
}
