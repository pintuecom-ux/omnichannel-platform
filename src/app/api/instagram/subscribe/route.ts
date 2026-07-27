/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { InstagramClient } from '@/lib/platforms/instagram'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await req.json()
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }

    const { data: channels, error } = await admin
      .from('channels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'instagram')

    if (error || !channels || channels.length === 0) {
      return NextResponse.json({ error: 'No Instagram channels found' }, { status: 404 })
    }

    const results = []
    for (const channel of channels) {
      const pageId = channel.meta?.page_id || channel.external_id
      const pageToken = channel.access_token

      if (!pageId || !pageToken) {
        results.push({ channelId: channel.id, name: channel.name, status: 'skipped', reason: 'Missing pageId or pageToken' })
        continue
      }

      try {
        const res = await InstagramClient.subscribeAppToPage(pageId, pageToken)
        results.push({ channelId: channel.id, name: channel.name, pageId, status: 'subscribed', res })
      } catch (err: any) {
        results.push({ channelId: channel.id, name: channel.name, pageId, status: 'error', error: err?.response?.data || err.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    console.error('[IG Subscribe Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
