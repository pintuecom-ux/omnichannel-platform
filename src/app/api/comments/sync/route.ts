/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GRAPH_BASE = 'https://graph.facebook.com/v25.0'

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await req.json()
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    console.log(`[Comments Sync] Starting sync for workspace ${workspaceId}`)

    // 1. Fetch active Instagram channels
    const { data: igChannels } = await admin
      .from('channels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'instagram')
      .eq('is_active', true)

    for (const channel of igChannels ?? []) {
      if (!channel.access_token || !channel.external_id) continue
      try {
        // Fetch Instagram posts with comments
        const res = await axios.get(`${GRAPH_BASE}/${channel.external_id}/media`, {
          params: {
            fields: 'id,caption,media_url,thumbnail_url,permalink,media_type,timestamp,like_count,comments_count,comments{id,text,username,timestamp,from,like_count}',
            access_token: channel.access_token,
            limit: 25,
          }
        })

        const posts = res.data?.data ?? []
        for (const post of posts) {
          const captionTitle = post.caption ? (post.caption.slice(0, 35) + (post.caption.length > 35 ? '...' : '')) : `IG Post #${post.id.slice(-6)}`
          
          // Upsert conversation for this post
          const { data: existingConv } = await admin
            .from('conversations')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('platform', 'instagram')
            .eq('external_id', post.id)
            .maybeSingle()

          let convId = existingConv?.id
          const convMeta = {
            thread_type: 'instagram_comment',
            post_id: post.id,
            post_caption: post.caption,
            media_url: post.media_url || post.thumbnail_url,
            permalink: post.permalink,
            like_count: post.like_count || 0,
            comments_count: post.comments_count || 0
          }

          if (!convId) {
            const { data: newConv } = await admin
              .from('conversations')
              .insert({
                workspace_id: workspaceId,
                channel_id: channel.id,
                platform: 'instagram',
                external_id: post.id,
                title: captionTitle,
                status: 'open',
                last_message: post.caption || 'New Instagram Post',
                last_message_at: post.timestamp || new Date().toISOString(),
                unread_count: 0,
                meta: convMeta,
              })
              .select('id')
              .single()
            convId = newConv?.id
          } else {
            await admin
              .from('conversations')
              .update({
                title: captionTitle,
                meta: convMeta,
                updated_at: new Date().toISOString()
              })
              .eq('id', convId)
          }

          if (!convId) continue

          // Upsert comments as messages
          const comments = post.comments?.data ?? []
          for (const c of comments) {
            const commenterName = c.username || c.from?.username || c.from?.name || 'IG User'
            const commentText = c.text || ''
            
            const { data: existingMsg } = await admin
              .from('messages')
              .select('id')
              .eq('external_id', c.id)
              .maybeSingle()

            if (!existingMsg) {
              await admin.from('messages').insert({
                conversation_id: convId,
                workspace_id: workspaceId,
                external_id: c.id,
                direction: 'inbound',
                content_type: 'comment',
                body: commentText,
                status: 'delivered',
                created_at: c.timestamp || new Date().toISOString(),
                meta: {
                  commenter_username: commenterName,
                  from: { id: c.from?.id || c.username, name: commenterName },
                  is_liked: c.like_count > 0,
                  post_id: post.id
                }
              })
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Comments Sync] IG Error channel=${channel.id}:`, err?.response?.data || err.message)
      }
    }

    // 2. Fetch active Facebook channels
    const { data: fbChannels } = await admin
      .from('channels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .eq('is_active', true)

    for (const channel of fbChannels ?? []) {
      if (!channel.access_token || !channel.external_id) continue
      try {
        const res = await axios.get(`${GRAPH_BASE}/${channel.external_id}/published_posts`, {
          params: {
            fields: 'id,message,full_picture,permalink_url,created_time,shares,comments{id,message,created_time,from,like_count},likes.summary(true)',
            access_token: channel.access_token,
            limit: 25,
          }
        })

        const posts = res.data?.data ?? []
        for (const post of posts) {
          const captionTitle = post.message ? (post.message.slice(0, 35) + (post.message.length > 35 ? '...' : '')) : `FB Post #${post.id.slice(-6)}`
          
          const { data: existingConv } = await admin
            .from('conversations')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('platform', 'facebook')
            .eq('external_id', post.id)
            .maybeSingle()

          let convId = existingConv?.id
          const convMeta = {
            thread_type: 'comment',
            post_id: post.id,
            post_caption: post.message,
            media_url: post.full_picture,
            permalink: post.permalink_url,
            like_count: post.likes?.summary?.total_count || 0,
            comments_count: (post.comments?.data ?? []).length
          }

          if (!convId) {
            const { data: newConv } = await admin
              .from('conversations')
              .insert({
                workspace_id: workspaceId,
                channel_id: channel.id,
                platform: 'facebook',
                external_id: post.id,
                title: captionTitle,
                status: 'open',
                last_message: post.message || 'New Facebook Post',
                last_message_at: post.created_time || new Date().toISOString(),
                unread_count: 0,
                meta: convMeta,
              })
              .select('id')
              .single()
            convId = newConv?.id
          } else {
            await admin
              .from('conversations')
              .update({
                title: captionTitle,
                meta: convMeta,
                updated_at: new Date().toISOString()
              })
              .eq('id', convId)
          }

          if (!convId) continue

          const comments = post.comments?.data ?? []
          for (const c of comments) {
            const commenterName = c.from?.name || 'FB User'
            const commentText = c.message || ''

            const { data: existingMsg } = await admin
              .from('messages')
              .select('id')
              .eq('external_id', c.id)
              .maybeSingle()

            if (!existingMsg) {
              await admin.from('messages').insert({
                conversation_id: convId,
                workspace_id: workspaceId,
                external_id: c.id,
                direction: 'inbound',
                content_type: 'comment',
                body: commentText,
                status: 'delivered',
                created_at: c.created_time || new Date().toISOString(),
                meta: {
                  commenter_username: commenterName,
                  from: { id: c.from?.id, name: commenterName },
                  is_liked: c.like_count > 0,
                  post_id: post.id
                }
              })
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Comments Sync] FB Error channel=${channel.id}:`, err?.response?.data || err.message)
      }
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (err: any) {
    console.error('[Comments Sync Global Error]', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Sync failed' }, { status: 500 })
  }
}
