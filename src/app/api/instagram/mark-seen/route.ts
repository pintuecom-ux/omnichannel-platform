/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { InstagramClient } from '@/lib/platforms/instagram'
import { getInstagramIdentity } from '@/lib/instagram/helpers'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json()
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    const { data: conv } = await admin
      .from('conversations')
      .select('*, channel:channels(*), contact:contacts(*)')
      .eq('id', conversationId)
      .maybeSingle()

    if (!conv || conv.platform !== 'instagram' || !conv.channel) {
      return NextResponse.json({ success: false, reason: 'Not an Instagram conversation' })
    }

    const identity = getInstagramIdentity(conv.contact)
    if (!identity?.instagram_scoped_id) {
      return NextResponse.json({ success: false, reason: 'No IG recipient ID' })
    }

    const ig = new InstagramClient(conv.channel.access_token, conv.channel.external_id)
    await ig.markSeen(identity.instagram_scoped_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.warn('[IG mark-seen error]', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
