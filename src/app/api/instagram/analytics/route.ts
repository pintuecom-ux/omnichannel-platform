import { NextRequest, NextResponse } from 'next/server'
import { admin, getAuthenticatedUser, getInstagramChannel, getWorkspaceProfile } from '@/lib/instagram/helpers'
import { syncInstagramAnalytics } from '@/lib/instagram/service'

async function loadLatestAnalytics(workspaceId: string, channelId: string) {
  const { data } = await admin
    .from('instagram_analytics_snapshots')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('channel_id', channelId)
    .order('snapshot_at', { ascending: false })
    .limit(10)

  const { data: media } = await admin
    .from('instagram_media')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('channel_id', channelId)
    .order('timestamp', { ascending: false })
    .limit(50)

  return {
    latest: data?.[0] ?? null,
    history: data ?? [],
    media: media ?? [],
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const channel = await getInstagramChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Instagram channel not connected' }, { status: 404 })

  const shouldSync = req.nextUrl.searchParams.get('sync') === 'true'
  if (shouldSync) {
    const analytics = await syncInstagramAnalytics({
      workspaceId: profile.workspace_id,
      channel,
      rangeStart: req.nextUrl.searchParams.get('range_start'),
      rangeEnd: req.nextUrl.searchParams.get('range_end'),
    })
    return NextResponse.json(analytics)
  }

  return NextResponse.json(await loadLatestAnalytics(profile.workspace_id, channel.id))
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const channel = await getInstagramChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Instagram channel not connected' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const analytics = await syncInstagramAnalytics({
    workspaceId: profile.workspace_id,
    channel,
    rangeStart: body.range_start ?? null,
    rangeEnd: body.range_end ?? null,
  })
  return NextResponse.json(analytics)
}
