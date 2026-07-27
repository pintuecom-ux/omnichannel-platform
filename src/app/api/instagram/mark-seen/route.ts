/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { InstagramClient } from '@/lib/platforms/instagram'
import { getInstagramIdentity } from '@/lib/instagram/helpers'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const conversation_id = body.conversation_id || body.conversationId
    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
    }

    const { data: conv, error: convErr } = await admin
      .from('conversations')
      .select('*, contact:contacts(*), channel:channels(*)')
      .eq('id', conversation_id)
      .maybeSingle()

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conv.platform !== 'instagram' || conv.external_id != null) {
      // Only applicable for Instagram DMs (where external_id is null; comments have external_id)
      return NextResponse.json({ success: true, skipped: true })
    }

    if (!conv.channel?.access_token || !conv.channel?.external_id) {
      return NextResponse.json({ error: 'Instagram channel access token missing' }, { status: 400 })
    }

    const identity = getInstagramIdentity(conv.contact)
    const recipientId = identity?.instagram_scoped_id

    if (!recipientId) {
      return NextResponse.json({ error: 'No Instagram recipient ID found for contact' }, { status: 400 })
    }

    const ig = new InstagramClient(conv.channel.access_token, conv.channel.external_id)
    await ig.markSeen(recipientId)

    if (conv.unread_count > 0) {
      await admin.from('conversations').update({ unread_count: 0 }).eq('id', conversation_id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[IG mark-seen] Error:', err?.message ?? err)
    return NextResponse.json({ error: err?.message || 'Failed to mark seen' }, { status: 500 })
  }
}
