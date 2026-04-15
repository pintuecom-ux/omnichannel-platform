import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseFacebookWebhook, verifyFBSignature } from '@/lib/platforms/facebook'

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
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256') ?? ''

    if (process.env.META_APP_SECRET && !verifyFBSignature(rawBody, signature, process.env.META_APP_SECRET)) {
      return new NextResponse('Invalid signature', { status: 403 })
    }

    const body = JSON.parse(rawBody)
    handleFBEvents(body).catch(err => console.error('FB webhook error:', err))
    return NextResponse.json({ status: 'ok' })
  } catch {
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

  const { data: channel } = await admin
    .from('channels')
    .select('*')
    .eq('platform', 'facebook')
    .eq('external_id', pageId)
    .maybeSingle()

  if (!channel) return

  let { data: contact } = await admin.from('contacts').select('*').eq('workspace_id', channel.workspace_id).eq('facebook_id', data.sender_id).maybeSingle()
  if (!contact) {
    const { data: c } = await admin.from('contacts').insert({ workspace_id: channel.workspace_id, facebook_id: data.sender_id, name: data.sender_id }).select().single()
    contact = c
  }
  if (!contact) return

  let { data: conv } = await admin.from('conversations').select('*').eq('channel_id', channel.id).eq('contact_id', contact.id).in('status', ['open', 'pending']).maybeSingle()
  if (!conv) {
    const { data: c } = await admin.from('conversations').insert({ workspace_id: channel.workspace_id, contact_id: contact.id, channel_id: channel.id, platform: 'facebook', status: 'open', last_message: data.text || '[attachment]', last_message_at: data.timestamp, unread_count: 1 }).select().single()
    conv = c
  } else {
    await admin.from('conversations').update({ last_message: data.text || '[attachment]', last_message_at: data.timestamp, unread_count: (conv.unread_count || 0) + 1 }).eq('id', conv.id)
  }
  if (!conv) return

  const { data: exists } = await admin.from('messages').select('id').eq('external_id', data.external_id).maybeSingle()
  if (exists) return

  await admin.from('messages').insert({
    conversation_id: conv.id,
    workspace_id: channel.workspace_id,
    external_id: data.external_id,
    direction: 'inbound',
    content_type: 'text',
    body: data.text,
    status: 'delivered',
    is_note: false,
    meta: { sender_id: data.sender_id },
  })
}

async function processFBComment(ev: any) {
  const { pageId, data } = ev

  const { data: channel } = await admin.from('channels').select('*').eq('platform', 'facebook').eq('external_id', pageId).maybeSingle()
  if (!channel) return

  let { data: contact } = await admin.from('contacts').select('*').eq('workspace_id', channel.workspace_id).eq('facebook_id', data.from?.id).maybeSingle()
  if (!contact) {
    const { data: c } = await admin.from('contacts').insert({ workspace_id: channel.workspace_id, facebook_id: data.from?.id, name: data.from?.name || 'Facebook User' }).select().single()
    contact = c
  }
  if (!contact) return

  let { data: conv } = await admin.from('conversations').select('*').eq('workspace_id', channel.workspace_id).eq('platform', 'facebook').eq('external_id', data.post_id).maybeSingle()
  if (!conv) {
    const { data: c } = await admin.from('conversations').insert({ workspace_id: channel.workspace_id, contact_id: contact.id, channel_id: channel.id, platform: 'facebook', external_id: data.post_id, title: 'Post Comments', status: 'open', last_message: data.text, last_message_at: data.timestamp, unread_count: 1 }).select().single()
    conv = c
  } else {
    await admin.from('conversations').update({ last_message: data.text, last_message_at: data.timestamp, unread_count: (conv.unread_count || 0) + 1 }).eq('id', conv.id)
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