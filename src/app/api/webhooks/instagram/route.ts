import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseInstagramWebhook } from '@/lib/platforms/instagram'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  if (
    p.get('hub.mode') === 'subscribe' &&
    p.get('hub.verify_token') === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(p.get('hub.challenge'), { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    handleIGEvents(body).catch(err => console.error('IG webhook error:', err))
    return NextResponse.json({ status: 'ok' })
  } catch {
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

  if (!channel) return

  const contact = await findOrCreate(channel.workspace_id, {
    facebook_id: data.sender_id,
    name: data.sender_id,
  })
  if (!contact) return

  const conv = await getOrMakeConv(channel, contact.id, {
    platform: 'instagram',
    lastMessage: data.text || '[media]',
    lastMessageAt: data.timestamp,
  })
  if (!conv) return

  const { data: exists } = await admin.from('messages').select('id').eq('external_id', data.external_id).maybeSingle()
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

  const contact = await findOrCreate(channel.workspace_id, {
    instagram_username: data.from?.username,
    facebook_id: data.from?.id,
    name: data.from?.name || data.from?.username || 'IG User',
  })
  if (!contact) return

  // Group comments by post
  let { data: conv } = await admin
    .from('conversations')
    .select('*')
    .eq('workspace_id', channel.workspace_id)
    .eq('platform', 'instagram')
    .eq('external_id', data.post_id)
    .maybeSingle()

  if (!conv) {
    const { data: newConv } = await admin
      .from('conversations')
      .insert({
        workspace_id: channel.workspace_id,
        contact_id: contact.id,
        channel_id: channel.id,
        platform: 'instagram',
        external_id: data.post_id,
        title: `Post Comments`,
        status: 'open',
        last_message: data.text,
        last_message_at: data.timestamp,
        unread_count: 1,
      })
      .select().single()
    conv = newConv
  } else {
    await admin.from('conversations').update({
      last_message: data.text,
      last_message_at: data.timestamp,
      unread_count: (conv.unread_count || 0) + 1,
    }).eq('id', conv.id)
  }

  if (!conv) return

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

async function findOrCreate(workspaceId: string, info: any) {
  if (info.facebook_id) {
    const { data: e } = await admin.from('contacts').select('*').eq('workspace_id', workspaceId).eq('facebook_id', info.facebook_id).maybeSingle()
    if (e) return e
  }
  const { data: c } = await admin.from('contacts').insert({ workspace_id: workspaceId, ...info }).select().single()
  return c
}

async function getOrMakeConv(channel: any, contactId: string, info: any) {
  const { data: e } = await admin.from('conversations').select('*').eq('channel_id', channel.id).eq('contact_id', contactId).in('status', ['open', 'pending']).maybeSingle()
  if (e) {
    await admin.from('conversations').update({ last_message: info.lastMessage, last_message_at: info.lastMessageAt, unread_count: (e.unread_count || 0) + 1 }).eq('id', e.id)
    return e
  }
  const { data: c } = await admin.from('conversations').insert({ workspace_id: channel.workspace_id, contact_id: contactId, channel_id: channel.id, platform: info.platform, status: 'open', last_message: info.lastMessage, last_message_at: info.lastMessageAt, unread_count: 1 }).select().single()
  return c
}