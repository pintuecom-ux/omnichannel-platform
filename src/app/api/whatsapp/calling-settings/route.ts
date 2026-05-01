/**
 * src/app/api/whatsapp/calling-settings/route.ts
 *
 * Manage WhatsApp Calling feature settings for a channel.
 *
 *  - GET  ?channel_id=  → get current calling settings
 *  - POST { channel_id, status, call_icon_visibility } → update settings
 *
 * Used from Settings → Channels page to toggle calling on/off.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient } from '@/lib/platforms/whatsapp'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── GET — fetch calling settings for a channel ────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const channelId = req.nextUrl.searchParams.get('channel_id')
  if (!channelId) {
    return NextResponse.json({ error: 'channel_id required' }, { status: 400 })
  }

  const { data: channel, error } = await admin
    .from('channels')
    .select('id, access_token, external_id, platform, workspace_id')
    .eq('id', channelId)
    .maybeSingle()

  if (error || !channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  if (channel.platform !== 'whatsapp') {
    return NextResponse.json({ error: 'Not a WhatsApp channel' }, { status: 400 })
  }

  const wa = new WhatsAppClient(channel.access_token, channel.external_id)

  try {
    const settings = await wa.getCallingSettings()
    return NextResponse.json({ ok: true, settings })
  } catch (err: any) {
    console.error('[CallingSettings GET] error:', err.message)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

// ── POST — update calling settings for a channel ──────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { channel_id, status, call_icon_visibility } = body

  if (!channel_id || !status) {
    return NextResponse.json({ error: 'channel_id and status required' }, { status: 400 })
  }

  if (!['enabled', 'disabled'].includes(status)) {
    return NextResponse.json({ error: 'status must be "enabled" or "disabled"' }, { status: 400 })
  }

  const { data: channel, error } = await admin
    .from('channels')
    .select('id, access_token, external_id, platform, workspace_id')
    .eq('id', channel_id)
    .maybeSingle()

  if (error || !channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  if (channel.platform !== 'whatsapp') {
    return NextResponse.json({ error: 'Not a WhatsApp channel' }, { status: 400 })
  }

  const wa = new WhatsAppClient(channel.access_token, channel.external_id)

  try {
    await wa.updateCallingSettings({
      status,
      call_icon_visibility: call_icon_visibility ?? 'visible',
    })

    // Cache the calling status on the channel.meta for quick reads
    await admin.from('channels')
      .update({
        meta: admin.rpc
          ? undefined // will be handled below
          : undefined,
      })
      .eq('id', channel_id)

    // Update channel meta with calling status
    const { data: existing } = await admin.from('channels').select('meta').eq('id', channel_id).maybeSingle()
    await admin.from('channels').update({
      meta: { ...(existing?.meta ?? {}), calling_enabled: status === 'enabled' },
    }).eq('id', channel_id)

    return NextResponse.json({ ok: true, status, call_icon_visibility: call_icon_visibility ?? 'visible' })
  } catch (err: any) {
    console.error('[CallingSettings POST] error:', err.message)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
