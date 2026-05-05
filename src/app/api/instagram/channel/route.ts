import { NextResponse } from 'next/server'
import { InstagramClient } from '@/lib/platforms/instagram'
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

export async function POST() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const channel = await getInstagramChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Instagram channel not found' }, { status: 404 })
  if (!channel.access_token) return NextResponse.json({ error: 'Instagram access token missing' }, { status: 400 })

  const managedPages = await InstagramClient.getManagedPages(channel.access_token)
  const linkedPage =
    managedPages.find(page => page.instagram_business_account?.id === channel.external_id) ??
    managedPages.find(page => page.id === channel.meta?.page_id) ??
    null

  if (!linkedPage?.id || !linkedPage.access_token) {
    return NextResponse.json({ error: 'Linked Facebook Page not found for this Instagram channel' }, { status: 404 })
  }

  await InstagramClient.subscribeAppToPage(linkedPage.id, linkedPage.access_token)

  await admin.from('channels').update({
    meta: {
      ...(channel.meta ?? {}),
      webhook_subscribed: true,
      page_id: linkedPage.id,
      legacy_page_name: linkedPage.name ?? channel.meta?.legacy_page_name ?? null,
      webhook_resubscribed_at: new Date().toISOString(),
    },
  }).eq('id', channel.id)

  return NextResponse.json({ ok: true, page_id: linkedPage.id, page_name: linkedPage.name ?? null })
}
