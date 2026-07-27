/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GRAPH_BASE = 'https://graph.facebook.com/v25.0'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, messageId, conversationId, text } = body

    if (!action || !conversationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch conversation & channel access token
    const { data: conv, error: convErr } = await admin
      .from('conversations')
      .select('*, channel:channels(*)')
      .eq('id', conversationId)
      .single()

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const channel = (conv as any).channel
    const accessToken = channel?.access_token
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available for this channel' }, { status: 400 })
    }

    // 2. Fetch message if messageId provided
    let message: any = null
    if (messageId) {
      const { data: msg } = await admin.from('messages').select('*').eq('id', messageId).single()
      message = msg
    }

    const externalId = message?.external_id
    const postId = conv.external_id || conv.meta?.post_id

    console.log(`[Comments Action] action=${action}, convId=${conversationId}, msgId=${messageId}, extId=${externalId}`)

    // 3. Handle specific moderation actions via Graph API v25.0
    if (action === 'like') {
      if (!externalId) return NextResponse.json({ error: 'Message has no external_id' }, { status: 400 })
      await axios.post(`${GRAPH_BASE}/${externalId}/likes`, null, { params: { access_token: accessToken } })
      
      const updatedMeta = { ...(message.meta || {}), is_liked: true }
      await admin.from('messages').update({ meta: updatedMeta }).eq('id', messageId)
      return NextResponse.json({ success: true, meta: updatedMeta })
    }

    if (action === 'unlike') {
      if (!externalId) return NextResponse.json({ error: 'Message has no external_id' }, { status: 400 })
      await axios.delete(`${GRAPH_BASE}/${externalId}/likes`, { params: { access_token: accessToken } })
      
      const updatedMeta = { ...(message.meta || {}), is_liked: false }
      await admin.from('messages').update({ meta: updatedMeta }).eq('id', messageId)
      return NextResponse.json({ success: true, meta: updatedMeta })
    }

    if (action === 'hide') {
      if (!externalId) return NextResponse.json({ error: 'Message has no external_id' }, { status: 400 })
      await axios.post(`${GRAPH_BASE}/${externalId}`, null, { params: { is_hidden: true, access_token: accessToken } })
      
      const updatedMeta = { ...(message.meta || {}), is_hidden: true }
      await admin.from('messages').update({ meta: updatedMeta }).eq('id', messageId)
      return NextResponse.json({ success: true, meta: updatedMeta })
    }

    if (action === 'unhide') {
      if (!externalId) return NextResponse.json({ error: 'Message has no external_id' }, { status: 400 })
      await axios.post(`${GRAPH_BASE}/${externalId}`, null, { params: { is_hidden: false, access_token: accessToken } })
      
      const updatedMeta = { ...(message.meta || {}), is_hidden: false }
      await admin.from('messages').update({ meta: updatedMeta }).eq('id', messageId)
      return NextResponse.json({ success: true, meta: updatedMeta })
    }

    if (action === 'delete') {
      if (!externalId) return NextResponse.json({ error: 'Message has no external_id' }, { status: 400 })
      try {
        await axios.delete(`${GRAPH_BASE}/${externalId}`, { params: { access_token: accessToken } })
      } catch (err: any) {
        console.warn('[Comments Action] Graph API delete warning:', err.response?.data || err.message)
      }
      await admin.from('messages').delete().eq('id', messageId)
      return NextResponse.json({ success: true, deleted: true })
    }

    if (action === 'reply') {
      if (!externalId || !text) return NextResponse.json({ error: 'Missing comment target or text' }, { status: 400 })
      const res = await axios.post(`${GRAPH_BASE}/${externalId}/comments`, null, {
        params: { message: text, access_token: accessToken }
      })
      const newCommentId = res.data?.id || `reply_${Date.now()}`

      const { data: insertedMsg, error: insErr } = await admin.from('messages').insert({
        conversation_id: conversationId,
        workspace_id: conv.workspace_id,
        external_id: newCommentId,
        direction: 'outbound',
        content_type: 'comment',
        body: text,
        status: 'delivered',
        is_note: false,
        meta: { parent_comment_id: externalId, is_reply: true, brand_reply: true }
      }).select().single()

      if (insErr) throw new Error(insErr.message)

      await admin.from('conversations').update({
        last_message: `You: ${text}`,
        last_message_at: new Date().toISOString()
      }).eq('id', conversationId)

      return NextResponse.json({ success: true, message: insertedMsg })
    }

    if (action === 'comment') {
      // Top-level brand comment on the post
      if (!postId || !text) return NextResponse.json({ error: 'Missing post target or text' }, { status: 400 })
      const res = await axios.post(`${GRAPH_BASE}/${postId}/comments`, null, {
        params: { message: text, access_token: accessToken }
      })
      const newCommentId = res.data?.id || `comment_${Date.now()}`

      const { data: insertedMsg, error: insErr } = await admin.from('messages').insert({
        conversation_id: conversationId,
        workspace_id: conv.workspace_id,
        external_id: newCommentId,
        direction: 'outbound',
        content_type: 'comment',
        body: text,
        status: 'delivered',
        is_note: false,
        meta: { post_id: postId, brand_comment: true }
      }).select().single()

      if (insErr) throw new Error(insErr.message)

      await admin.from('conversations').update({
        last_message: `You: ${text}`,
        last_message_at: new Date().toISOString()
      }).eq('id', conversationId)

      return NextResponse.json({ success: true, message: insertedMsg })
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 })
  } catch (err: any) {
    console.error('[Comments Action Error]', err?.response?.data || err?.message || err)
    return NextResponse.json({
      error: err?.response?.data?.error?.message || err?.message || 'Failed to perform moderation action'
    }, { status: 500 })
  }
}
