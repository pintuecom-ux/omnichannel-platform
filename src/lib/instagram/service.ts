/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Channel, InstagramAnalyticsSnapshot, InstagramChannelMeta, InstagramMediaItem, ScheduledPublication } from '@/types'
import { InstagramClient } from '@/lib/platforms/instagram'
import { admin, computeInstagramExecutiveMetrics, normalizeMediaType } from './helpers'

export async function uploadPublicationAsset(params: {
  workspaceId: string
  publicationId: string
  file: File
}) {
  const ext = params.file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'bin'
  const path = `${params.workspaceId}/instagram-publications/${params.publicationId}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await params.file.arrayBuffer())

  const { error } = await admin.storage
    .from('media')
    .upload(path, buffer, { contentType: params.file.type, upsert: true })

  if (error) throw new Error(error.message)

  const { data } = admin.storage.from('media').getPublicUrl(path)
  return {
    storage_path: path,
    public_url: data.publicUrl,
    media_type: params.file.type.startsWith('video/') ? 'video' : 'image',
    mime_type: params.file.type,
    file_name: params.file.name,
  }
}

export async function publishScheduledPublication(params: {
  publication: ScheduledPublication
  channel: Channel & { meta: InstagramChannelMeta }
}) {
  const client = new InstagramClient(params.channel.access_token, params.channel.external_id)
  const payload = params.publication.media_payload ?? []

  if (payload.length === 0) {
    throw new Error('Publication has no media payload')
  }

  const creationIds: string[] = []

  for (const item of payload) {
    const mediaType = item.media_type === 'carousel'
      ? 'IMAGE'
      : item.media_type === 'video'
        ? 'VIDEO'
        : 'IMAGE'

    const container = await client.createMediaContainer({
      ...(item.media_type === 'video'
        ? { video_url: item.public_url ?? undefined }
        : { image_url: item.public_url ?? undefined }),
      media_type: payload.length > 1 ? undefined : mediaType,
      is_carousel_item: payload.length > 1,
      caption: payload.length > 1 ? undefined : (params.publication.caption ?? undefined),
      alt_text: item.alt_text ?? undefined,
    })
    creationIds.push(container.id)
  }

  let creationId = creationIds[0]

  if (creationIds.length > 1) {
    const carousel = await client.createMediaContainer({
      media_type: 'CAROUSEL',
      children: creationIds,
      caption: params.publication.caption ?? undefined,
    })
    creationId = carousel.id
  }

  const published = await client.publishMediaContainer(creationId)
  const mediaId = published.id
  const media = await client.getMedia(mediaId)

  await admin
    .from('scheduled_publications')
    .update({
      status: 'published',
      resulting_media_id: mediaId,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null,
      meta: {
        ...(params.publication.meta ?? {}),
        creation_ids: creationIds,
        publish_response: published,
      },
    })
    .eq('id', params.publication.id)

  await upsertInstagramMedia({
    workspaceId: params.publication.workspace_id,
    channelId: params.publication.channel_id,
    publicationId: params.publication.id,
    media,
  })

  return mediaId
}

export async function upsertInstagramMedia(params: {
  workspaceId: string
  channelId: string
  publicationId?: string | null
  media: Record<string, any>
}) {
  const record = {
    workspace_id: params.workspaceId,
    channel_id: params.channelId,
    publication_id: params.publicationId ?? null,
    instagram_media_id: params.media.id,
    caption: params.media.caption ?? null,
    media_type: normalizeMediaType(params.media.media_type ?? params.media.media_product_type),
    media_product_type: params.media.media_product_type ?? null,
    permalink: params.media.permalink ?? null,
    thumbnail_url: params.media.thumbnail_url ?? null,
    media_url: params.media.media_url ?? null,
    timestamp: params.media.timestamp ?? null,
    comment_count: params.media.comments_count ?? params.media.comment_count ?? 0,
    like_count: params.media.like_count ?? 0,
    metrics: params.media.metrics ?? {},
    meta: { raw: params.media },
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await admin
    .from('instagram_media')
    .select('id')
    .eq('channel_id', params.channelId)
    .eq('instagram_media_id', params.media.id)
    .maybeSingle()

  if (existing?.id) {
    await admin.from('instagram_media').update(record).eq('id', existing.id)
  } else {
    await admin.from('instagram_media').insert(record)
  }
}

export async function syncInstagramMedia(params: {
  workspaceId: string
  channel: Channel & { meta: InstagramChannelMeta }
  limit?: number
}) {
  const client = new InstagramClient(params.channel.access_token, params.channel.external_id)
  const media = await client.listMedia(params.limit ?? 25)

  for (const item of media) {
    const metrics = await safeGetMediaInsights(client, item.id)
    await upsertInstagramMedia({
      workspaceId: params.workspaceId,
      channelId: params.channel.id,
      media: { ...item, metrics },
    })
  }

  const { data } = await admin
    .from('instagram_media')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('channel_id', params.channel.id)
    .order('timestamp', { ascending: false })

  return (data ?? []) as InstagramMediaItem[]
}

async function safeGetMediaInsights(client: InstagramClient, mediaId: string) {
  try {
    const metrics = await client.getMediaInsights(mediaId, ['likes', 'comments', 'saved', 'shares', 'reach', 'impressions'])
    const out: Record<string, number> = {}
    for (const item of metrics.data ?? []) {
      const value = Array.isArray(item.values) ? item.values[0]?.value : item.value
      out[item.name] = Number(value ?? 0)
    }
    return out
  } catch {
    return {}
  }
}

export async function syncInstagramAnalytics(params: {
  workspaceId: string
  channel: Channel & { meta: InstagramChannelMeta }
  rangeStart?: string | null
  rangeEnd?: string | null
}) {
  const client = new InstagramClient(params.channel.access_token, params.channel.external_id)
  const media = await syncInstagramMedia({
    workspaceId: params.workspaceId,
    channel: params.channel,
    limit: 50,
  })

  let accountMetrics: Record<string, any> = {}
  try {
    const profile = await client.getAccountProfile()
    accountMetrics = {
      username: profile.username ?? params.channel.meta?.username ?? null,
      followers_count: profile.followers_count ?? null,
      media_count: profile.media_count ?? null,
      account_type: profile.account_type ?? null,
    }
  } catch {
    accountMetrics = {
      username: params.channel.meta?.username ?? null,
      followers_count: null,
      media_count: media.length,
      account_type: params.channel.meta?.account_type ?? null,
    }
  }

  const inboundDmCount = await countConversationMessages(params.workspaceId, 'instagram', 'dm')
  const inboundCommentCount = await countConversationMessages(params.workspaceId, 'instagram', 'instagram_comment')
  const respondedCommentCount = await countOutboundCommentReplies(params.workspaceId)
  const avgReplyMinutes = await computeAvgCommentReplyMinutes(params.workspaceId)

  const publicationRows = await admin
    .from('scheduled_publications')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('channel_id', params.channel.id)

  const executive = computeInstagramExecutiveMetrics({
    publications: (publicationRows.data ?? []) as ScheduledPublication[],
    media,
    snapshots: [],
    inboundDmCount,
    inboundCommentCount,
    respondedCommentCount,
    avgReplyMinutes,
  })

  const record = {
    workspace_id: params.workspaceId,
    channel_id: params.channel.id,
    snapshot_at: new Date().toISOString(),
    range_start: params.rangeStart ?? null,
    range_end: params.rangeEnd ?? null,
    account_metrics: {
      ...accountMetrics,
      follower_growth: null,
      executive,
    },
    content_metrics: media.map(item => ({
      instagram_media_id: item.instagram_media_id,
      caption: item.caption,
      media_type: item.media_type,
      timestamp: item.timestamp,
      metrics: item.metrics ?? {},
      comment_count: item.comment_count,
      like_count: item.like_count,
      permalink: item.permalink,
    })),
    operational_metrics: {
      inbound_dms: inboundDmCount,
      inbound_comments: inboundCommentCount,
      responded_comments: respondedCommentCount,
      avg_reply_minutes: avgReplyMinutes,
      scheduled_publications: (publicationRows.data ?? []).length,
      published_publications: (publicationRows.data ?? []).filter((item: any) => item.status === 'published').length,
    },
    meta: {
      synced_via: 'api',
    },
  }

  await admin.from('instagram_analytics_snapshots').insert(record)

  const { data: snapshots } = await admin
    .from('instagram_analytics_snapshots')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('channel_id', params.channel.id)
    .order('snapshot_at', { ascending: false })
    .limit(10)

  const normalizedSnapshots = (snapshots ?? []) as InstagramAnalyticsSnapshot[]
  const latest = normalizedSnapshots[0]

  return {
    executive,
    latest,
    history: normalizedSnapshots,
    media,
  }
}

async function countConversationMessages(workspaceId: string, platform: string, threadType: 'dm' | 'instagram_comment') {
  const { data } = await admin
    .from('messages')
    .select('id, conversation:conversations!inner(platform, meta)')
    .eq('workspace_id', workspaceId)
    .eq('direction', 'inbound')
    .eq('conversation.platform', platform)

  return (data ?? []).filter((row: any) => {
    const meta = Array.isArray(row.conversation) ? row.conversation[0]?.meta : row.conversation?.meta
    return (meta?.thread_type ?? 'dm') === threadType
  }).length
}

async function countOutboundCommentReplies(workspaceId: string) {
  const { count } = await admin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('direction', 'outbound')
    .eq('content_type', 'comment')

  return count ?? 0
}

async function computeAvgCommentReplyMinutes(workspaceId: string) {
  const { data } = await admin
    .from('messages')
    .select('created_at, direction, meta, conversation_id')
    .eq('workspace_id', workspaceId)
    .eq('content_type', 'comment')
    .order('created_at', { ascending: true })

  const byConversation = new Map<string, { inbound?: string; outbound?: string }>()
  for (const row of data ?? []) {
    const entry = byConversation.get(row.conversation_id) ?? {}
    if (row.direction === 'inbound' && !entry.inbound) entry.inbound = row.created_at
    if (row.direction === 'outbound' && entry.inbound && !entry.outbound) entry.outbound = row.created_at
    byConversation.set(row.conversation_id, entry)
  }

  const intervals = [...byConversation.values()]
    .filter(item => item.inbound && item.outbound)
    .map(item => {
      const diffMs = new Date(item.outbound!).getTime() - new Date(item.inbound!).getTime()
      return diffMs > 0 ? diffMs / 60000 : 0
    })
    .filter(Boolean)

  if (intervals.length === 0) return null
  return Number((intervals.reduce((sum, value) => sum + value, 0) / intervals.length).toFixed(2))
}
