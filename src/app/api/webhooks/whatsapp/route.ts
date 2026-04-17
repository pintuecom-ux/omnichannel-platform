import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseWhatsAppWebhook, WhatsAppClient } from '@/lib/platforms/whatsapp'

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
    console.log('✅ WhatsApp webhook verified')
    return new NextResponse(p.get('hub.challenge'), { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Process synchronously BEFORE returning 200 — Vercel kills async work after response
    await handleEvents(body)
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[WA Webhook] Fatal:', err)
    return NextResponse.json({ status: 'error_logged' })
  }
}

async function handleEvents(body: any) {
  const events = parseWhatsAppWebhook(body)
  await Promise.all(events.map(ev =>
    ev.type === 'message'
      ? processMessage(ev).catch(e => console.error('[WA] processMessage error:', e))
      : processStatus(ev).catch(e => console.error('[WA] processStatus error:', e))
  ))
}

async function processMessage(ev: any) {
  const { phoneNumberId, data } = ev

  // 1. Find channel
  const { data: channel } = await admin
    .from('channels')
    .select('id, workspace_id, access_token')
    .eq('platform', 'whatsapp')
    .eq('external_id', phoneNumberId)
    .maybeSingle()

  if (!channel) {
    console.error(`[WA] No channel for phone_number_id: ${phoneNumberId}`)
    return
  }

  // 2. Idempotency — skip if already stored
  const { data: exists } = await admin
    .from('messages')
    .select('id')
    .eq('external_id', data.external_id)
    .maybeSingle()
  if (exists) return

  // 3. Upsert contact
  const phone = data.from.replace(/^\+/, '')
  const { data: contact, error: contactErr } = await admin
    .from('contacts')
    .upsert(
      { workspace_id: channel.workspace_id, phone, name: data.from_name || phone },
      { onConflict: 'workspace_id,phone', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (contactErr || !contact) {
    console.error('[WA] Contact upsert error:', contactErr)
    return
  }

  // 4. Upsert conversation
  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .upsert(
      {
        workspace_id: channel.workspace_id,
        contact_id: contact.id,
        channel_id: channel.id,
        platform: 'whatsapp',
        status: 'open',
        last_message: data.text || `[${data.type}]`,
        last_message_at: data.timestamp,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'channel_id,contact_id', ignoreDuplicates: false }
    )
    .select('id, unread_count')
    .single()

  if (convErr || !conv) {
    console.error('[WA] Conversation upsert error:', convErr)
    return
  }

  // Increment unread count
  await admin
    .from('conversations')
    .update({ unread_count: (conv.unread_count || 0) + 1 })
    .eq('id', conv.id)

  // 5. Resolve media URL if this is a media message
  // Meta sends a media_id — we need to call WA API to get the actual download URL
  let mediaUrl: string | null = null
  let mediaMime: string | null = null

  const mediaObj = data.image ?? data.audio ?? data.video ?? data.document ?? data.sticker ?? null
  if (mediaObj?.id) {
    try {
      const waClient = new WhatsAppClient(channel.access_token, phoneNumberId)
      const { url, mime_type } = await waClient.getMediaUrl(mediaObj.id)

      // Option A (simple, no storage cost): Store the temporary WA URL directly
      // It's valid for 5 minutes but the message is already saved by then, so
      // we store the WA URL and let the browser fetch it when rendering.
      // Option B (permanent): Download → re-upload to Supabase Storage
      // We'll use Option B for persistence:
      const bytes = await waClient.downloadMedia(url)
      const ext = mime_type?.split('/')[1]?.split(';')[0] ?? 'bin'
      const path = `${channel.workspace_id}/${conv.id}/${data.external_id}.${ext}`

      const { error: storageErr } = await admin.storage
        .from('media')
        .upload(path, bytes, { contentType: mime_type, upsert: true })

      if (storageErr) {
        console.warn('[WA] Storage upload failed, using WA URL directly:', storageErr.message)
        mediaUrl = url
      } else {
        const { data: pub } = admin.storage.from('media').getPublicUrl(path)
        mediaUrl = pub.publicUrl
      }
      mediaMime = mime_type
    } catch (e: any) {
      console.warn('[WA] Media fetch error (non-critical):', e.message)
    }
  }

  // 6. Insert message
  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conv.id,
    workspace_id: channel.workspace_id,
    external_id: data.external_id,
    direction: 'inbound',
    content_type: data.type === 'text' ? 'text' : data.type,
    body: data.text ?? (mediaObj?.caption ?? null),
    media_url: mediaUrl,
    media_mime: mediaMime,
    status: 'delivered',
    is_note: false,
    meta: {
      from: phone,
      from_name: data.from_name,
      filename: data.document?.filename ?? null,
    },
  })

  if (msgErr) console.error('[WA] Message insert error:', msgErr)
  else console.log(`[WA] ✅ Saved ${data.type} from ${phone}`)
}

async function processStatus(ev: any) {
  const { data } = ev
  await admin
    .from('messages')
    .update({ status: data.status })
    .eq('external_id', data.external_id)
}
