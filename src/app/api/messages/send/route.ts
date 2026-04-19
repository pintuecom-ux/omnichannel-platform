/**
 * /api/messages/send
 *
 * Supports: text, template, media, flow (NEW — FIX BUG-06)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient } from '@/lib/platforms/whatsapp'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function detectMediaType(mime: string): 'image' | 'video' | 'audio' | 'document' | 'sticker' {
  if (mime.startsWith('image/webp')) return 'sticker'
  if (mime.startsWith('image/'))     return 'image'
  if (mime.startsWith('video/'))     return 'video'
  if (mime.startsWith('audio/'))     return 'audio'
  return 'document'
}

export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Support both JSON and multipart/form-data (for file attachments)
  const ct = req.headers.get('content-type') ?? ''
  let payload: Record<string, any>

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    payload = {
      conversation_id:     form.get('conversation_id'),
      body:                form.get('body') ?? null,
      type:                form.get('type') ?? 'text',
      template_name:       form.get('template_name') ?? null,
      template_language:   form.get('template_language') ?? 'en_US',
      template_components: JSON.parse((form.get('template_components') as string) ?? '[]'),
      file:                form.get('file') ?? null,
      filename:            form.get('filename') ?? null,
      // Flow fields
      flow_id:             form.get('flow_id') ?? null,
      flow_name:           form.get('flow_name') ?? null,
      flow_token:          form.get('flow_token') ?? null,
      flow_header:         form.get('flow_header') ?? null,
      flow_footer:         form.get('flow_footer') ?? null,
      flow_cta:            form.get('flow_cta') ?? 'Open',
      flow_screen:         form.get('flow_screen') ?? null,
      flow_mode:           form.get('flow_mode') ?? 'published',
      flow_action_payload: JSON.parse((form.get('flow_action_payload') as string) ?? '{}'),
    }
  } else {
    payload = await req.json()
  }

  const {
    conversation_id, body, type = 'text',
    template_name, template_language = 'en_US', template_components = [],
    file, filename,
    // Flow
    flow_id, flow_name, flow_token, flow_header, flow_footer,
    flow_cta = 'Open', flow_screen, flow_mode = 'published', flow_action_payload = {},
  } = payload

  if (!conversation_id) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })

  const { data: conv } = await admin
    .from('conversations')
    .select('*, contact:contacts(*), channel:channels(*)')
    .eq('id', conversation_id)
    .single()
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const { data: profile } = await admin
    .from('profiles').select('workspace_id').eq('id', session.user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (conv.platform === 'whatsapp' && !conv.contact?.phone)
    return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })

  try {
    let externalId:  string | null = null
    let messageBody: string | null = body ?? null
    let savedMediaUrl: string | null = null
    let savedMime:     string | null = null
    let contentType2: string = type === 'template' ? 'template' : type === 'flow' ? 'flow' : 'text'

    if (conv.platform === 'whatsapp') {
      const wa = new WhatsAppClient(conv.channel.access_token, conv.channel.external_id)

      // ── Text ────────────────────────────────────────────────────────────
      if (type === 'text') {
        externalId = await wa.sendText(conv.contact.phone, body)
      }

      // ── Template ─────────────────────────────────────────────────────────
      else if (type === 'template' && template_name) {
        externalId = await wa.sendTemplate(
          conv.contact.phone,
          template_name,
          template_language,
          template_components
        )
        messageBody = body ?? `[Template: ${template_name}]`
      }

      // ── Media ─────────────────────────────────────────────────────────────
      else if (type === 'media' && file) {
        const fileObj = file as File
        const buffer  = Buffer.from(await fileObj.arrayBuffer())
        const mime    = fileObj.type
        const name    = (filename as string) ?? fileObj.name ?? 'attachment'
        const mType   = detectMediaType(mime)
        contentType2  = mType

        // Upload to WA servers (get media_id)
        const mediaId = await wa.uploadMedia(buffer, mime, name)

        // Persist to Supabase Storage for permanent URL
        const ext = mime.split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/g, '') ?? 'bin'
        const storagePath = `${profile.workspace_id}/${conversation_id}/${Date.now()}.${ext}`
        const { error: upErr } = await admin.storage
          .from('media')
          .upload(storagePath, buffer, { contentType: mime, upsert: true })
        if (!upErr) {
          const { data: pub } = admin.storage.from('media').getPublicUrl(storagePath)
          savedMediaUrl = pub.publicUrl
        }
        savedMime = mime

        externalId = await wa.sendMedia(
          conv.contact.phone, mediaId, mType,
          (body as string) || undefined,
          mType === 'document' ? name : undefined
        )
        messageBody = body ?? name
      }

      // ── Flow (NEW — FIX BUG-06) ───────────────────────────────────────────
      else if (type === 'flow') {
        if (!flow_token) {
          return NextResponse.json({ error: 'flow_token required for flow messages' }, { status: 400 })
        }
        if (!flow_id && !flow_name) {
          return NextResponse.json({ error: 'flow_id or flow_name required' }, { status: 400 })
        }
        if (!body) {
          return NextResponse.json({ error: 'body (flow body text) required' }, { status: 400 })
        }

        externalId = await wa.sendFlow(conv.contact.phone, {
          flowId:        flow_id || undefined,
          flowName:      flow_name || undefined,
          flowToken:     flow_token,
          headerText:    flow_header || undefined,
          bodyText:      body,
          footerText:    flow_footer || undefined,
          ctaText:       flow_cta,
          screenId:      flow_screen || undefined,
          mode:          flow_mode as 'draft' | 'published',
          actionPayload: flow_action_payload,
        })
        messageBody = body
        contentType2 = 'flow'
      }
    }

    // ── Save to DB ───────────────────────────────────────────────────────────
    const { data: msg, error: msgErr } = await admin.from('messages').insert({
      conversation_id,
      workspace_id:    profile.workspace_id,
      external_id:     externalId,
      direction:       'outbound',
      content_type:    contentType2,
      body:            messageBody,
      media_url:       savedMediaUrl,
      media_mime:      savedMime,
      sender_id:       session.user.id,
      status:          externalId ? 'sent' : 'queued',
      is_note:         false,
      meta: type === 'template'
        ? { template_name, template_language, template_components }
        : type === 'flow'
          ? { flow_id, flow_name, flow_token, flow_mode, flow_screen }
          : {},
    }).select().single()

    if (msgErr) throw new Error(msgErr.message)

    await admin.from('conversations').update({
      last_message:    messageBody ?? `[${contentType2}]`,
      last_message_at: new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    }).eq('id', conversation_id)

    return NextResponse.json({ message: msg })
  } catch (err: any) {
    console.error('[Send API Error]', err.message)
    return NextResponse.json({ error: err.message || 'Failed to send' }, { status: 500 })
  }
}