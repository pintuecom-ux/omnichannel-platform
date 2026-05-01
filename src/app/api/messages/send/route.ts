import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient } from '@/lib/platforms/whatsapp'
import { FacebookClient } from '@/lib/platforms/facebook'
import { InstagramClient } from '@/lib/platforms/instagram'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function detectMediaType(mime: string): 'image' | 'video' | 'audio' | 'document' | 'sticker' {
  if (mime.startsWith('image/webp')) return 'sticker'
  if (mime.startsWith('image/'))     return 'image'
  if (mime.startsWith('video/'))     return 'video'
  if (mime.startsWith('audio/'))     return 'audio'
  return 'document'
}

/**
 * buildSendComponents
 *
 * FIX (Issue 6 — Error 131009):
 * The Meta WhatsApp API rejects templates with FLOW-type buttons if you
 * include ANY button component with sub_type='flow' in the components array.
 * FLOW buttons are fully self-contained in the template definition and must
 * be sent with NO button component parameters at all.
 *
 * Rules:
 *   - Body variables → [{type:'body', parameters:[{type:'text',text:'val'}]}]
 *   - OTP copy_code  → [{type:'button', sub_type:'copy_code', index:'0',
 *                         parameters:[{type:'coupon_code',coupon_code:'CODE'}]}]
 *   - URL suffix     → [{type:'button', sub_type:'url', index:'0',
 *                         parameters:[{type:'text',text:'SUFFIX'}]}]
 *   - FLOW button    → *** OMITTED — never include parameters for flow buttons ***
 *   - quick_reply    → [{type:'button', sub_type:'quick_reply', index:'N',
 *                         parameters:[{type:'payload',payload:'VAL'}]}]
 */
function buildSendComponents(
  bodyVars: string[] = [],
  buttonParams?: {
    index:   number
    subType: 'copy_code' | 'url' | 'quick_reply' | 'flow'
    value:   string
  }[]
): any[] {
  const components: any[] = []

  if (bodyVars.length > 0 && bodyVars.some(v => v)) {
    components.push({
      type:       'body',
      parameters: bodyVars.map(v => ({ type: 'text', text: v || '' })),
    })
  }

  if (buttonParams?.length) {
    for (const bp of buttonParams) {
      // *** FIX (Issue 6): Skip FLOW buttons entirely ***
      // Meta API error 131009 is thrown when you include button parameters
      // for a FLOW-type button. FLOW buttons are static — they have no
      // runtime parameters. Sending them causes "Parameter value is not valid".
      if (bp.subType === 'flow') {
        console.log('[buildSendComponents] Skipping FLOW button parameter (not allowed by Meta)')
        continue
      }

      const btn: any = {
        type:       'button',
        sub_type:   bp.subType,
        index:      String(bp.index),
        parameters: [],
      }
      if (bp.subType === 'copy_code') {
        btn.parameters = [{ type: 'coupon_code', coupon_code: bp.value }]
      } else if (bp.subType === 'url') {
        btn.parameters = [{ type: 'text', text: bp.value }]
      } else {
        // quick_reply
        btn.parameters = [{ type: 'payload', payload: bp.value }]
      }
      components.push(btn)
    }
  }

  return components
}

/**
 * sanitizeTemplateComponents
 *
 * FIX (Issue 6): When the front-end sends pre-built components from an
 * older template picker, they may already contain a FLOW button component.
 * Strip it here before forwarding to the Meta API.
 *
 * Also strips any button component whose parameters array is empty and
 * sub_type is 'flow' — which would cause the 131009 error.
 */
function sanitizeTemplateComponents(components: any[]): any[] {
  if (!Array.isArray(components)) return []

  return components.filter(c => {
    // If it's a button component with sub_type 'flow', drop it
    if (
      c.type === 'button' &&
      (c.sub_type === 'flow' || c.sub_type === 'FLOW')
    ) {
      console.log('[sanitizeTemplateComponents] Removed FLOW button component')
      return false
    }
    return true
  })
}

