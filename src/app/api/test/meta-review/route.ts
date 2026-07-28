import { NextRequest, NextResponse } from 'next/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import axios from 'axios'
import { InstagramClient } from '@/lib/platforms/instagram'
import { FacebookClient } from '@/lib/platforms/facebook'
import { WhatsAppClient } from '@/lib/platforms/whatsapp'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE = 'https://graph.facebook.com/v25.0'

/**
 * Meta App Review Automated Verification Suite
 * Exercises required endpoints for:
 * - pages_messaging (Messenger chat execution)
 * - pages_show_list (Page management enumeration)
 * - instagram_basic (Profile metadata and media catalog reading)
 * - instagram_manage_comments (Comment synchronization and interaction)
 * - whatsapp_business_management (Template and asset verification)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const testRecipient = url.searchParams.get('recipient_id') // Optional PSID/IGSID for real send testing
  const mode = url.searchParams.get('mode') || 'all' // 'facebook' | 'instagram' | 'whatsapp' | 'all'

  const auditReport: Record<string, any> = {
    timestamp: new Date().toISOString(),
    suite_version: 'Graph API v25.0 App Review Suite',
    results: {},
  }

  try {
    // ── 1. Facebook & Messenger Verification (pages_messaging & pages_show_list) ──
    if (mode === 'all' || mode === 'facebook') {
      const { data: fbChannel } = await admin
        .from('channels')
        .select('*')
        .eq('platform', 'facebook')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fbChannel && fbChannel.access_token && fbChannel.external_id) {
        const fbClient = new FacebookClient(fbChannel.access_token, fbChannel.external_id)
        const fbReport: Record<string, any> = { channel_id: fbChannel.id, page_id: fbChannel.external_id }

        // Test A: Get Manageable Pages List (pages_show_list / me/accounts)
        try {
          const res = await axios.get(`${BASE}/me/accounts`, {
            params: { fields: 'id,name,category,access_token,tasks', access_token: fbChannel.access_token },
          })
          fbReport.pages_show_list = { success: true, count: res.data?.data?.length ?? 0, pages: res.data?.data ?? [] }
        } catch (e: any) {
          fbReport.pages_show_list = { success: false, error: e?.response?.data?.error?.message || e.message }
        }

        // Test B: Messenger Messaging Sandbox (pages_messaging)
        if (testRecipient) {
          try {
            await fbClient.markSeen(testRecipient)
            const sent = await fbClient.sendMessage(testRecipient, '✅ [App Review Test] Verifying pages_messaging DM dispatch and read receipt functionality via ReactCommerce.')
            fbReport.pages_messaging = { success: true, action: 'mark_seen & send_message', result: sent }
          } catch (e: any) {
            fbReport.pages_messaging = { success: false, recipient: testRecipient, error: e.message }
          }
        } else {
          fbReport.pages_messaging = { status: 'READY_FOR_TEST', note: 'Pass ?recipient_id=<PSID> to perform automated DM dispatch and seen receipt verification.' }
        }

        auditReport.results.facebook = fbReport
      } else {
        auditReport.results.facebook = { status: 'SKIP', reason: 'No active Facebook channel in DB.' }
      }
    }

    // ── 2. Instagram Verification (instagram_basic & instagram_manage_comments) ──
    if (mode === 'all' || mode === 'instagram') {
      const { data: igChannel } = await admin
        .from('channels')
        .select('*')
        .eq('platform', 'instagram')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (igChannel && igChannel.access_token && igChannel.external_id) {
        const igClient = new InstagramClient(igChannel.access_token, igChannel.external_id)
        const igReport: Record<string, any> = { channel_id: igChannel.id, account_id: igChannel.external_id }

        // Test A: Profile & Media List (instagram_basic)
        try {
          const profile = await igClient.getAccountProfile()
          const media = await igClient.listMedia(5)
          igReport.instagram_basic = {
            success: true,
            account_profile: profile,
            recent_media_count: media.length,
            sample_media: media.slice(0, 2),
          }
        } catch (e: any) {
          igReport.instagram_basic = { success: false, error: e?.response?.data?.error?.message || e.message }
        }

        // Test B: Comment Synchronization (instagram_manage_comments)
        try {
          const mediaList = await igClient.listMedia(1)
          if (mediaList.length > 0) {
            const comments = await igClient.listComments(mediaList[0].id, 10)
            igReport.instagram_manage_comments = {
              success: true,
              tested_media_id: mediaList[0].id,
              comments_found: comments.length,
              sample_comments: comments.slice(0, 3),
            }
          } else {
            igReport.instagram_manage_comments = { status: 'NO_MEDIA', note: 'No media posts available on IG account to inspect comments.' }
          }
        } catch (e: any) {
          igReport.instagram_manage_comments = { success: false, error: e?.response?.data?.error?.message || e.message }
        }

        auditReport.results.instagram = igReport
      } else {
        auditReport.results.instagram = { status: 'SKIP', reason: 'No active Instagram channel in DB.' }
      }
    }

    // ── 3. WhatsApp Business Management Verification ──
    if (mode === 'all' || mode === 'whatsapp') {
      const { data: waChannel } = await admin
        .from('channels')
        .select('*')
        .eq('platform', 'whatsapp')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const waToken = waChannel?.access_token || process.env.WHATSAPP_TOKEN
      const waPhoneId = waChannel?.external_id || process.env.WHATSAPP_PHONE_NUMBER_ID
      const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.WABA_ID

      if (waToken && waPhoneId && wabaId) {
        const waClient = new WhatsAppClient(waToken, waPhoneId)
        const waReport: Record<string, any> = { phone_number_id: waPhoneId, waba_id: wabaId }

        // Test A: Get Message Templates (whatsapp_business_management)
        try {
          const res = await axios.get(`${BASE}/${wabaId}/message_templates`, {
            params: { limit: 10 },
            headers: { Authorization: `Bearer ${waToken}` },
          })
          waReport.whatsapp_business_management = {
            success: true,
            templates_found: res.data?.data?.length ?? 0,
            sample_templates: (res.data?.data ?? []).slice(0, 3).map((t: any) => ({ name: t.name, status: t.status, category: t.category })),
          }
        } catch (e: any) {
          waReport.whatsapp_business_management = { success: false, error: e?.response?.data?.error?.message || e.message }
        }

        // Test B: Check Call Permission / Business Profile (whatsapp_business_messaging)
        try {
          const bizProfile = await waClient.getBusinessProfile()
          waReport.whatsapp_business_messaging = { success: true, business_profile: bizProfile }
        } catch (e: any) {
          waReport.whatsapp_business_messaging = { success: false, error: e.message }
        }

        auditReport.results.whatsapp = waReport
      } else {
        auditReport.results.whatsapp = { status: 'SKIP', reason: 'Missing WhatsApp credentials in DB or ENV.' }
      }
    }

    return NextResponse.json({
      message: 'Meta App Review Automated Suite Executed',
      report: auditReport,
    }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({
      error: 'Fatal error executing App Review suite',
      details: err.message || err,
    }, { status: 500 })
  }
}
