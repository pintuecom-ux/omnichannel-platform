import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseFacebookWebhook, verifyFBSignature, FacebookClient } from '@/lib/platforms/facebook'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── GET: Meta webhook verification challenge ────────────────────────────────
// FIX: was using WHATSAPP_WEBHOOK_VERIFY_TOKEN — now uses META_WEBHOOK_VERIFY_TOKEN
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

    // Process async — return 200 immediately to avoid Meta retry storms
    handleFBEvents(body).catch(err => console.error('[FB webhook] error:', err))
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[FB webhook] parse error:', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

async function handleFBEvents(body: any) {
  const events = parseFacebookWebhook(body)
  for (const ev of events) {
    if (ev.type === 'message') await processFBMessage(ev)
    else if (ev.type === 'comment') await processFBComment(ev)
  }
}

async function processFBMessage(ev: any) {
  const { pageId, data } = ev

  // Find the channel matching this Facebook Page ID
  const { data: channel } = await admin
    .from('channels')
    .select('*')
    .eq('platform', 'facebook')
    .eq('external_id', pageId)
    .maybeSingle()

  if (!channel) {
    console.warn(`[FB webhook] No channel found for pageId=${pageId}`)
    return
  }

  // Find or create the contact
  let { data: contact } = await admin
    .from('contacts')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .eq('facebook_id', data.sender_id)
    .maybeSingle()

  if (!contact) {
    // Try to enrich with Meta profile data
    let name = data.sender_id
    let avatarUrl: string | null = null
    if (channel.access_token) {
      const fb = new FacebookClient(channel.access_token, pageId)
      const profile = await fb.getUserProfile(data.sender_id)
      if (profile) {
        name = profile.name
        avatarUrl = profile.profile_pic ?? null
      }
    }
    const { data: c } = await admin
      .from('contacts')
      .insert({ workspace_id: channel.workspace_id, facebook_id: data.sender_id, name, avatar_url: avatarUrl })
      .select()
      .single()
    contact = c
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

  await admin.from('messages').insert({
    conversation_id: conv.id,
    workspace_id: channel.workspace_id,
    external_id: data.external_id,
    direction: 'inbound',
    content_type: data.attachments ? 'image' : 'text',
    body: data.text,
    status: 'delivered',
    is_note: false,
    meta: { sender_id: data.sender_id, attachments: data.attachments },
  })
}

async function processFBComment(ev: any) {
  const { pageId, data } = ev

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
    .eq('facebook_id', data.from?.id)
    .maybeSingle()

  if (!contact && data.from?.id) {
    const { data: c } = await admin
      .from('contacts')
      .insert({
        workspace_id: channel.workspace_id,
        facebook_id: data.from.id,
        name: data.from?.name || 'Facebook User',
      })
      .select()
      .single()
    contact = c
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
    meta: { comment_id: data.comment_id, post_id: data.post_id, from: data.from },
  })
}