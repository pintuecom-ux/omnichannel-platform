/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseFacebookWebhook, verifyFBSignature, FacebookClient } from '@/lib/platforms/facebook'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── GET: Meta webhook verification challenge ────────────────────────────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  if (
    p.get('hub.mode') === 'subscribe' &&
    p.get('hub.verify_token') === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(p.get('hub.challenge'), { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ── POST: Receive events ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256') ?? ''

    // Verify HMAC signature when app secret is configured
    if (process.env.META_APP_SECRET && !verifyFBSignature(rawBody, signature, process.env.META_APP_SECRET)) {
      return new NextResponse('Invalid signature', { status: 403 })
    }

    const body = JSON.parse(rawBody)

    // Validate this is a page object (not instagram or ads)
    if (body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' })
    }

    // CRITICAL: Must AWAIT on Vercel serverless — otherwise the function terminates immediately before DB writes complete
    console.log(`[FB webhook] ✅ Received object: ${body.object}, entries: ${body.entry?.length ?? 0}`)
    await handleFBEvents(body)
    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('[FB webhook] parse error:', err?.message ?? err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

async function handleFBEvents(body: any) {
  const events = parseFacebookWebhook(body)
  for (const ev of events) {
    if (ev.type === 'message') await processFBMessage(ev)
    else if (ev.type === 'comment') await processFBComment(ev)
    else if (ev.type === 'read') await processFBReadReceipt(ev)
  }
}

async function processFBReadReceipt(ev: any) {
  const { pageId, data } = ev
  console.log(`[FB Read Receipt] Processing for sender=${data.sender_id}, watermark=${data.watermark}`)

  const { data: channel } = await admin
    .from('channels')
    .select('id, workspace_id')
    .eq('platform', 'facebook')
    .eq('external_id', pageId)
    .maybeSingle()

  if (!channel) return

  const { data: contact } = await admin
    .from('contacts')
    .select('id')
    .eq('workspace_id', channel.workspace_id)
    .or(`facebook_scoped_id.eq.${data.sender_id},facebook_id.eq.${data.sender_id}`)
    .maybeSingle()

  if (!contact) return

  const { data: conv } = await admin
    .from('conversations')
    .select('id')
    .eq('channel_id', channel.id)
    .eq('contact_id', contact.id)
    .maybeSingle()

  if (!conv) return

  // Mark all outbound messages in this conversation as read
  const { error } = await admin
    .from('messages')
    .update({ status: 'read' })
    .eq('conversation_id', conv.id)
    .eq('direction', 'outbound')

  if (error) console.error('[FB Read Receipt] ❌ Error updating message status:', error.message)
  else console.log(`[FB Read Receipt] ✅ Outbound messages marked read for conv ${conv.id}`)
}

async function processFBMessage(ev: any) {
  const { pageId, data } = ev
  console.log(`[FB DM] Processing: sender=${data.sender_id}, pageId=${pageId}`)

  // Find the channel matching this Facebook Page ID
  const { data: channel, error: chErr } = await admin
    .from('channels')
    .select('*')
    .eq('platform', 'facebook')
    .eq('external_id', pageId)
    .maybeSingle()

  if (chErr) console.error('[FB DM] Channel lookup error:', chErr.message)
  if (!channel) {
    console.warn(`[FB DM] ❌ No active channel found in database for pageId=${pageId}`)
    return
  }
  console.log(`[FB DM] ✅ Found channel: ${channel.id}`)

  // Find or create the contact
  let { data: contact } = await admin
    .from('contacts')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .or(`facebook_scoped_id.eq.${data.sender_id},facebook_id.eq.${data.sender_id}`)
    .maybeSingle()

  const isGenericName = !contact || contact.name === data.sender_id || contact.name === 'Facebook User' || /^\d+$/.test(contact.name.trim())
  const isMissingAvatar = !contact?.avatar_url

  if (!contact || isGenericName || isMissingAvatar) {
    if (channel.access_token) {
      console.log(`[FB DM] Fetching Meta profile for sender_id=${data.sender_id}...`)
      const fb = new FacebookClient(channel.access_token, pageId)
      const profile = await fb.getUserProfile(data.sender_id)

      if (profile) {
        console.log(`[FB DM] ✅ Profile retrieved: name="${profile.name}", pic="${profile.profile_pic}"`)
        const nameToSave = (profile.name && profile.name !== data.sender_id) ? profile.name : (contact?.name || data.sender_id)
        const avatarToSave = profile.profile_pic || contact?.avatar_url || null

        if (!contact) {
          const { data: c } = await admin
            .from('contacts')
            .insert({
              workspace_id: channel.workspace_id,
              facebook_scoped_id: data.sender_id,
              facebook_id: data.sender_id,
              name: nameToSave,
              avatar_url: avatarToSave,
            })
            .select()
            .single()
          contact = c
        } else {
          const { data: updatedContact } = await admin
            .from('contacts')
            .update({
              name: nameToSave,
              avatar_url: avatarToSave,
              facebook_scoped_id: data.sender_id,
            })
            .eq('id', contact.id)
            .select()
            .single()
          if (updatedContact) contact = updatedContact
        }
      }
    }

    if (!contact) {
      const { data: c } = await admin
        .from('contacts')
        .insert({
          workspace_id: channel.workspace_id,
          facebook_scoped_id: data.sender_id,
          facebook_id: data.sender_id,
          name: data.sender_id,
        })
        .select()
        .single()
      contact = c
    }
  }
  if (!contact) return

  // Find open DM conversation or create one
  let { data: conv } = await admin
    .from('conversations')
    .select('*')
    .eq('channel_id', channel.id)
    .eq('contact_id', contact.id)
    .is('external_id', null)           // DM conversations have no external_id
    .in('status', ['open', 'pending'])
    .maybeSingle()

  if (!conv) {
    const { data: c } = await admin
      .from('conversations')
      .insert({
        workspace_id: channel.workspace_id,
        contact_id: contact.id,
        channel_id: channel.id,
        platform: 'facebook',
        status: 'open',
        last_message: data.text || '[attachment]',
        last_message_at: data.timestamp,
        unread_count: 1,
        meta: { thread_type: 'dm' },
      })
      .select()
      .single()
    conv = c
  } else {
    await admin
      .from('conversations')
      .update({
        last_message: data.text || '[attachment]',
        last_message_at: data.timestamp,
        unread_count: (conv.unread_count || 0) + 1,
        updated_at: data.timestamp,
        meta: { ...(conv.meta ?? {}), thread_type: 'dm' },
      })
      .eq('id', conv.id)
  }
  if (!conv) return

  // Dedup by external_id (Meta can deliver the same event twice)
  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()
  if (exists) return

  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conv.id,
    workspace_id: channel.workspace_id,
    external_id: data.external_id,
    direction: 'inbound',
    content_type: data.attachments ? 'image' : 'text',
    body: data.text,
    status: 'delivered',
    is_note: false,
    meta: { sender_id: data.sender_id, attachments: data.attachments, raw: data },
  })

  if (msgErr) console.error('[FB DM] ❌ Message insert error:', msgErr.message)
  else console.log(`[FB DM] ✅ Message saved successfully → conv ${conv.id}`)
}

async function processFBComment(ev: any) {
  const { pageId, data } = ev
  console.log(`[FB Comment] Processing: comment_id=${data.comment_id}, pageId=${pageId}`)

  const { data: channel } = await admin
    .from('channels')
    .select('*')
    .eq('platform', 'facebook')
    .eq('external_id', pageId)
    .maybeSingle()
  if (!channel) return

  // Find or create contact from the commenter
  let { data: contact } = await admin
    .from('contacts')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .or(`facebook_scoped_id.eq.${data.from?.id},facebook_id.eq.${data.from?.id}`)
    .maybeSingle()

  if (data.from?.id) {
    let name = data.from?.name || 'Facebook User'
    let avatarUrl: string | null = null

    const isGenericName = !contact || contact.name === data.from.id || contact.name === 'Facebook User' || /^\d+$/.test(contact.name.trim())
    const isMissingAvatar = !contact?.avatar_url

    if (!contact || isGenericName || isMissingAvatar) {
      if (channel.access_token) {
        try {
          console.log(`[FB Comment] Fetching Meta profile for commenter=${data.from.id}...`)
          const fb = new FacebookClient(channel.access_token, pageId)
          const profile = await fb.getUserProfile(data.from.id)

          if (profile) {
            name = (profile.name && profile.name !== data.from.id) ? profile.name : (contact?.name || name)
            avatarUrl = profile.profile_pic || contact?.avatar_url || null
          }
        } catch (err: any) {
          console.warn('[FB Comment] Profile fetch failed (non-critical):', err?.message)
        }
      }
    }

    if (!contact) {
      const { data: c } = await admin
        .from('contacts')
        .insert({
          workspace_id: channel.workspace_id,
          facebook_scoped_id: data.from.id,
          facebook_id: data.from.id,
          name: name,
          avatar_url: avatarUrl,
        })
        .select()
        .single()
      contact = c
    } else if (isGenericName || isMissingAvatar) {
      const updates: any = {}
      if (isGenericName && name !== contact.name) updates.name = name
      if (isMissingAvatar && avatarUrl) updates.avatar_url = avatarUrl

      if (Object.keys(updates).length > 0) {
        const { data: updatedContact } = await admin
          .from('contacts')
          .update(updates)
          .eq('id', contact.id)
          .select()
          .single()
        if (updatedContact) contact = updatedContact
        console.log(`[FB Comment] ✅ Backfilled avatar DP / profile for contact ${contact.id}`)
      }
    }
  }

  if (!contact) return

  // Comment threads are grouped by post — one conversation per post
  let { data: conv } = await admin
    .from('conversations')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .eq('platform', 'facebook')
    .eq('external_id', data.post_id)
    .maybeSingle()

  if (!conv) {
    const { data: c } = await admin
      .from('conversations')
      .insert({
        workspace_id: channel.workspace_id,
        contact_id: contact.id,
        channel_id: channel.id,
        platform: 'facebook',
        external_id: data.post_id,
        title: 'Post Comments',
        status: 'open',
        last_message: data.text,
        last_message_at: data.timestamp,
        unread_count: 1,
        meta: { thread_type: 'comment', post_id: data.post_id },
      })
      .select()
      .single()
    conv = c
  } else {
    await admin
      .from('conversations')
      .update({
        last_message: data.text,
        last_message_at: data.timestamp,
        unread_count: (conv.unread_count || 0) + 1,
        updated_at: data.timestamp,
        meta: { ...(conv.meta ?? {}), thread_type: 'comment', post_id: data.post_id },
      })
      .eq('id', conv.id)
  }
  if (!conv) return

  // Dedup by comment_id
  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.comment_id)
    .maybeSingle()
  if (exists) return

  await admin.from('messages').insert({
    conversation_id: conv.id,
    workspace_id: channel.workspace_id,
    external_id: data.comment_id,
    direction: 'inbound',
    content_type: 'comment',
    body: data.text,
    status: 'delivered',
    is_note: false,
    meta: { comment_id: data.comment_id, post_id: data.post_id, from: data.from, raw: data },
  })
}
