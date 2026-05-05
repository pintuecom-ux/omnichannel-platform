/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient as adminClient } from '@supabase/supabase-js'
import { createClient as serverClient } from '@/lib/supabase/server'
import type {
  Channel,
  Contact,
  InstagramAnalyticsSnapshot,
  InstagramChannelMeta,
  InstagramExecutiveMetrics,
  InstagramMediaItem,
  InstagramIdentity,
  ScheduledPublication,
} from '@/types'

export const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getAuthenticatedUser() {
  const supabase = await serverClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return null
  return user
}

export async function getWorkspaceProfile(userId: string) {
  const { data } = await admin
    .from('profiles')
    .select('id, workspace_id, full_name, email, role, avatar_url, is_online, created_at')
    .eq('id', userId)
    .single()
  return data ?? null
}

export async function getInstagramChannel(workspaceId: string) {
  const { data } = await admin
    .from('channels')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'instagram')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return data as Channel & { meta: InstagramChannelMeta }
}

export function getInstagramIdentity(contact: Partial<Contact> | null | undefined): InstagramIdentity | null {
  if (!contact) return null

  const instagramScopedId =
    contact.instagram_scoped_id ??
    (contact.meta as Record<string, any> | undefined)?.instagram_scoped_id ??
    null

  if (!instagramScopedId) return null

  return {
    instagram_scoped_id: instagramScopedId,
    facebook_scoped_id:
      contact.facebook_scoped_id ??
      (contact.meta as Record<string, any> | undefined)?.facebook_scoped_id ??
      contact.facebook_id ??
      null,
    username:
      contact.instagram_username ??
      (contact.meta as Record<string, any> | undefined)?.instagram_username ??
      null,
  }
}

export function getInstagramCommentThreadKey(postId: string | null | undefined, commenterId: string | null | undefined) {
  return postId && commenterId ? `${postId}:${commenterId}` : null
}

export function normalizeScopes(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean)
  return []
}

export function normalizeMediaType(value: string | null | undefined) {
  const upper = (value ?? '').toUpperCase()
  if (upper.includes('VIDEO') || upper === 'REELS') return 'video'
  if (upper.includes('CAROUSEL')) return 'carousel'
  return 'image'
}

export function computeInstagramExecutiveMetrics(input: {
  publications: ScheduledPublication[]
  media: InstagramMediaItem[]
  snapshots: InstagramAnalyticsSnapshot[]
  inboundDmCount: number
  inboundCommentCount: number
  respondedCommentCount: number
  avgReplyMinutes: number | null
}) : InstagramExecutiveMetrics {
  const latestSnapshot = [...input.snapshots]
    .sort((a, b) => new Date(b.snapshot_at).getTime() - new Date(a.snapshot_at).getTime())[0]

  const published = input.publications.filter(item => item.status === 'published').length
  const publishFailures = input.publications.filter(item => item.status === 'failed').length
  const impressions = input.media.reduce((sum, item) => sum + (item.metrics?.impressions ?? 0), 0)
  const reach = input.media.reduce((sum, item) => sum + (item.metrics?.reach ?? 0), 0)
  const likes = input.media.reduce((sum, item) => sum + (item.like_count ?? item.metrics?.likes ?? 0), 0)
  const comments = input.media.reduce((sum, item) => sum + (item.comment_count ?? item.metrics?.comments ?? 0), 0)
  const saves = input.media.reduce((sum, item) => sum + (item.metrics?.saved ?? 0), 0)
  const shares = input.media.reduce((sum, item) => sum + (item.metrics?.shares ?? 0), 0)
  const engagement = likes + comments + saves + shares
  const engagementRate = reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0
  const responseRate = input.inboundCommentCount > 0
    ? Number(((input.respondedCommentCount / input.inboundCommentCount) * 100).toFixed(2))
    : 0

  return {
    published_posts: published,
    publish_failures: publishFailures,
    impressions,
    reach,
    engagement,
    engagement_rate: engagementRate,
    inbound_dms: input.inboundDmCount,
    inbound_comments: input.inboundCommentCount,
    response_rate: responseRate,
    avg_reply_minutes: input.avgReplyMinutes,
    followers_count: latestSnapshot?.account_metrics?.followers_count ?? null,
    follower_growth: latestSnapshot?.account_metrics?.follower_growth ?? null,
  }
}
