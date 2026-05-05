/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { admin, getAuthenticatedUser, getInstagramChannel, getWorkspaceProfile } from '@/lib/instagram/helpers'
import { publishScheduledPublication, uploadPublicationAsset } from '@/lib/instagram/service'

async function loadPublication(workspaceId: string, id: string) {
  const { data } = await admin
    .from('scheduled_publications')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data } = await admin
    .from('scheduled_publications')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .eq('platform', 'instagram')
    .order('created_at', { ascending: false })

  return NextResponse.json({ publications: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const channel = await getInstagramChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Instagram channel not connected' }, { status: 404 })

  const form = await req.formData()
  const caption = String(form.get('caption') ?? '').trim() || null
  const publishAt = String(form.get('publish_at') ?? '').trim() || null
  const action = String(form.get('action') ?? 'draft')
  const publicationId = crypto.randomUUID()
  const files = form.getAll('files').filter((item): item is File => item instanceof File && item.size > 0)

  let mediaPayload: any[] = []
  const payloadJson = form.get('media_payload')
  if (typeof payloadJson === 'string' && payloadJson) {
    try { mediaPayload = JSON.parse(payloadJson) } catch {}
  }
  if (files.length > 0) {
    mediaPayload = []
    for (const file of files) {
      mediaPayload.push(await uploadPublicationAsset({
        workspaceId: profile.workspace_id,
        publicationId,
        file,
      }))
    }
  }

  const status = action === 'publish_now'
    ? 'publishing'
    : action === 'schedule'
      ? 'scheduled'
      : 'draft'

  const insert = {
    id: publicationId,
    workspace_id: profile.workspace_id,
    channel_id: channel.id,
    platform: 'instagram',
    status,
    caption,
    media_payload: mediaPayload,
    publish_at: publishAt,
    timezone: String(form.get('timezone') ?? '') || null,
    idempotency_key: crypto.randomUUID(),
    meta: {
      source: 'planner',
    },
    created_by: user.id,
  }

  const { data, error } = await admin.from('scheduled_publications').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (action === 'publish_now') {
    try {
      const mediaId = await publishScheduledPublication({
        publication: data as any,
        channel,
      })
      const updated = await loadPublication(profile.workspace_id, publicationId)
      return NextResponse.json({ publication: updated, media_id: mediaId })
    } catch (err: any) {
      await admin.from('scheduled_publications').update({
        status: 'failed',
        last_error: err.message ?? 'publish_failed',
        updated_at: new Date().toISOString(),
      }).eq('id', publicationId)
      return NextResponse.json({ error: err.message ?? 'Publish failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ publication: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const channel = await getInstagramChannel(profile.workspace_id)
  if (!channel) return NextResponse.json({ error: 'Instagram channel not connected' }, { status: 404 })

  const body = await req.json()
  const publication = await loadPublication(profile.workspace_id, body.id)
  if (!publication) return NextResponse.json({ error: 'Publication not found' }, { status: 404 })

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }
  if ('caption' in body) updates.caption = body.caption
  if ('publish_at' in body) updates.publish_at = body.publish_at
  if ('status' in body) updates.status = body.status
  if ('media_payload' in body) updates.media_payload = body.media_payload
  if ('meta' in body) updates.meta = { ...(publication.meta ?? {}), ...(body.meta ?? {}) }

  await admin.from('scheduled_publications').update(updates).eq('id', publication.id)

  if (body.action === 'publish_now') {
    const latest = await loadPublication(profile.workspace_id, publication.id)
    try {
      await admin.from('scheduled_publications').update({ status: 'publishing' }).eq('id', publication.id)
      const mediaId = await publishScheduledPublication({
        publication: latest as any,
        channel,
      })
      const updated = await loadPublication(profile.workspace_id, publication.id)
      return NextResponse.json({ publication: updated, media_id: mediaId })
    } catch (err: any) {
      await admin.from('scheduled_publications').update({
        status: 'failed',
        last_error: err.message ?? 'publish_failed',
      }).eq('id', publication.id)
      return NextResponse.json({ error: err.message ?? 'Publish failed' }, { status: 500 })
    }
  }

  const updated = await loadPublication(profile.workspace_id, publication.id)
  return NextResponse.json({ publication: updated })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await admin
    .from('scheduled_publications')
    .delete()
    .eq('workspace_id', profile.workspace_id)
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
