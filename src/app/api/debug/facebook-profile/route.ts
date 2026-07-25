import { NextRequest, NextResponse } from 'next/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import axios from 'axios'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE = 'https://graph.facebook.com/v25.0'

export async function GET(req: NextRequest) {
  const psidParam = req.nextUrl.searchParams.get('psid')

  try {
    // 1. Get Facebook Channel
    const { data: channel, error: chErr } = await admin
      .from('channels')
      .select('*')
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!channel || !channel.access_token) {
      return NextResponse.json({ error: 'No active Facebook channel or access token found', details: chErr }, { status: 404 })
    }

    // 2. Get target PSID
    let targetPsid = psidParam
    let contactRecord: any = null

    if (!targetPsid) {
      const { data: contact } = await admin
        .from('contacts')
        .select('*')
        .not('facebook_scoped_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (contact) {
        targetPsid = contact.facebook_scoped_id || contact.facebook_id
        contactRecord = contact
      }
    } else {
      const { data: contact } = await admin
        .from('contacts')
        .select('*')
        .or(`facebook_scoped_id.eq.${targetPsid},facebook_id.eq.${targetPsid}`)
        .maybeSingle()
      contactRecord = contact
    }

    if (!targetPsid) {
      return NextResponse.json({ error: 'No PSID provided and no Facebook contact found in database.' }, { status: 400 })
    }

    const debugResults: Record<string, any> = {
      timestamp: new Date().toISOString(),
      channel: {
        id: channel.id,
        page_name: channel.name,
        page_id: channel.external_id,
        token_prefix: channel.access_token ? channel.access_token.substring(0, 15) + '...' : null,
      },
      target_psid: targetPsid,
      existing_contact_in_db: contactRecord,
      meta_api_tests: {},
    }

    // Test 1: Query token debug info
    const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET
    if (appId && appSecret) {
      try {
        const tokenDebug = await axios.get(`${BASE}/debug_token`, {
          params: {
            input_token: channel.access_token,
            access_token: `${appId}|${appSecret}`,
          },
        })
        debugResults.meta_api_tests.token_debug = tokenDebug.data
      } catch (err: any) {
        debugResults.meta_api_tests.token_debug = {
          error: err?.response?.data || err.message,
        }
      }
    }

    // Test 2: Query PSID with all combined fields
    try {
      const res = await axios.get(`${BASE}/${targetPsid}`, {
        params: {
          fields: 'first_name,last_name,name,profile_pic,picture',
          access_token: channel.access_token,
        },
      })
      debugResults.meta_api_tests.psid_combined_fields = { success: true, data: res.data }
    } catch (err: any) {
      debugResults.meta_api_tests.psid_combined_fields = { success: false, error: err?.response?.data || err.message }
    }

    // Test 3: Query PSID with standard Messenger fields
    try {
      const res = await axios.get(`${BASE}/${targetPsid}`, {
        params: {
          fields: 'first_name,last_name,profile_pic',
          access_token: channel.access_token,
        },
      })
      debugResults.meta_api_tests.psid_standard_fields = { success: true, data: res.data }
    } catch (err: any) {
      debugResults.meta_api_tests.psid_standard_fields = { success: false, error: err?.response?.data || err.message }
    }

    // Test 4: Query PSID picture endpoint (redirect=false)
    try {
      const res = await axios.get(`${BASE}/${targetPsid}/picture`, {
        params: {
          redirect: false,
          type: 'large',
          access_token: channel.access_token,
        },
      })
      debugResults.meta_api_tests.psid_picture_endpoint = { success: true, data: res.data }
    } catch (err: any) {
      debugResults.meta_api_tests.psid_picture_endpoint = { success: false, error: err?.response?.data || err.message }
    }

    // Test 5: Query /me to verify Page details
    try {
      const res = await axios.get(`${BASE}/me`, {
        params: {
          fields: 'id,name,category',
          access_token: channel.access_token,
        },
      })
      debugResults.meta_api_tests.page_me = { success: true, data: res.data }
    } catch (err: any) {
      debugResults.meta_api_tests.page_me = { success: false, error: err?.response?.data || err.message }
    }

    // Auto-update contact in DB if profile data was obtained
    const std = debugResults.meta_api_tests.psid_standard_fields?.data || debugResults.meta_api_tests.psid_combined_fields?.data
    const picData = debugResults.meta_api_tests.psid_picture_endpoint?.data?.data?.url

    const extractedName = std?.name || [std?.first_name, std?.last_name].filter(Boolean).join(' ') || null
    const extractedPic = std?.profile_pic || picData || null

    if ((extractedName || extractedPic) && contactRecord?.id) {
      const updates: any = {}
      if (extractedName) updates.name = extractedName
      if (extractedPic) updates.avatar_url = extractedPic

      const { data: updated } = await admin
        .from('contacts')
        .update(updates)
        .eq('id', contactRecord.id)
        .select()
        .single()

      debugResults.contact_db_update_result = { updated: true, contact: updated }
    } else {
      debugResults.contact_db_update_result = { updated: false, reason: 'No extracted name or picture' }
    }

    return NextResponse.json(debugResults, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
