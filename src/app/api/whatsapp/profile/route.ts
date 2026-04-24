/**
 * /api/whatsapp/profile
 *
 * GET  → fetch WhatsApp Business Profile from Meta
 * POST → update WhatsApp Business Profile on Meta
 *
 * Official API:
 *   GET  /v25.0/{phone-number-id}/whatsapp_business_profile
 *   POST /v25.0/{phone-number-id}/whatsapp_business_profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import axios from 'axios'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WA_BASE = 'https://graph.facebook.com/v25.0'

async function getChannel(userId: string) {
  const { data: profile } = await admin
    .from('profiles')
    .select('workspace_id')
    .eq('id', userId)
    .single()
  if (!profile) return null

  const { data: channel } = await admin
    .from('channels')
    .select('access_token, external_id')
    .eq('workspace_id', profile.workspace_id)
    .eq('platform', 'whatsapp')
    .maybeSingle()

  const token   = channel?.access_token ?? process.env.WHATSAPP_TOKEN ?? ''
  const phoneId = channel?.external_id  ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
  return { token, phoneId }
}

/* -------------------------------------------------------------------------- */
/* GET — fetch business profile                                               */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ch = await getChannel(session.user.id)
  if (!ch) return NextResponse.json({ error: 'No WhatsApp channel configured' }, { status: 404 })

  try {
    const res = await axios.get(
      `${WA_BASE}/${ch.phoneId}/whatsapp_business_profile`,
      {
        params: {
          fields: 'about,address,description,email,profile_picture_url,websites,vertical,messaging_product',
        },
        headers: { Authorization: `Bearer ${ch.token}` },
      }
    )
    // Meta returns { data: [{ ... }] }
    const profile = res.data?.data?.[0] ?? res.data ?? {}
    return NextResponse.json({ profile })
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message
    console.error('[WA Profile] GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* -------------------------------------------------------------------------- */
/* POST — update business profile                                             */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ch = await getChannel(session.user.id)
  if (!ch) return NextResponse.json({ error: 'No WhatsApp channel configured' }, { status: 404 })

  const body = await req.json()

  // Only send fields that were actually provided
  const payload: Record<string, any> = {
    messaging_product: 'whatsapp',
  }

  const allowed = ['about', 'address', 'description', 'email', 'websites', 'vertical', 'profile_picture_handle']
  for (const key of allowed) {
    if (body[key] !== undefined) payload[key] = body[key]
  }

  try {
    await axios.post(
      `${WA_BASE}/${ch.phoneId}/whatsapp_business_profile`,
      payload,
      { headers: { Authorization: `Bearer ${ch.token}`, 'Content-Type': 'application/json' } }
    )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message
    console.error('[WA Profile] POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
