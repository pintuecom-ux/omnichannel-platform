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

    // Call 1: Page Feed / User Posts (pages_read_user_content)
    try {
      const res = await axios.get(`${BASE}/${pageId}/feed`, {
        params: { fields: 'id,message,from,created_time,comments', access_token: token },
      })
      results.page_feed = { success: true, count: res.data?.data?.length ?? 0 }
    } catch (e: any) {
      results.page_feed = { success: false, error: e?.response?.data || e.message }
    }

    // Call 2: Tagged Posts / User Content (pages_read_user_content)
    try {
      const res = await axios.get(`${BASE}/${pageId}/tagged`, {
        params: { fields: 'id,message,from', access_token: token },
      })
      results.page_tagged = { success: true, data: res.data }
    } catch (e: any) {
      results.page_tagged = { success: false, error: e?.response?.data || e.message }
    }

    // Call 3: Visitor Posts / User Content (pages_read_user_content)
    try {
      const res = await axios.get(`${BASE}/${pageId}/visitor_posts`, {
        params: { fields: 'id,message,from', access_token: token },
      })
      results.visitor_posts = { success: true, data: res.data }
    } catch (e: any) {
      results.visitor_posts = { success: false, error: e?.response?.data || e.message }
    }

    // Call 4: Page Ratings / Reviews (pages_read_user_content)
    try {
      const res = await axios.get(`${BASE}/${pageId}/ratings`, {
        params: { fields: 'open_graph_story,reviewer,review_text', access_token: token },
      })
      results.page_ratings = { success: true, data: res.data }
    } catch (e: any) {
      results.page_ratings = { success: false, error: e?.response?.data || e.message }
    }

    // Call 5: User Profile Access test
    const { data: contact } = await admin
      .from('contacts')
      .select('facebook_scoped_id, facebook_id')
      .not('facebook_scoped_id', 'is', null)
      .limit(1)
      .maybeSingle()

    const psid = contact?.facebook_scoped_id || contact?.facebook_id || '27752548701102295'
    try {
      const res = await axios.get(`${BASE}/${psid}`, {
        params: { fields: 'first_name,last_name,profile_pic', access_token: token },
      })
      results.user_profile_access = { success: true, data: res.data }
    } catch (e: any) {
      results.user_profile_access = { success: false, error: e?.response?.data || e.message }
    }

    return NextResponse.json({
      status: 'Test API Calls Executed Successfully!',
      meta_requirement_note: 'Refresh your Meta Developer Dashboard page in 1-2 minutes. The test call counters for pages_read_user_content & Business Asset User Profile Access will turn Green (Completed).',
      page_id: pageId,
      results,
    }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
