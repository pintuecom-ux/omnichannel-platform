import { NextRequest, NextResponse } from 'next/server'
import { admin, getAuthenticatedUser, getWorkspaceProfile, getInstagramChannel } from '@/lib/instagram/helpers'
import { syncInstagramMedia } from '@/lib/instagram/service'
import axios from 'axios'

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const workspaceId = profile.workspace_id

  // 1. Trigger live sync of social posts from Instagram and Facebook Pages
  const igChannel = await getInstagramChannel(workspaceId)
  if (igChannel) {
    try {
      await syncInstagramMedia({ workspaceId, channel: igChannel, limit: 50 })
    } catch (e: any) {
      console.warn('[Planner] IG sync notice:', e.message)
    }
  }

  const { data: fbChannel } = await admin
    .from('channels')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'facebook')
    .eq('is_active', true)
    .maybeSingle()

  if (fbChannel?.access_token && fbChannel?.external_id) {
    try {
      const res = await axios.get(`https://graph.facebook.com/v25.0/${fbChannel.external_id}/published_posts`, {
        params: {
          fields: 'id,message,full_picture,permalink_url,created_time,shares,comments.summary(true),likes.summary(true)',
          access_token: fbChannel.access_token,
        },
      })
      for (const post of res.data?.data ?? []) {
        if (post.full_picture || post.message) {
          const record = {
            workspace_id: workspaceId,
            channel_id: fbChannel.id,
            instagram_media_id: `fb_${post.id}`,
            caption: post.message ?? 'Facebook Post',
            media_type: 'IMAGE',
            permalink: post.permalink_url ?? null,
            media_url: post.full_picture ?? null,
            timestamp: post.created_time ?? new Date().toISOString(),
            comment_count: post.comments?.summary?.total_count ?? 0,
            like_count: post.likes?.summary?.total_count ?? 0,
            meta: { platform: 'facebook', raw: post },
            updated_at: new Date().toISOString(),
          }
          const { data: existing } = await admin
            .from('instagram_media')
            .select('id')
            .eq('instagram_media_id', record.instagram_media_id)
            .maybeSingle()

          if (existing) {
            await admin.from('instagram_media').update(record).eq('id', existing.id)
          } else {
            await admin.from('instagram_media').insert(record)
          }
        }
      }
    } catch (e: any) {
      console.warn('[Planner] FB sync notice:', e.message)
    }
  }

  // 2. Fetch all published social posts from DB
  const { data: publishedMedia } = await admin
    .from('instagram_media')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('timestamp', { ascending: false })

  // 3. Fetch all scheduled/draft publications from DB
  const { data: scheduledMedia } = await admin
    .from('scheduled_publications')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('scheduled_for', { ascending: true })

  // Standardize published posts
  const publishedList = (publishedMedia ?? []).map(p => ({
    id: p.id,
    type: 'published',
    status: 'published',
    caption: p.caption,
    media_url: p.media_url || p.thumbnail_url,
    thumbnail_url: p.thumbnail_url || p.media_url,
    media_type: p.media_type,
    scheduled_for: p.timestamp,
    platform: p.meta?.platform || 'instagram',
    permalink: p.permalink,
    like_count: p.like_count ?? 0,
    comment_count: p.comment_count ?? 0,
  }))

  // Standardize scheduled posts
  const scheduledList = (scheduledMedia ?? []).map(s => {
    const payload = s.media_payload ?? []
    const firstMedia = payload[0]?.public_url ?? null
    return {
      id: s.id,
      type: 'scheduled',
      status: s.status || 'scheduled',
      caption: s.caption,
      media_url: firstMedia,
      thumbnail_url: firstMedia,
      media_type: payload[0]?.media_type || 'image',
      scheduled_for: s.scheduled_for,
      platform: s.platform || 'instagram',
      permalink: null,
      like_count: 0,
      comment_count: 0,
    }
  })

  // Combine and return
  const allPosts = [...publishedList, ...scheduledList]

  return NextResponse.json({
    posts: allPosts,
    total_count: allPosts.length,
    published_count: publishedList.length,
    scheduled_count: scheduledList.length,
  })
}
