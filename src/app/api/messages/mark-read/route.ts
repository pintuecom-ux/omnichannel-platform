import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { WhatsAppClient } from '@/lib/platforms/whatsapp'

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

  // Get channel info
  const { data: conv } = await admin
    .from('conversations')
    .select('channel:channels(access_token, external_id)')
    .eq('id', conversation_id)
    .single()

  if (!conv?.channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  const channel = conv.channel as any
  try {
    const wa = new WhatsAppClient(channel.access_token, channel.external_id)
    await wa.markRead(message_id)

    // Update message status in DB
    await admin
      .from('messages')
      .update({ status: 'read' })
      .eq('external_id', message_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Non-critical — don't break the client
    console.warn('[Mark Read] Failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
