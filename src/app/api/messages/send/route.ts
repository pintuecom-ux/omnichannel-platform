/**
 * /api/messages/send/route.ts
 *
 * Final merged version:
 * Platforms:
 * - WhatsApp
 * - Facebook
 * - Instagram
 *
 * Supported message types:
 * - text
 * - template
 * - media
 * - flow
 * - reaction (WA)
 * - list (WA)
 * - comment_reply (FB/IG)
 *
 * Extras:
 * - reply_to_external_id
 * - OTP template support
 * - URL button templates
 * - media upload + storage
 * - metadata logging
 */

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

function detectMediaType(
  mime: string
): 'image' | 'video' | 'audio' | 'document' | 'sticker' {
  if (mime.startsWith('image/webp')) return 'sticker'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

/**
 * Builds template components:
 * body vars
 * OTP copy_code
 * URL button params
 * quick reply payload
 */
function buildSendComponents(
  bodyVars: string[] = [],
  buttonParams?: {
    index: number
    subType: 'copy_code' | 'url' | 'quick_reply'
    value: string
  }[]
): any[] {
  const components: any[] = []

  if (bodyVars.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyVars.map((v) => ({
        type: 'text',
        text: v || '',
      })),
    })
  }

  if (buttonParams?.length) {
    for (const bp of buttonParams) {
      const btn: any = {
        type: 'button',
        sub_type: bp.subType,
        index: String(bp.index),
        parameters: [],
      }

      if (bp.subType === 'copy_code') {
        btn.parameters = [
          {
            type: 'coupon_code',
            coupon_code: bp.value,
          },
        ]
      } else if (bp.subType === 'url') {
        btn.parameters = [{ type: 'text', text: bp.value }]
      } else {
        btn.parameters = [{ type: 'payload', payload: bp.value }]
      }

      components.push(btn)
    }
  }

  return components
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const supabase = await serverClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ct = req.headers.get('content-type') ?? ''
  let payload: any = {}

  /* ---------------------------------------------------------------------- */
  /* Read body                                                              */
  /* ---------------------------------------------------------------------- */

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()

    payload = {
      conversation_id: form.get('conversation_id'),

      body: form.get('body') ?? null,
      type: form.get('type') ?? 'text',

      reply_to_external_id: form.get('reply_to_external_id') ?? null,

      // template
      template_name: form.get('template_name') ?? null,
      template_language: form.get('template_language') ?? 'en_US',
      template_components: JSON.parse(
        (form.get('template_components') as string) ?? '[]'
      ),
      otp_code: form.get('otp_code') ?? null,

      // media
      file: form.get('file') ?? null,
      filename: form.get('filename') ?? null,

      // flow
      flow_id: form.get('flow_id') ?? null,
      flow_name: form.get('flow_name') ?? null,
      flow_token: form.get('flow_token') ?? null,
      flow_header: form.get('flow_header') ?? null,
      flow_footer: form.get('flow_footer') ?? null,
      flow_cta: form.get('flow_cta') ?? 'Open',
      flow_screen: form.get('flow_screen') ?? null,
      flow_mode: form.get('flow_mode') ?? 'published',
      flow_action_payload: JSON.parse(
        (form.get('flow_action_payload') as string) ?? '{}'
      ),

      // reactions
      reaction_emoji: form.get('reaction_emoji') ?? null,
      reaction_message_id: form.get('reaction_message_id') ?? null,

      // list
      list_button_text: form.get('list_button_text') ?? null,
      list_sections: JSON.parse(
        (form.get('list_sections') as string) ?? '[]'
      ),

      // comment
      comment_id: form.get('comment_id') ?? null,
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
    return NextResponse.json(
      { error: 'conversation_id required' },
      { status: 400 }
    )
  }

  /* ---------------------------------------------------------------------- */
  /* Load conversation                                                      */
  /* ---------------------------------------------------------------------- */

  const { data: conv } = await admin
    .from('conversations')
    .select('*, contact:contacts(*), channel:channels(*)')
    .eq('id', conversation_id)
    .single()

  if (!conv) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 }
    )
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('workspace_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 }
    )
  }

  /* ---------------------------------------------------------------------- */
  /* Process                                                                */
  /* ---------------------------------------------------------------------- */

  try {
    let externalId: string | null = null
    let messageBody: string | null = body ?? null
    let savedMediaUrl: string | null = null
    let savedMime: string | null = null
    let contentType2 = 'text'

    /* ====================================================================== */
    /* WHATSAPP                                                               */
    /* ====================================================================== */

    if (conv.platform === 'whatsapp') {
      if (!conv.contact?.phone) {
        return NextResponse.json(
          { error: 'Contact has no phone number' },
          { status: 400 }
        )
      }

      const wa = new WhatsAppClient(
        conv.channel.access_token,
        conv.channel.external_id
      )

      const replyOpts = reply_to_external_id
        ? { replyToMessageId: reply_to_external_id }
        : undefined

      /* ---------------- text ---------------- */

      if (type === 'text') {
        externalId = await wa.sendText(
          conv.contact.phone,
          body,
          replyOpts
        )
      }

      /* ---------------- template ---------------- */

      else if (type === 'template') {
        if (!template_name) {
          return NextResponse.json(
            { error: 'template_name required' },
            { status: 400 }
          )
        }

        let finalComponents = template_components

        if (
          (!finalComponents || finalComponents.length === 0) &&
          otp_code
        ) {
          finalComponents = buildSendComponents([], [
            {
              index: 0,
              subType: 'copy_code',
              value: otp_code,
            },
          ])
        }

        if (
          Array.isArray(finalComponents) &&
          finalComponents.length > 0 &&
          typeof finalComponents[0] === 'string'
        ) {
          finalComponents = buildSendComponents(finalComponents)
        }

        externalId = await wa.sendTemplate(
          conv.contact.phone,
          template_name,
          template_language,
          finalComponents,
          replyOpts
        )

        messageBody = body ?? `[Template: ${template_name}]`
        contentType2 = 'template'
      }

      /* ---------------- media ---------------- */

      else if (type === 'media') {
        if (!file) {
          return NextResponse.json(
            { error: 'file required' },
            { status: 400 }
          )
        }

        const fileObj = file as File
        const buffer = Buffer.from(await fileObj.arrayBuffer())
        const mime = fileObj.type
        const name =
          (filename as string) ??
          fileObj.name ??
          'attachment'

        const mediaType = detectMediaType(mime)

        const mediaId = await wa.uploadMedia(
          buffer,
          mime,
          name
        )

        const ext =
          mime
            .split('/')[1]
            ?.replace(/[^a-z0-9]/g, '') ?? 'bin'

        const path = `${profile.workspace_id}/${conversation_id}/${Date.now()}.${ext}`

        const { error: upErr } = await admin.storage
          .from('media')
          .upload(path, buffer, {
            contentType: mime,
            upsert: true,
          })

        if (!upErr) {
          const { data: pub } =
            admin.storage
              .from('media')
              .getPublicUrl(path)

          savedMediaUrl = pub.publicUrl
        }

        savedMime = mime

        externalId = await wa.sendMedia(
          conv.contact.phone,
          mediaId,
          mediaType,
          body || undefined,
          mediaType === 'document'
            ? name
            : undefined,
          replyOpts
        )

        messageBody = body ?? name
        contentType2 = mediaType
      }

      /* ---------------- flow ---------------- */

      else if (type === 'flow') {
        if (!flow_token) {
          return NextResponse.json(
            { error: 'flow_token required' },
            { status: 400 }
          )
        }

        if (!flow_id && !flow_name) {
          return NextResponse.json(
            {
              error:
                'flow_id or flow_name required',
            },
            { status: 400 }
          )
        }

        externalId = await wa.sendFlow(
          conv.contact.phone,
          {
            flowId: flow_id || undefined,
            flowName: flow_name || undefined,
            flowToken: flow_token,
            headerText:
              flow_header || undefined,
            bodyText: body,
            footerText:
              flow_footer || undefined,
            ctaText: flow_cta,
            screenId:
              flow_screen || undefined,
            mode: flow_mode,
            actionPayload:
              flow_action_payload,
            replyToMessageId:
              reply_to_external_id ||
              undefined,
          }
        )

        contentType2 = 'flow'
      }

      /* ---------------- reaction ---------------- */

      else if (type === 'reaction') {
        if (!reaction_message_id) {
          return NextResponse.json(
            {
              error:
                'reaction_message_id required',
            },
            { status: 400 }
          )
        }

        externalId = await wa.sendReaction(
          conv.contact.phone,
          reaction_message_id,
          reaction_emoji
        )

        messageBody = `[Reaction: ${
          reaction_emoji || 'removed'
        }]`

        contentType2 = 'reaction'
      }

      /* ---------------- list ---------------- */

      else if (type === 'list') {
        externalId =
          await wa.sendListMessage(
            conv.contact.phone,
            body,
            list_button_text,
            list_sections,
            replyOpts
          )

        contentType2 = 'interactive'
      }
    }

    /* ====================================================================== */
    /* FACEBOOK                                                               */
    /* ====================================================================== */

    else if (conv.platform === 'facebook') {
      const fb = new FacebookClient(
        conv.channel.access_token,
        conv.channel.external_id
      )

      if (type === 'text') {
        externalId = (
          await fb.sendMessage(
            conv.contact.facebook_id,
            body
          )
        )?.message_id
      } else if (type === 'comment_reply') {
        externalId = (
          await fb.replyToComment(
            comment_id,
            body
          )
        )?.id

        contentType2 = 'comment'
      } else {
        return NextResponse.json(
          {
            error: `Unsupported Facebook type: ${type}`,
          },
          { status: 400 }
        )
      }
    }

    /* ====================================================================== */
    /* INSTAGRAM                                                              */
    /* ====================================================================== */

    else if (conv.platform === 'instagram') {
      const ig = new InstagramClient(
        conv.channel.access_token,
        conv.channel.external_id
      )

      if (type === 'text') {
        externalId = (
          await ig.sendDM(
            conv.contact.facebook_id,
            body
          )
        )?.message_id
      } else if (type === 'comment_reply') {
        externalId = (
          await ig.replyToComment(
            comment_id,
            body
          )
        )?.id

        contentType2 = 'comment'
      } else {
        return NextResponse.json(
          {
            error: `Unsupported Instagram type: ${type}`,
          },
          { status: 400 }
        )
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Save DB                                                                */
    /* ---------------------------------------------------------------------- */

    const meta: any = {}

    if (reply_to_external_id) {
      meta.reply_to_external_id =
        reply_to_external_id
    }

    if (type === 'template') {
      meta.template_name = template_name
      meta.template_language =
        template_language
      meta.template_components =
        template_components
    }

    if (type === 'flow') {
      meta.flow_id = flow_id
      meta.flow_name = flow_name
      meta.flow_token = flow_token
      meta.flow_mode = flow_mode
    }

    if (type === 'reaction') {
      meta.reaction_message_id =
        reaction_message_id
      meta.reaction_emoji =
        reaction_emoji
    }

    const { data: msg, error: msgErr } =
      await admin
        .from('messages')
        .insert({
          conversation_id,
          workspace_id:
            profile.workspace_id,
          external_id: externalId,
          direction: 'outbound',
          content_type: contentType2,
          body: messageBody,
          media_url: savedMediaUrl,
          media_mime: savedMime,
          sender_id: session.user.id,
          status: externalId
            ? 'sent'
            : 'queued',
          is_note: false,
          meta,
        })
        .select()
        .single()

    if (msgErr) throw new Error(msgErr.message)

    if (type !== 'reaction') {
      await admin
        .from('conversations')
        .update({
          last_message:
            messageBody ??
            `[${contentType2}]`,
          last_message_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', conversation_id)
    }

    return NextResponse.json({
      message: msg,
    })
  } catch (err: any) {
    console.error(
      '[Send API Error]',
      err.message
    )

    return NextResponse.json(
      {
        error:
          err.message ||
          'Failed to send',
      },
      { status: 500 }
    )
  }
}