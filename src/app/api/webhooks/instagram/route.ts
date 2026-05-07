/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { parseInstagramWebhook, verifyIGSignature, InstagramClient } from '@/lib/platforms/instagram'
import { admin, getInstagramCommentThreadKey } from '@/lib/instagram/helpers'

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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256') ?? ''

    if (process.env.META_APP_SECRET && !verifyIGSignature(rawBody, signature, process.env.META_APP_SECRET)) {
      console.error('[IG webhook] ❌ Invalid signature')
      return new NextResponse('Invalid signature', { status: 403 })
    }

    const body = JSON.parse(rawBody)

    // Accept both 'instagram' (Business Login for Instagram — instagram_business_* scopes)
    // and 'page' (Page subscription — DMs routed via Messenger Platform, page comments)
    if (body.object !== 'instagram' && body.object !== 'page') {
      console.log(`[IG webhook] Ignoring object: ${body.object}`)
      return NextResponse.json({ status: 'ignored' })
    }

    console.log(`[IG webhook] ✅ Received object: ${body.object}, entries: ${body.entry?.length ?? 0}`)

    // CRITICAL: Must AWAIT — on Vercel serverless, fire-and-forget means the
    // function context is killed after the response is sent, so DB writes
    // never complete. The WhatsApp webhook correctly uses `await`.
    await handleIGEvents(body)

    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('[IG webhook] ❌ Fatal error:', err?.message ?? err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

async function handleIGEvents(body: any) {
  const events = parseInstagramWebhook(body)
  console.log(`[IG webhook] Parsed ${events.length} events: ${events.map(e => e.type).join(', ')}`)

  for (const ev of events) {
    try {
      if (ev.type === 'dm') {
        await processIGDM(ev)
      } else if (ev.type === 'comment') {
        await processIGComment(ev)
      }
    } catch (err: any) {
      console.error(`[IG webhook] ❌ Error processing ${ev.type}:`, err?.message ?? err)
    }
  }
}

async function processIGDM(ev: any) {
  const { igAccountId, data, isPageObject } = ev
  console.log(`[IG DM] Processing: sender=${data.sender_id}, igAccountId=${igAccountId}, isPageObject=${isPageObject}`)

  // Look up the channel either by external_id (IG account ID) or meta->page_id
  let channel: any = null
  if (isPageObject) {
    const { data: ch, error } = await admin
      .from('channels')
      .select('*')
      .eq('platform', 'instagram')
      .contains('meta', { page_id: igAccountId })
      .maybeSingle()
    if (error) console.error('[IG DM] Channel lookup (page_id) error:', error.message)
    channel = ch
  } else {
    const { data: ch, error } = await admin
      .from('channels')
      .select('*')
      .eq('platform', 'instagram')
      .eq('external_id', igAccountId)
      .maybeSingle()
    if (error) console.error('[IG DM] Channel lookup (external_id) error:', error.message)
    channel = ch
  }

  if (!channel) {
    console.warn(`[IG DM] ❌ No channel found for ${isPageObject ? 'page_id' : 'ig_account_id'}=${igAccountId}`)
    return
  }
  console.log(`[IG DM] ✅ Found channel: ${channel.id} (external_id: ${channel.external_id})`)

  // Ignore echo messages (messages sent by the business itself)
  if (data.sender_id === igAccountId || data.sender_id === channel.external_id) {
    console.log('[IG DM] Skipping echo message (sent by business)')
    return
  }

  let { data: contact, error: contactErr } = await admin
    .from('contacts')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .or(`instagram_scoped_id.eq.${data.sender_id},facebook_id.eq.${data.sender_id}`)
    .maybeSingle()

  if (contactErr) console.error('[IG DM] Contact lookup error:', contactErr.message)

  if (!contact) {
    let name = data.sender_id
    let avatarUrl: string | null = null
    let username: string | null = null
    if (channel.access_token) {
      try {
        const ig = new InstagramClient(channel.access_token, channel.external_id)
        const profile = await ig.getUserProfile(data.sender_id)
        if (profile) {
          name = profile.name || profile.username || name
          avatarUrl = profile.profile_pic ?? null
          username = profile.username ?? null
        }
      } catch (err: any) {
        console.warn('[IG DM] Profile fetch failed (non-critical):', err?.message)
      }
    }
    const { data: c, error: insertErr } = await admin
      .from('contacts')
      .insert({
        workspace_id: channel.workspace_id,
        instagram_scoped_id: data.sender_id,
        instagram_username: username,
        name,
        avatar_url: avatarUrl,
        meta: { identity_source: 'instagram_dm' },
      })
      .select()
      .single()
    if (insertErr) console.error('[IG DM] ❌ Contact insert error:', insertErr.message)
    contact = c
  }
  if (!contact) { console.error('[IG DM] ❌ No contact — aborting'); return }
  console.log(`[IG DM] Contact: ${contact.id} (${contact.name})`)

  let { data: conv } = await admin
    .from('conversations')
    .select('*')
    .eq('channel_id', channel.id)
    .eq('contact_id', contact.id)
    .is('external_id', null)
    .in('status', ['open', 'pending'])
    .maybeSingle()

  const conversationMeta = { ...(conv?.meta ?? {}), thread_type: 'dm' }

  if (!conv) {
    const { data: c, error: convErr } = await admin
      .from('conversations')
      .insert({
        workspace_id: channel.workspace_id,
        contact_id: contact.id,
        channel_id: channel.id,
        platform: 'instagram',
        status: 'open',
        last_message: data.text || '[media]',
        last_message_at: data.timestamp,
        unread_count: 1,
        meta: conversationMeta,
      })
      .select()
      .single()
    if (convErr) console.error('[IG DM] ❌ Conversation insert error:', convErr.message)
    conv = c
  } else {
    await admin
      .from('conversations')
      .update({
        last_message: data.text || '[media]',
        last_message_at: data.timestamp,
        unread_count: (conv.unread_count || 0) + 1,
        updated_at: data.timestamp,
        meta: conversationMeta,
      })
      .eq('id', conv.id)
  }
  if (!conv) { console.error('[IG DM] ❌ No conversation — aborting'); return }

  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()
  if (exists) { console.log(`[IG DM] Duplicate message ${data.external_id} — skipping`); return }

  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conv.id,
    workspace_id: channel.workspace_id,
    external_id: data.external_id,
    direction: 'inbound',
    content_type: data.text ? 'text' : 'image',
    body: data.text,
    status: 'delivered',
    is_note: false,
    meta: {
      sender_id: data.sender_id,
      attachments: data.attachments,
      identity: {
        instagram_scoped_id: data.sender_id,
        username: contact.instagram_username ?? null,
      },
      raw: data,
    },
  })
  if (msgErr) console.error('[IG DM] ❌ Message insert error:', msgErr.message)
  else console.log(`[IG DM] ✅ DM saved → conv ${conv.id}`)
}

