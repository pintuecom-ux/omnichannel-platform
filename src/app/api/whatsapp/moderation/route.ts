/**
 * /api/whatsapp/moderation
 *
 * GET    → list currently blocked users
 * POST   → block one or more users
 * DELETE → unblock one or more users
 *
 * Official API: /{phone-number-id}/block_users
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

function normalizePhone(p: string) {
  return p.replace(/[\s\-\+\(\)]/g, '')
}

/* -------------------------------------------------------------------------- */
/* GET — list blocked users                                                   */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ch = await getChannel(session.user.id)
  if (!ch) return NextResponse.json({ error: 'No WhatsApp channel configured' }, { status: 404 })

  try {
    const res = await axios.get(
      `${WA_BASE}/${ch.phoneId}/block_users`,
      { headers: { Authorization: `Bearer ${ch.token}` } }
    )
    return NextResponse.json({ blocked_users: res.data?.block_users ?? [] })
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* -------------------------------------------------------------------------- */
/* POST — block user(s)                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ch = await getChannel(session.user.id)
  if (!ch) return NextResponse.json({ error: 'No WhatsApp channel configured' }, { status: 404 })

  const { phones } = await req.json()   // string[]
  if (!phones?.length) return NextResponse.json({ error: 'phones array required' }, { status: 400 })

  try {
    const res = await axios.post(
      `${WA_BASE}/${ch.phoneId}/block_users`,
      {
        messaging_product: 'whatsapp',
        block_users: phones.map((p: string) => ({ user: normalizePhone(p) })),
      },
      { headers: { Authorization: `Bearer ${ch.token}`, 'Content-Type': 'application/json' } }
    )
    return NextResponse.json({ success: true, result: res.data })
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message
    console.error('[WA Moderation] Block error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE — unblock user(s)                                                   */
/* -------------------------------------------------------------------------- */

export async function DELETE(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ch = await getChannel(session.user.id)
  if (!ch) return NextResponse.json({ error: 'No WhatsApp channel configured' }, { status: 404 })

  const { phones } = await req.json()   // string[]
  if (!phones?.length) return NextResponse.json({ error: 'phones array required' }, { status: 400 })

  try {
    const res = await axios.delete(
      `${WA_BASE}/${ch.phoneId}/block_users`,
      {
        headers: { Authorization: `Bearer ${ch.token}`, 'Content-Type': 'application/json' },
        data: {
          messaging_product: 'whatsapp',
          block_users: phones.map((p: string) => ({ user: normalizePhone(p) })),
        },
      }
    )
    return NextResponse.json({ success: true, result: res.data })
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message
    console.error('[WA Moderation] Unblock error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
