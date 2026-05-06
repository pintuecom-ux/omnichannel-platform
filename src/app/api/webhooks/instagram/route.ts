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
      return new NextResponse('Invalid signature', { status: 403 })
    }

    const body = JSON.parse(rawBody)

    // Accept both 'instagram' (Business Login for Instagram — instagram_business_* scopes)
    // and 'page' (Page subscription — DMs routed via Messenger Platform, page comments)
    if (body.object !== 'instagram' && body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' })
    }

    handleIGEvents(body).catch(err => console.error('[IG webhook] error:', err))
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[IG webhook] parse error:', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

async function handleIGEvents(body: any) {
  const events = parseInstagramWebhook(body)
  for (const ev of events) {
    if (ev.type === 'dm') await processIGDM(ev)
    else if (ev.type === 'comment') await processIGComment(ev)
  }
}

async function processIGDM(ev: any) {
  const { igAccountId, data, isPageObject } = ev

  // If the event came from object:'page', igAccountId is the PAGE ID.
  // Look up the channel either by external_id (IG account ID) or meta->page_id.
  let channelQuery = admin
    .from('channels')
    .select('*')
    .eq('platform', 'instagram')

  const { data: channel } = isPageObject
    ? await channelQuery.contains('meta', { page_id: igAccountId }).maybeSingle()
    : await channelQuery.eq('external_id', igAccountId).maybeSingle()

  if (!channel) {
    console.warn(`[IG webhook] No channel found for ${isPageObject ? 'page_id' : 'ig_account_id'}=${igAccountId}`)
    return
  }

  // Ignore echo messages (messages sent by the business itself)
  if (data.sender_id === igAccountId || data.sender_id === channel.external_id) return

  let { data: contact } = await admin
    .from('contacts')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .or(`instagram_scoped_id.eq.${data.sender_id},facebook_id.eq.${data.sender_id}`)
    .maybeSingle()

  if (!contact) {
    let name = data.sender_id
    let avatarUrl: string | null = null
    let username: string | null = null
    if (channel.access_token) {
      const ig = new InstagramClient(channel.access_token, igAccountId)
      const profile = await ig.getUserProfile(data.sender_id)
      if (profile) {
        name = profile.name || profile.username || name
        avatarUrl = profile.profile_pic ?? null
        username = profile.username ?? null
      }
    }
    const { data: c } = await admin
      .from('contacts')
      .insert({
        workspace_id: channel.workspace_id,
        instagram_scoped_id: data.sender_id,
        instagram_username: username,
        name,
        avatar_url: avatarUrl,
        meta: {
          identity_source: 'instagram_dm',
        },
      })
      .select()
      .single()
    contact = c
  }
  if (!contact) return

  let { data: conv } = await admin
    .from('conversations')
    .select('*')
    .eq('channel_id', channel.id)
    .eq('contact_id', contact.id)
    .is('external_id', null)
    .in('status', ['open', 'pending'])
    .maybeSingle()

  const conversationMeta = {
    ...(conv?.meta ?? {}),
    thread_type: 'dm',
  }

  if (!conv) {
    const { data: c } = await admin
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
  if (!conv) return

  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()
  if (exists) return

  await admin.from('messages').insert({
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
}

async function processIGComment(ev: any) {
  const { igAccountId, data, isPageObject } = ev

  let channelQuery = admin
    .from('channels')
    .select('*')
    .eq('platform', 'instagram')

  const { data: channel } = isPageObject
    ? await channelQuery.contains('meta', { page_id: igAccountId }).maybeSingle()
    : await channelQuery.eq('external_id', igAccountId).maybeSingle()

  if (!channel) return

  const commenterId = data.from?.id ?? null
  const threadKey = getInstagramCommentThreadKey(data.post_id, commenterId)
  if (!commenterId || !threadKey) return

  let { data: contact } = await admin
    .from('contacts')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .or(`instagram_scoped_id.eq.${commenterId},facebook_id.eq.${commenterId}`)
    .maybeSingle()

  if (!contact) {
    const { data: c } = await admin
      .from('contacts')
      .insert({
        workspace_id: channel.workspace_id,
        instagram_scoped_id: commenterId,
        instagram_username: data.from?.username ?? null,
        name: data.from?.name || data.from?.username || 'IG User',
        meta: {
          identity_source: 'instagram_comment',
        },
      })
      .select()
      .single()
    contact = c
  }
  if (!contact) return

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
    const { data: c } = await admin
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
  }
  if (!conv) return

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
}
