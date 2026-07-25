import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient } from '@/lib/platforms/whatsapp'
import { FacebookClient } from '@/lib/platforms/facebook'
import { InstagramClient } from '@/lib/platforms/instagram'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversation_id, message_id } = await req.json()
  if (!conversation_id || !message_id) {
    return NextResponse.json({ error: 'conversation_id and message_id required' }, { status: 400 })
  }

  // Get conversation, contact, and channel info
  const { data: conv } = await admin
    .from('conversations')
    .select('platform, contact:contacts(*), channel:channels(access_token, external_id)')
    .eq('id', conversation_id)
    .single()

  if (!conv?.channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  const channel = conv.channel as any
  const contact = conv.contact as any

  try {
    if (conv.platform === 'whatsapp') {
      const wa = new WhatsAppClient(channel.access_token, channel.external_id)
      await wa.markRead(message_id)
    } else if (conv.platform === 'facebook') {
      const fb = new FacebookClient(channel.access_token, channel.external_id)
      const recipientId = contact?.facebook_scoped_id ?? contact?.facebook_id
      if (recipientId) await fb.markSeen(recipientId)
    } else if (conv.platform === 'instagram') {
      const ig = new InstagramClient(channel.access_token, channel.external_id)
      const recipientId = contact?.instagram_scoped_id ?? contact?.instagram_id
      if (recipientId) await ig.markSeen(recipientId)
    }

    // Update message status in DB for all platforms
    await admin
      .from('messages')
      .update({ status: 'read' })
      .eq('external_id', message_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Non-critical — don't break the client
    console.warn('[Mark Read] Failed:', err?.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
