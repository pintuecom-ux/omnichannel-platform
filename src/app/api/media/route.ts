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
  const shouldSync = req.nextUrl.searchParams.get('sync') === 'true'

  // 1. If sync requested, sync Instagram & Facebook Page media to Supabase
  if (shouldSync) {
    // Sync Instagram if connected
    const igChannel = await getInstagramChannel(workspaceId)
    if (igChannel) {
      try {
        await syncInstagramMedia({ workspaceId, channel: igChannel, limit: 50 })
      } catch (err: any) {
        console.warn('[Sync Media] IG sync warning:', err.message)
      }
    }

    // Sync Facebook Page Posts if connected
    const { data: fbChannel } = await admin
      .from('channels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .maybeSingle()

    if (fbChannel?.access_token && fbChannel?.external_id) {
      try {
        const res = await axios.get(`https://graph.facebook.com/v22.0/${fbChannel.external_id}/published_posts`, {
          params: {
            fields: 'id,message,full_picture,permalink_url,created_time,shares,comments.summary(true),likes.summary(true)',
            access_token: fbChannel.access_token,
          },
        })
        for (const post of res.data?.data ?? []) {
          if (post.full_picture) {
            const record = {
              workspace_id: workspaceId,
              channel_id: fbChannel.id,
              instagram_media_id: `fb_${post.id}`,
              caption: post.message ?? 'Facebook Post',
              media_type: 'IMAGE',
              permalink: post.permalink_url ?? null,
              media_url: post.full_picture,
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
      } catch (err: any) {
        console.warn('[Sync Media] FB sync warning:', err.message)
      }
    }
  }

  // 2. Fetch Social Posts media from Supabase
  const { data: socialMedia } = await admin
    .from('instagram_media')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('timestamp', { ascending: false })

  // 3. Fetch Messages media from Supabase
  const { data: messageRows } = await admin
    .from('messages')
    .select('id, body, content_type, media_url, media_mime, direction, created_at, conversation:conversations!inner(platform, contact:contacts(name, avatar_url))')
    .eq('workspace_id', workspaceId)
    .not('media_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  // Standardize social media items
  const formattedSocial = (socialMedia ?? []).map(item => ({
    id: item.id,
    source: 'social_post',
    platform: item.meta?.platform || 'instagram',
    media_type: item.media_type?.toLowerCase() === 'video' ? 'video' : 'image',
    media_url: item.media_url || item.thumbnail_url,
    thumbnail_url: item.thumbnail_url || item.media_url,
    caption: item.caption,
    timestamp: item.timestamp,
    permalink: item.permalink,
    like_count: item.like_count ?? 0,
    comment_count: item.comment_count ?? 0,
    metrics: item.metrics ?? {},
  }))

  // Standardize message media items
  const formattedMessages = (messageRows ?? []).map((msg: any) => {
    const conv = Array.isArray(msg.conversation) ? msg.conversation[0] : msg.conversation
    const contact = Array.isArray(conv?.contact) ? conv.contact[0] : conv?.contact
    const platform = conv?.platform || 'whatsapp'

    return {
      id: msg.id,
      source: 'chat_message',
      platform,
      media_type: msg.content_type || 'image',
      media_url: msg.media_url,
      thumbnail_url: msg.media_url,
      caption: msg.body || `${msg.direction === 'inbound' ? 'Received from' : 'Sent to'} ${contact?.name || 'Contact'}`,
      timestamp: msg.created_at,
      contact_name: contact?.name || 'Contact',
      direction: msg.direction,
    }
  })

  // Combine and sort by timestamp descending
  const allMedia = [...formattedSocial, ...formattedMessages].sort((a, b) => {
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  })

  return NextResponse.json({
    media: allMedia,
    total_count: allMedia.length,
    social_count: formattedSocial.length,
    chat_count: formattedMessages.length,
  })
}
