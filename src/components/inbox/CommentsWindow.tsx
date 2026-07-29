'use client'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { formatMessageDate, getInitials, getAvatarColor } from '@/lib/utils'
import type { Message } from '@/types'

const STATUS_CYCLE = ['open', 'pending', 'closed'] as const
const STATUS_LABEL = { open: 'Open', pending: 'Pending', closed: 'Closed' }

export default function CommentsWindow() {
  const supabase = useMemo(() => createClient(), [])
  const {
    activeConversationId,
    messages,
    setMessages,
    addMessage,
    updateMessage,
    updateConversation,
    selectedComment,
    setSelectedComment,
  } = useInboxStore()
  const conversation = useActiveConversation()
  const platform = conversation?.platform ?? 'instagram'

  const [status, setStatus] = useState<'open' | 'pending' | 'closed'>('open')
  const [replyTarget, setReplyTarget] = useState<{ id: string; external_id: string; text: string; authorName: string } | null>(null)
  const [inputText, setInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversation?.status) setStatus(conversation.status as any)
  }, [conversation?.status])

  const loadMessages = useCallback(async () => {
    if (!activeConversationId) return
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, full_name, avatar_url, role, email, workspace_id, is_online, created_at)')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) { console.error('[CommentsWindow] load error:', error.message); return }
    if (data) {
      setMessages(data as Message[])
    }
    await supabase.from('conversations').update({ unread_count: 0 }).eq('id', activeConversationId)
    updateConversation(activeConversationId, { unread_count: 0 })
  }, [activeConversationId, supabase, setMessages, updateConversation])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Realtime subscription for messages in this thread
  useEffect(() => {
    if (!activeConversationId) return
    const ch = supabase.channel(`comments-msg-${activeConversationId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`
      }, () => loadMessages())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [activeConversationId, supabase, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleStatusChange() {
    if (!activeConversationId) return
    const idx = STATUS_CYCLE.indexOf(status)
    const nxt = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    setStatus(nxt)
    updateConversation(activeConversationId, { status: nxt })
    await supabase.from('conversations').update({ status: nxt }).eq('id', activeConversationId)
  }

  async function performAction(action: string, msg: Message, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setOpenMenuId(null)
    try {
      const res = await fetch('/api/comments/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, messageId: msg.id, conversationId: activeConversationId })
      })
      if (res.ok) {
        const json = await res.json()
        if (action === 'delete') {
          setMessages(messages.filter(m => m.id !== msg.id))
          if (selectedComment?.id === msg.id) setSelectedComment(null)
        } else if (json.meta) {
          updateMessage(msg.id, { meta: json.meta })
        }
      }
    } catch (err) {
      console.error('[Action error]', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim() || !activeConversationId || isSubmitting) return

    setIsSubmitting(true)
    const text = inputText.trim()
    const action = replyTarget ? 'reply' : 'comment'
    const targetMsgId = replyTarget ? messages.find(m => m.external_id === replyTarget.external_id || m.id === replyTarget.id)?.id : undefined

    try {
      const res = await fetch('/api/comments/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          conversationId: activeConversationId,
          messageId: targetMsgId,
          text
        })
      })
      if (res.ok) {
        const json = await res.json()
        if (json.message) {
          addMessage(json.message)
        }
        setInputText('')
        setReplyTarget(null)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to post comment')
      }
    } catch (err) {
      console.error('[Submit error]', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!conversation) return null
  const rawTitle = conversation.title ? conversation.title.replace(/^Comments:\s*/i, '') : ''
  const title = rawTitle || `Post #${String(conversation.meta?.post_id || conversation.external_id || '').slice(-6)}`

  return (
    <div id="main-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} onClick={() => setOpenMenuId(null)}>
      {/* Header — aligned strictly with globals.css */}
      <div className="chat-header" style={{ flexShrink: 0, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="chat-contact" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar-wrap">
            <div
              className="avatar"
              style={{
                background: platform === 'instagram' ? 'linear-gradient(45deg, #f09433, #e1306c, #bc1888)' : '#1877f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                borderRadius: '8px', width: 36, height: 36
              }}
            >
              <i className="fa-solid fa-photo-film" style={{ fontSize: 16 }} />
            </div>
          </div>
          <div className="chat-contact-info">
            <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              <span>{title}</span>
              <span className={`platform-pill-sm ${platform === 'instagram' ? 'pp-ig' : 'pp-fb'}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                {platform === 'instagram' ? 'IG Post' : 'FB Post'}
              </span>
            </div>
            <div className="sub" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              <span>Active Public Comment Thread</span>
            </div>
          </div>
        </div>

        {/* Status Pill — matches exact status-pill CSS */}
        <div className="chat-header-actions">
          <div className={`status-pill ${status}`} onClick={handleStatusChange} title="Click to cycle status">
            <i className="fa-solid fa-circle" style={{ fontSize: '7px' }} />
            <span>{STATUS_LABEL[status]}</span>
          </div>
        </div>
      </div>

      {/* Messages / Comments Feed — flex: 1 so composer stays pinned at the bottom! */}
      <div className="workspace-content" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.6, padding: 32 }}>
            <i className="fa-regular fa-comments" style={{ fontSize: 36, marginBottom: 8 }} />
            <p>No comments on this post yet. Write below to publish a top-level brand comment!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isOut = m.direction === 'outbound' || m.meta?.brand_comment || m.meta?.brand_reply
            const authorName = isOut ? 'Official Brand Page' : (m.meta?.from?.name || m.meta?.commenter_username || conversation.contact?.name || 'Customer User')
            const avatarUrl = !isOut ? conversation.contact?.avatar_url?.replace(/&amp;/g, '&') : null
            const isSelected = selectedComment?.id === m.id
            const isLiked = m.meta?.is_liked === true
            const isHidden = m.meta?.is_hidden === true

            return (
              <div
                key={m.id}
                onClick={() => setSelectedComment(m)}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: isSelected ? 'rgba(59, 130, 246, 0.12)' : isOut ? 'rgba(255, 255, 255, 0.04)' : 'var(--card-bg, #1e2024)',
                  border: isSelected ? '1px solid var(--accent, #3b82f6)' : '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  marginLeft: m.meta?.is_reply ? 32 : 0,
                  opacity: isHidden ? 0.6 : 1
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  {isOut ? (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                      <i className="fa-solid fa-building" />
                    </div>
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt={authorName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: getAvatarColor(m.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13 }}>
                      {getInitials(authorName)}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: isOut ? 'var(--accent, #3b82f6)' : '#fff', fontWeight: 600 }}>
                      {authorName}
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted, #737373)' }}>
                      {formatMessageDate(m.created_at)}
                    </span>
                    {isHidden && (
                      <span style={{ fontSize: 10, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '1px 6px', borderRadius: 4 }}>
                        Hidden on Meta
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: '#e5e7eb', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                    {m.body}
                  </div>

                  {/* Comment interactive actions bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => performAction(isLiked ? 'unlike' : 'like', m, e)}
                      style={{ background: 'none', border: 'none', color: isLiked ? '#ef4444' : 'var(--text-muted, #737373)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <i className={isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart"} /> {isLiked ? 'Liked' : 'Like'}
                    </button>
                    
                    {!isOut && (
                      <button
                        onClick={() => {
                          setReplyTarget({ id: m.id, external_id: m.external_id || '', text: m.body || '', authorName })
                          setSelectedComment(m)
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted, #737373)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <i className="fa-solid fa-reply" /> Reply
                      </button>
                    )}

                    <div style={{ position: 'relative', marginLeft: 'auto' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === m.id ? null : m.id) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14, padding: '2px 6px', cursor: 'pointer' }}
                      >
                        <i className="fa-solid fa-ellipsis-vertical" />
                      </button>

                      {openMenuId === m.id && (
                        <div style={{ position: 'absolute', right: 0, bottom: 24, background: '#26282e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10, overflow: 'hidden', minWidth: 140 }}>
                          <button
                            onClick={(e) => performAction(isHidden ? 'unhide' : 'hide', m, e)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#e5e7eb', fontSize: 12, textAlign: 'left', cursor: 'pointer' }}
                          >
                            <i className={isHidden ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"} /> {isHidden ? 'Unhide comment' : 'Hide comment'}
                          </button>
                          <button
                            onClick={(e) => performAction('delete', m, e)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#ef4444', fontSize: 12, textAlign: 'left', cursor: 'pointer' }}
                          >
                            <i className="fa-solid fa-trash" /> Delete on Meta
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer Area — rigidly pinned at the bottom of the screen */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'var(--card-bg, #16181b)', padding: 12 }}>
        {replyTarget && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59, 130, 246, 0.15)', borderLeft: '3px solid var(--accent, #3b82f6)', padding: '6px 12px', borderRadius: '0 6px 6px 0', marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
              <strong>Replying to @{replyTarget.authorName}:</strong> {replyTarget.text}
            </span>
            <button
              onClick={() => setReplyTarget(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14 }}
              title="Cancel reply (switch to brand self-comment)"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={isSubmitting}
            placeholder={replyTarget ? `Reply to @${replyTarget.authorName}...` : "Write an official public comment as your brand on this post..."}
            style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, padding: '10px 16px', color: '#fff', fontSize: 13, outline: 'none' }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            style={{ background: 'var(--accent, #3b82f6)', border: 'none', borderRadius: 20, padding: '0 20px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: !inputText.trim() || isSubmitting ? 'not-allowed' : 'pointer', opacity: !inputText.trim() || isSubmitting ? 0.5 : 1 }}
          >
            {isSubmitting ? <i className="fa-solid fa-spinner fa-spin" /> : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
