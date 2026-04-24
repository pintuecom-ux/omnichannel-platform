/**
 * /api/whatsapp/qr
 *
 * GET               → list all QR codes
 * POST action=create → create a new QR code
 * POST action=update → update a QR code's prefilled message
 * DELETE             → delete a QR code
 *
 * Official API: /{phone-number-id}/message_qrdls
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
/* GET — list all QR codes                                                    */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ch = await getChannel(session.user.id)
  if (!ch) return NextResponse.json({ error: 'No WhatsApp channel configured' }, { status: 404 })

  const qrId = req.nextUrl.searchParams.get('id')

  try {
    if (qrId) {
      // Get single QR code with both SVG and PNG URLs
      const res = await axios.get(
        `${WA_BASE}/${ch.phoneId}/message_qrdls`,
        {
          params: { fields: 'prefilled_message,deep_link_url,qr_image_url', code: qrId },
          headers: { Authorization: `Bearer ${ch.token}` },
        }
      )
      return NextResponse.json({ qr: res.data?.data?.[0] ?? res.data })
    } else {
      // List all with image URLs in SVG format
      const res = await axios.get(
        `${WA_BASE}/${ch.phoneId}/message_qrdls`,
        {
          params: { fields: 'code,prefilled_message,deep_link_url,qr_image_url.format(SVG)' },
          headers: { Authorization: `Bearer ${ch.token}` },
        }
      )
      return NextResponse.json({ qr_codes: res.data?.data ?? [] })
    }
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* -------------------------------------------------------------------------- */
/* POST — create or update QR code                                            */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ch = await getChannel(session.user.id)
  if (!ch) return NextResponse.json({ error: 'No WhatsApp channel configured' }, { status: 404 })

  const body = await req.json()
  const { action, prefilled_message, code, generate_qr_image = 'SVG' } = body

  if (!prefilled_message) {
    return NextResponse.json({ error: 'prefilled_message is required' }, { status: 400 })
  }

  try {
    if (action === 'update' && code) {
      // Update existing QR code (change its prefilled message)
      const res = await axios.post(
        `${WA_BASE}/${ch.phoneId}/message_qrdls`,
        { prefilled_message, code },
        { headers: { Authorization: `Bearer ${ch.token}`, 'Content-Type': 'application/json' } }
      )
      return NextResponse.json({ qr: res.data })
    } else {
      // Create new QR code
      const res = await axios.post(
        `${WA_BASE}/${ch.phoneId}/message_qrdls`,
        { prefilled_message, generate_qr_image },
        { headers: { Authorization: `Bearer ${ch.token}`, 'Content-Type': 'application/json' } }
      )
      return NextResponse.json({ qr: res.data })
    }
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message
    console.error('[WA QR] POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE — delete a QR code                                                  */
/* -------------------------------------------------------------------------- */

export async function DELETE(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ch = await getChannel(session.user.id)
  if (!ch) return NextResponse.json({ error: 'No WhatsApp channel configured' }, { status: 404 })

  const { qr_code_id } = await req.json()
  if (!qr_code_id) return NextResponse.json({ error: 'qr_code_id required' }, { status: 400 })

  try {
    await axios.delete(
      `${WA_BASE}/${ch.phoneId}/message_qrdls/${qr_code_id}`,
      { headers: { Authorization: `Bearer ${ch.token}` } }
    )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message
    console.error('[WA QR] DELETE error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
