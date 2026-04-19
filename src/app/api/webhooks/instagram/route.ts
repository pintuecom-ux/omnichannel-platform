import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseInstagramWebhook, verifyIGSignature, InstagramClient } from '@/lib/platforms/instagram'

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

    // FIX: Instagram webhook was missing signature verification entirely
    if (process.env.META_APP_SECRET && !verifyIGSignature(rawBody, signature, process.env.META_APP_SECRET)) {
      return new NextResponse('Invalid signature', { status: 403 })
    }

    const body = JSON.parse(rawBody)

    // Validate this is an instagram object
    if (body.object !== 'instagram') {
      return NextResponse.json({ status: 'ignored' })
    }

    // Process async — return 200 immediately to avoid Meta retry storms
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
  const { igAccountId, data } = ev

  const { data: channel } = await admin
    .from('channels')
    .select('*')
    .eq('platform', 'instagram')
    .eq('external_id', igAccountId)
    .maybeSingle()

  if (!channel) {
    console.warn(`[IG webhook] No channel found for igAccountId=${igAccountId}`)
    return
  }

  // Ignore messages sent by the business account itself
  if (data.sender_id === igAccountId) return

  // Find or create contact — IG users are identified by their IGSID (stored in facebook_id)
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
      const ig = new InstagramClient(channel.access_token, igAccountId)
      const profile = await ig.getUserProfile(data.sender_id)
      if (profile) {
        name = profile.name
        avatarUrl = profile.profile_pic ?? null
      }
    }
    const { data: c } = await admin
      .from('contacts')
      .insert({
        workspace_id: channel.workspace_id,
        facebook_id: data.sender_id,
        name,
        avatar_url: avatarUrl,
      })
      .select()
      .single()
    contact = c
  }
  if (!contact) return

  // Find open DM conversation or create one (DMs have no external_id)
  let { data: conv } = await admin
    .from('conversations')
    .select('*')
    .eq('channel_id', channel.id)
    .eq('contact_id', contact.id)
    .is('external_id', null)
    .in('status', ['open', 'pending'])
    .maybeSingle()

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
      })
      .eq('id', conv.id)
  }
  if (!conv) return

  // Dedup
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
    meta: { sender_id: data.sender_id, attachments: data.attachments },
  })
}

async function processIGComment(ev: any) {
  const { igAccountId, data } = ev

  const { data: channel } = await admin
    .from('channels')
    .select('*')
    .eq('platform', 'instagram')
    .eq('external_id', igAccountId)
    .maybeSingle()
  if (!channel) return

  // Find or create contact from commenter
  let { data: contact } = await admin
    .from('contacts')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .eq('facebook_id', data.from?.id)
    .maybeSingle()

  if (!contact) {
    const { data: c } = await admin
      .from('contacts')
      .insert({
        workspace_id: channel.workspace_id,
        facebook_id: data.from?.id ?? null,
        instagram_username: data.from?.username ?? null,
        name: data.from?.name || data.from?.username || 'IG User',
      })
      .select()
      .single()
    contact = c
  }
  if (!contact) return

  // Comment threads grouped by post (external_id = post/media ID)
  let { data: conv } = await admin
    .from('conversations')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .eq('platform', 'instagram')
    .eq('external_id', data.post_id)
    .maybeSingle()

  if (!conv) {
    const { data: c } = await admin
      .from('conversations')
      .insert({
        workspace_id: channel.workspace_id,
        contact_id: contact.id,
        channel_id: channel.id,
        platform: 'instagram',
        external_id: data.post_id,
        title: data.isMention ? 'Mention' : 'Post Comments',
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

  // Dedup
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
      post_id: data.post_id,
      from: data.from,
      is_mention: data.isMention ?? false,
    },
  })
}