/* -------------------------------------------------------------------------- */
/* Route Handler                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const supabase = await serverClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  /* ---------------------------------------------------------------------- */
  /* Parse request body (JSON or multipart)                                 */
  /* ---------------------------------------------------------------------- */

  const ct = req.headers.get('content-type') ?? ''
  let payload: any = {}

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    payload = {
      conversation_id:      form.get('conversation_id'),
      body:                 form.get('body') ?? null,
      type:                 form.get('type') ?? 'text',
      reply_to_external_id: form.get('reply_to_external_id') ?? null,
      template_name:        form.get('template_name') ?? null,
      template_language:    form.get('template_language') ?? 'en_US',
      template_components:  JSON.parse((form.get('template_components') as string) ?? '[]'),
      otp_code:             form.get('otp_code') ?? null,
      file:                 form.get('file') ?? null,
      filename:             form.get('filename') ?? null,
      flow_id:              form.get('flow_id') ?? null,
      flow_name:            form.get('flow_name') ?? null,
      flow_token:           form.get('flow_token') ?? null,
      flow_header:          form.get('flow_header') ?? null,
      flow_footer:          form.get('flow_footer') ?? null,
      flow_cta:             form.get('flow_cta') ?? 'Open',
      flow_screen:          form.get('flow_screen') ?? null,
      flow_mode:            form.get('flow_mode') ?? 'published',
      flow_action_payload:  JSON.parse((form.get('flow_action_payload') as string) ?? '{}'),
      reaction_emoji:       form.get('reaction_emoji') ?? null,
      reaction_message_id:  form.get('reaction_message_id') ?? null,
      list_button_text:     form.get('list_button_text') ?? null,
      list_sections:        JSON.parse((form.get('list_sections') as string) ?? '[]'),
      comment_id:           form.get('comment_id') ?? null,
    }
  } else {
    payload = await req.json()
  }

  const {
    conversation_id,
    body,
    type = 'text',
    reply_to_external_id,
    template_name,
    template_language = 'en_US',
    template_components = [],
    otp_code,
    file,
    filename,
    flow_id,
    flow_name,
    flow_token,
    flow_header,
    flow_footer,
    flow_cta = 'Open',
    flow_screen,
    flow_mode = 'published',
    flow_action_payload = {},
    reaction_emoji,
    reaction_message_id,
    list_button_text,
    list_sections = [],
    comment_id,
  } = payload

  if (!conversation_id) {
    return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
  }

  /* ---------------------------------------------------------------------- */
  /* Load conversation + profile                                            */
  /* ---------------------------------------------------------------------- */

  const { data: conv } = await admin
    .from('conversations')
    .select('*, contact:contacts(*), channel:channels(*)')
    .eq('id', conversation_id)
    .single()

  if (!conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  /* ---------------------------------------------------------------------- */
  /* Send                                                                   */
  /* ---------------------------------------------------------------------- */

  try {
    let externalId:    string | null = null
    let messageBody:   string | null = body ?? null
    let savedMediaUrl: string | null = null
    let savedMime:     string | null = null

    // FIX (Issue 5): 'flow' is now a valid value in content_type.
    // The DB check constraint was updated in migration 001.
    let contentType2 = 'text'

    /* ==================================================================== */
    /* WHATSAPP                                                             */
    /* ==================================================================== */

    if (conv.platform === 'whatsapp') {
      if (!conv.contact?.phone) {
        return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })
      }

      const wa = new WhatsAppClient(conv.channel.access_token, conv.channel.external_id)
      const replyOpts = reply_to_external_id
        ? { replyToMessageId: reply_to_external_id as string }
        : undefined

      /* -- text -- */
      if (type === 'text') {
        externalId = await wa.sendText(conv.contact.phone, body, replyOpts)
      }

      /* -- template -- */
      else if (type === 'template') {
        if (!template_name) {
          return NextResponse.json({ error: 'template_name required' }, { status: 400 })
        }

        const isOTP = template_components?.some?.((c: any) =>
          c.type === 'button' && c.sub_type === 'copy_code'
        ) || otp_code

        let finalComponents: any[]

        if (isOTP && otp_code) {
          // OTP Authentication template — copy_code button only
          finalComponents = buildSendComponents([], [
            { index: 0, subType: 'copy_code', value: otp_code },
          ])
        } else if (Array.isArray(template_components) && template_components.length > 0) {
          if (typeof template_components[0] === 'string') {
            // Plain string array → body variables (no button params)
            finalComponents = buildSendComponents(template_components as string[])
          } else {
            // Pre-built component objects from front-end
            // FIX (Issue 6): strip any FLOW button components before sending
            finalComponents = sanitizeTemplateComponents(template_components)
          }
        } else {
          finalComponents = []
        }

        console.log(`[Send/template] name=${template_name} components=`, JSON.stringify(finalComponents))

        externalId = await wa.sendTemplate(
          conv.contact.phone,
          template_name,
          template_language,
          finalComponents,
          replyOpts
        )
        messageBody  = body ?? `[Template: ${template_name}]`
        contentType2 = 'template'
      }

      /* -- media -- */
      else if (type === 'media') {
        if (!file) {
          return NextResponse.json({ error: 'file required' }, { status: 400 })
        }

        const fileObj   = file as File
        const buffer    = Buffer.from(await fileObj.arrayBuffer())
        const mime      = fileObj.type
        const name      = (filename as string) ?? fileObj.name ?? 'attachment'
        const mediaType = detectMediaType(mime)
        contentType2    = mediaType

        const mediaId = await wa.uploadMedia(buffer, mime, name)

        const ext         = mime.split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/g, '') ?? 'bin'
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
          conv.contact.phone,
          mediaId,
          mediaType,
          (body as string) || undefined,
          mediaType === 'document' ? name : undefined,
          replyOpts
        )
        messageBody = body ?? name
      }

      /* -- flow (standalone interactive flow message) -- */
      // FIX (Issue 5): content_type was 'flow' but the DB check constraint
      // didn't include 'flow'. Migration 001 adds it.
      else if (type === 'flow') {
        if (!flow_token) return NextResponse.json({ error: 'flow_token required' }, { status: 400 })
        if (!flow_id && !flow_name) return NextResponse.json({ error: 'flow_id or flow_name required' }, { status: 400 })
        if (!body) return NextResponse.json({ error: 'body required for flow message' }, { status: 400 })

        externalId = await wa.sendFlow(conv.contact.phone, {
          flowId:          flow_id    || undefined,
          flowName:        flow_name  || undefined,
          flowToken:       flow_token,
          headerText:      flow_header || undefined,
          bodyText:        body,
          footerText:      flow_footer || undefined,
          ctaText:         flow_cta,
          screenId:        flow_screen || undefined,
          mode:            flow_mode as 'draft' | 'published',
          actionPayload:   flow_action_payload,
          replyToMessageId: reply_to_external_id || undefined,
        })
        messageBody  = body
        contentType2 = 'flow'   // ← now allowed by migration 001
      }

      /* -- reaction -- */
      else if (type === 'reaction') {
        if (!reaction_message_id) {
          return NextResponse.json({ error: 'reaction_message_id required' }, { status: 400 })
        }
        externalId   = await wa.sendReaction(conv.contact.phone, reaction_message_id, reaction_emoji ?? '')
        messageBody  = `[Reaction: ${reaction_emoji || 'removed'}]`
        contentType2 = 'reaction'
      }

      /* -- list -- */
      else if (type === 'list') {
        if (!body)             return NextResponse.json({ error: 'body required' }, { status: 400 })
        if (!list_button_text) return NextResponse.json({ error: 'list_button_text required' }, { status: 400 })
        if (!list_sections.length) return NextResponse.json({ error: 'list_sections required' }, { status: 400 })

        externalId   = await wa.sendListMessage(conv.contact.phone, body, list_button_text, list_sections, replyOpts)
        messageBody  = body
        contentType2 = 'interactive'
      }
    }

    /* ==================================================================== */
    /* FACEBOOK                                                             */
    /* ==================================================================== */

    else if (conv.platform === 'facebook') {
      const fb = new FacebookClient(conv.channel.access_token, conv.channel.external_id)

      if (type === 'text') {
        externalId   = (await fb.sendMessage(conv.contact.facebook_id, body))?.message_id
        contentType2 = 'text'
      } else if (type === 'comment_reply') {
        externalId   = (await fb.replyToComment(comment_id, body))?.id
        contentType2 = 'comment'
      } else {
        return NextResponse.json({ error: `Unsupported Facebook type: ${type}` }, { status: 400 })
      }
    }

    /* ==================================================================== */
    /* INSTAGRAM                                                            */
    /* ==================================================================== */

    else if (conv.platform === 'instagram') {
      const ig = new InstagramClient(conv.channel.access_token, conv.channel.external_id)

      if (type === 'text') {
        externalId   = (await ig.sendDM(conv.contact.facebook_id, body))?.message_id
        contentType2 = 'text'
      } else if (type === 'comment_reply') {
        externalId   = (await ig.replyToComment(comment_id, body))?.id
        contentType2 = 'comment'
      } else {
        return NextResponse.json({ error: `Unsupported Instagram type: ${type}` }, { status: 400 })
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Save message to DB                                                     */
    /* ---------------------------------------------------------------------- */

    const meta: any = {}

    if (reply_to_external_id) {
      meta.reply_to_external_id = reply_to_external_id
    }

    if (type === 'template') {
      meta.template_name       = template_name
      meta.template_language   = template_language
      meta.template_components = template_components
      if (otp_code) meta.otp_code = otp_code
    }

    if (type === 'flow') {
      meta.flow_id    = flow_id
      meta.flow_name  = flow_name
      meta.flow_token = flow_token
      meta.flow_mode  = flow_mode
      meta.flow_cta   = flow_cta
    }

    if (type === 'reaction') {
      meta.reaction_message_id = reaction_message_id
      meta.reaction_emoji      = reaction_emoji
    }

    const { data: msg, error: msgErr } = await admin
      .from('messages')
      .insert({
        conversation_id,
        workspace_id:  profile.workspace_id,
        external_id:   externalId,
        direction:     'outbound',
        content_type:  contentType2,
        body:          messageBody,
        media_url:     savedMediaUrl,
        media_mime:    savedMime,
        sender_id:     user.id,
        status:        externalId ? 'sent' : 'queued',
        is_note:       false,
        meta,
      })
      .select()
      .single()

    if (msgErr) throw new Error(msgErr.message)

    // FIX (Issue 4): Explicit conversation update here + DB trigger backup.
    // The DB trigger (migration 003) fires on INSERT to messages and keeps
    // last_message in sync. This explicit update is kept for the outbound
    // path as a belt-and-suspenders measure and handles edge cases where
    // the trigger might not be installed yet.
    if (type !== 'reaction') {
      const { error: convUpdateErr } = await admin
        .from('conversations')
        .update({
          last_message:    messageBody ?? `[${contentType2}]`,
          last_message_at: new Date().toISOString(),
          updated_at:      new Date().toISOString(),
        })
        .eq('id', conversation_id)

      if (convUpdateErr) {
        // Non-critical — DB trigger will still handle it
        console.warn('[Send] Conversation update warning:', convUpdateErr.message)
      }
    }

    return NextResponse.json({ message: msg })
  } catch (err: any) {
    console.error('[Send API Error]', err.message)
    return NextResponse.json({ error: err.message || 'Failed to send' }, { status: 500 })
  }
}
