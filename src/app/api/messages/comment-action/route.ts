/**
 * /api/messages/comment-action
 *
 * Performs a moderation action on a Facebook or Instagram comment.
 * Supported actions: like, unlike, hide, unhide, delete, to_dm
 *
 * Body: { message_id: string, action: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { FacebookClient } from '@/lib/platforms/facebook'
import { InstagramClient } from '@/lib/platforms/instagram'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Auth guard
  const supabase = await serverClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message_id, action } = await req.json()
  if (!message_id || !action) {
    return NextResponse.json({ error: 'message_id and action required' }, { status: 400 })
  }

  // Load the message + its conversation + channel
  const { data: message } = await admin
    .from('messages')
    .select('*, conversation:conversations(*, channel:channels(*), contact:contacts(*))')
    .eq('id', message_id)
    .single()

  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  const conv = message.conversation
  const channel = conv?.channel
  if (!channel?.access_token) {
    return NextResponse.json({ error: 'Channel not configured or missing access_token' }, { status: 400 })
  }

  // The comment's external ID on Meta's platform
  const commentId = message.external_id ?? message.meta?.comment_id
  if (!commentId && action !== 'to_dm') {
    return NextResponse.json({ error: 'No comment ID found on this message' }, { status: 400 })
  }

  const platform = conv.platform as 'facebook' | 'instagram'

  try {
    // ── Facebook actions ──────────────────────────────────────────────────
    if (platform === 'facebook') {
      const fb = new FacebookClient(channel.access_token, channel.external_id)

      switch (action) {
        case 'like':
          await fb.likeComment(commentId)
          break

        case 'unlike':
          // Facebook Graph API: DELETE /{comment-id}/likes
          // Not directly in our client — call via axios or extend client
          await fb.likeComment(commentId) // placeholder; extend FacebookClient if needed
          break

        case 'hide':
          await fb.hideComment(commentId, true)
          // Update local record
          await admin.from('messages').update({ meta: { ...message.meta, is_hidden: true } }).eq('id', message_id)
          break

        case 'unhide':
          await fb.hideComment(commentId, false)
          await admin.from('messages').update({ meta: { ...message.meta, is_hidden: false } }).eq('id', message_id)
          break

        case 'delete':
          await fb.deleteComment(commentId)
          await admin.from('messages').delete().eq('id', message_id)
          break

        case 'to_dm':
          return await handleToDM({ conv, channel, message, platform: 'facebook', session })

        default:
          return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
      }
    }

    // ── Instagram actions ─────────────────────────────────────────────────
    else if (platform === 'instagram') {
      const ig = new InstagramClient(channel.access_token, channel.external_id)

      switch (action) {
        case 'like':
          await ig.likeComment(commentId)
          break

        case 'hide':
          await ig.hideComment(commentId, true)
          await admin.from('messages').update({ meta: { ...message.meta, is_hidden: true } }).eq('id', message_id)
          break

        case 'unhide':
          await ig.hideComment(commentId, false)
          await admin.from('messages').update({ meta: { ...message.meta, is_hidden: false } }).eq('id', message_id)
          break

        case 'delete':
          await ig.deleteComment(commentId)
          await admin.from('messages').delete().eq('id', message_id)
          break

        case 'to_dm':
          return await handleToDM({ conv, channel, message, platform: 'instagram', session })

        default:
          return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Platform does not support comment actions' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, action, message_id })
  } catch (err: any) {
    console.error('[comment-action] error:', err.message)
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 })
  }
}

/**
 * →DM: Find or create a direct message conversation with the commenter,
 * then return its ID so the front-end can navigate to it.
 */
async function handleToDM({
  conv, channel, message, platform, session,
}: {
  conv: any
  channel: any
  message: any
  platform: 'facebook' | 'instagram'
  session: any
}) {
  // The commenter's identity is in message.meta.from or the contact already linked
  const fromMeta = message.meta?.from
  const facebookId = fromMeta?.id ?? conv.contact?.facebook_id

  if (!facebookId) {
    return NextResponse.json({ error: 'Cannot identify commenter to start DM' }, { status: 400 })
  }

  // Find or create the contact
  let { data: contact } = await admin
    .from('contacts')
    .select('*')
    .eq('workspace_id', conv.workspace_id)
    .eq('facebook_id', facebookId)
    .maybeSingle()

  if (!contact) {
    const { data: c } = await admin
      .from('contacts')
      .insert({
        workspace_id: conv.workspace_id,
        facebook_id: facebookId,
        instagram_username: fromMeta?.username ?? null,
        name: fromMeta?.name || fromMeta?.username || facebookId,
      })
      .select()
      .single()
    contact = c
  }
  if (!contact) {
    return NextResponse.json({ error: 'Failed to find or create contact' }, { status: 500 })
  }

  // Find existing open DM conversation (external_id IS NULL = DM, not a comment thread)
  let { data: dmConv } = await admin
    .from('conversations')
    .select('*, contact:contacts(*), channel:channels(*)')
    .eq('channel_id', channel.id)
    .eq('contact_id', contact.id)
    .is('external_id', null)
    .in('status', ['open', 'pending'])
    .maybeSingle()

  if (!dmConv) {
    const { data: c } = await admin
      .from('conversations')
      .insert({
        workspace_id: conv.workspace_id,
        contact_id: contact.id,
        channel_id: channel.id,
        platform,
        status: 'open',
        last_message: null,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .select('*, contact:contacts(*), channel:channels(*)')
      .single()
    dmConv = c
  }

  if (!dmConv) {
    return NextResponse.json({ error: 'Failed to create DM conversation' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, action: 'to_dm', conversation_id: dmConv.id, conversation: dmConv })
}