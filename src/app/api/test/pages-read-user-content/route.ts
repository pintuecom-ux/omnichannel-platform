import { NextRequest, NextResponse } from 'next/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import axios from 'axios'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE = 'https://graph.facebook.com/v22.0'

export async function GET(req: NextRequest) {
  try {
    // 1. Find active Facebook channel
    const { data: channel, error: chErr } = await admin
      .from('channels')
      .select('*')
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!channel || !channel.access_token || !channel.external_id) {
      return NextResponse.json({ error: 'No active Facebook channel found in database' }, { status: 404 })
    }

    const pageId = channel.external_id
    const token = channel.access_token
    const results: Record<string, any> = {}

    // 1. Fetch Page Posts and all User Comments on Page Content
    try {
      const res = await axios.get(`${BASE}/${pageId}/published_posts`, {
        params: {
          fields: 'id,message,created_time,permalink_url,comments{id,message,from,created_time,like_count}',
          access_token: token,
        },
      })
      const posts = res.data?.data ?? []
      const commentsExtracted = posts.flatMap((p: any) => (p.comments?.data ?? []).map((c: any) => ({
        post_id: p.id,
        post_message: p.message ?? 'No caption',
        comment_id: c.id,
        comment_text: c.message,
        comment_author: c.from?.name || c.from?.id || 'Anonymous User',
        created_time: c.created_time,
      })))

      results.page_posts_and_comments = {
        success: true,
        total_posts_found: posts.length,
        total_comments_extracted: commentsExtracted.length,
        posts_with_comments: posts,
        all_user_comments: commentsExtracted,
      }
    } catch (e: any) {
      results.page_posts_and_comments = { success: false, error: e?.response?.data || e.message }
    }

    // 2. Fetch Page Feed & Comments
    try {
      const res = await axios.get(`${BASE}/${pageId}/feed`, {
        params: {
          fields: 'id,message,from,created_time,comments{id,message,from,created_time}',
          access_token: token,
        },
      })
      results.page_feed = {
        success: true,
        count: res.data?.data?.length ?? 0,
        feed_data: res.data,
      }
    } catch (e: any) {
      results.page_feed = { success: false, error: e?.response?.data || e.message }
    }

    // 3. Specific Comments Query on first post if available
    const firstPostId = results.page_posts_and_comments?.posts_with_comments?.[0]?.id
    if (firstPostId) {
      try {
        const res = await axios.get(`${BASE}/${firstPostId}/comments`, {
          params: {
            fields: 'id,message,from,created_time,like_count,is_hidden',
            access_token: token,
          },
        })
        results.direct_post_comments_query = {
          success: true,
          post_id: firstPostId,
          comments: res.data,
        }
      } catch (e: any) {
        results.direct_post_comments_query = { success: false, error: e?.response?.data || e.message }
      }
    }

    return NextResponse.json({
      status: 'Page Content & Comments Fetched Successfully!',
      page_id: pageId,
      page_name: channel.name,
      timestamp: new Date().toISOString(),
      results,
    }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
