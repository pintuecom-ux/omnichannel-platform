import { NextResponse } from 'next/server'
import { admin, getAuthenticatedUser, getInstagramChannel, getWorkspaceProfile } from '@/lib/instagram/helpers'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const channel = await getInstagramChannel(profile.workspace_id)
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

  const channel = await getInstagramChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Instagram channel not found' }, { status: 404 })

  await admin.from('channels').update({
    is_active: false,
    access_token: '',
    meta: {
      ...(channel.meta ?? {}),
      disconnected_at: new Date().toISOString(),
    },
  }).eq('id', channel.id)

  return NextResponse.json({ ok: true })
}
