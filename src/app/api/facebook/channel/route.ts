import { NextResponse } from 'next/server'
import { FacebookClient } from '@/lib/platforms/facebook'
import { admin, getAuthenticatedUser, getWorkspaceProfile } from '@/lib/instagram/helpers'

async function getFacebookChannel(workspaceId: string) {
  const { data } = await admin
    .from('channels')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'facebook')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const channel = await getFacebookChannel(profile.workspace_id)
  return NextResponse.json({
    channel: channel
      ? {
          id: channel.id,
          name: channel.name,
          external_id: channel.external_id,
          is_active: channel.is_active,
          created_at: channel.created_at,
          meta: channel.meta ?? {},
        }
      : null,
  })
}

export async function DELETE() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const channel = await getFacebookChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Facebook channel not found' }, { status: 404 })

  await admin.from('channels').update({
    is_active: false,
    access_token: '',
    meta: {
      ...(typeof channel.meta === 'object' && channel.meta !== null ? channel.meta : {}),
      disconnected_at: new Date().toISOString(),
    },
  }).eq('id', channel.id)

  return NextResponse.json({ ok: true })
}

export async function POST() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const channel = await getFacebookChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Facebook channel not found' }, { status: 404 })
  if (!channel.access_token) return NextResponse.json({ error: 'Facebook access token missing' }, { status: 400 })

  await FacebookClient.subscribePageWebhook(channel.external_id, channel.access_token)

  await admin.from('channels').update({
    meta: {
      ...(typeof channel.meta === 'object' && channel.meta !== null ? channel.meta : {}),
      webhook_subscribed: true,
      webhook_resubscribed_at: new Date().toISOString(),
    },
  }).eq('id', channel.id)

  return NextResponse.json({ ok: true })
}