async function processIGComment(ev: any) {
  const { igAccountId, data, isPageObject } = ev
  console.log(`[IG Comment] Processing: igAccountId=${igAccountId}, isPageObject=${isPageObject}, comment_id=${data.comment_id}`)
  console.log(`[IG Comment] Data: from=${JSON.stringify(data.from)}, post_id=${data.post_id}, text=${data.text?.substring(0, 80)}`)

  // Look up channel
  let channel: any = null
  if (isPageObject) {
    const { data: ch, error } = await admin
      .from('channels')
      .select('*')
      .eq('platform', 'instagram')
      .contains('meta', { page_id: igAccountId })
      .maybeSingle()
    if (error) console.error('[IG Comment] Channel lookup (page_id) error:', error.message)
    channel = ch
  } else {
    const { data: ch, error } = await admin
      .from('channels')
      .select('*')
      .eq('platform', 'instagram')
      .eq('external_id', igAccountId)
      .maybeSingle()
    if (error) console.error('[IG Comment] Channel lookup (external_id) error:', error.message)
    channel = ch
  }

  if (!channel) {
    console.warn(`[IG Comment] ❌ No channel for ${isPageObject ? 'page_id' : 'ig_account_id'}=${igAccountId}`)
    return
  }
  console.log(`[IG Comment] ✅ Found channel: ${channel.id}`)

  const commenterId = data.from?.id ?? null
  const threadKey = getInstagramCommentThreadKey(data.post_id, commenterId)
  if (!commenterId || !threadKey) {
    console.warn(`[IG Comment] ❌ Missing commenterId (${commenterId}) or threadKey (${threadKey}) — aborting`)
    return
  }

  let { data: contact, error: contactErr } = await admin
    .from('contacts')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .or(`instagram_scoped_id.eq.${commenterId},facebook_id.eq.${commenterId}`)
    .maybeSingle()

  if (contactErr) console.error('[IG Comment] Contact lookup error:', contactErr.message)

  if (!contact) {
    const { data: c, error: insertErr } = await admin
      .from('contacts')
      .insert({
        workspace_id: channel.workspace_id,
        instagram_scoped_id: commenterId,
        instagram_username: data.from?.username ?? null,
        name: data.from?.name || data.from?.username || 'IG User',
        meta: { identity_source: 'instagram_comment' },
      })
      .select()
      .single()
    if (insertErr) console.error('[IG Comment] ❌ Contact insert error:', insertErr.message)
    contact = c
  }
  if (!contact) { console.error('[IG Comment] ❌ No contact — aborting'); return }
  console.log(`[IG Comment] Contact: ${contact.id} (${contact.name})`)

  let { data: conv } = await admin
    .from('conversations')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .eq('platform', 'instagram')
    .eq('channel_id', channel.id)
    .eq('external_id', threadKey)
    .maybeSingle()

  const conversationMeta = {
    ...(conv?.meta ?? {}),
    thread_type: 'instagram_comment',
    post_id: data.post_id ?? null,
    commenter_id: commenterId,
    commenter_username: data.from?.username ?? null,
    media_id: data.media_id ?? data.post_id ?? null,
  }

  if (!conv) {
    const { data: c, error: convErr } = await admin
      .from('conversations')
      .insert({
        workspace_id: channel.workspace_id,
        contact_id: contact.id,
        channel_id: channel.id,
        platform: 'instagram',
        external_id: threadKey,
        title: data.isMention ? `@${data.from?.username || 'mention'}` : `Comments: @${data.from?.username || 'user'}`,
        status: 'open',
        last_message: data.text,
        last_message_at: data.timestamp,
        unread_count: 1,
        meta: conversationMeta,
      })
      .select()
      .single()
    if (convErr) console.error('[IG Comment] ❌ Conversation insert error:', convErr.message)
    else console.log(`[IG Comment] ✅ Created new conversation: ${c?.id}`)
    conv = c
  } else {
    await admin
      .from('conversations')
      .update({
        contact_id: contact.id,
        last_message: data.text,
        last_message_at: data.timestamp,
        unread_count: (conv.unread_count || 0) + 1,
        updated_at: data.timestamp,
        meta: conversationMeta,
      })
      .eq('id', conv.id)
    console.log(`[IG Comment] ✅ Updated existing conversation: ${conv.id}`)
  }
  if (!conv) { console.error('[IG Comment] ❌ No conversation — aborting'); return }

  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.comment_id)
    .maybeSingle()
  if (exists) { console.log(`[IG Comment] Duplicate ${data.comment_id} — skipping`); return }

  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conv.id,
    workspace_id: channel.workspace_id,
    external_id: data.comment_id,
    direction: 'inbound',
    content_type: 'comment',
    body: data.text,
    status: 'delivered',
    is_note: false,
    meta: {
      comment_id: data.comment_id,
      parent_comment_id: data.parent_comment_id ?? null,
      post_id: data.post_id,
      media_id: data.media_id ?? data.post_id ?? null,
      from: data.from,
      mentioned: data.isMention ?? false,
      hidden: data.hidden ?? false,
      raw: data,
    },
  })
  if (msgErr) console.error('[IG Comment] ❌ Message insert error:', msgErr.message)
  else console.log(`[IG Comment] ✅ Comment saved → conv ${conv.id}`)
}



