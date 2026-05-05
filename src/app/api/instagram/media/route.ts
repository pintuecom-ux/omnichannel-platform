import { NextRequest, NextResponse } from 'next/server'
import { admin, getAuthenticatedUser, getInstagramChannel, getWorkspaceProfile } from '@/lib/instagram/helpers'
import { syncInstagramMedia } from '@/lib/instagram/service'

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const channel = await getInstagramChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Instagram channel not connected' }, { status: 404 })

  const shouldSync = req.nextUrl.searchParams.get('sync') === 'true'
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 25)

  const media = shouldSync
    ? await syncInstagramMedia({ workspaceId: profile.workspace_id, channel, limit })
    : await admin
        .from('instagram_media')
        .select('*')
        .eq('workspace_id', profile.workspace_id)
        .eq('channel_id', channel.id)
        .order('timestamp', { ascending: false })
        .limit(limit)
        .then(result => result.data ?? [])

  return NextResponse.json({ media })
}

export async function POST() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const channel = await getInstagramChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Instagram channel not connected' }, { status: 404 })

  const media = await syncInstagramMedia({ workspaceId: profile.workspace_id, channel, limit: 50 })
  return NextResponse.json({ media })
}
