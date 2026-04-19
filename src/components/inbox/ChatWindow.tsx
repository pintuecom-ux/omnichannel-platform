'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { formatMessageDate } from '@/lib/utils'
import MessageBubble from './MessageBubble'
import InputArea from './InputArea'
import type { Conversation, Message } from '@/types'

const STATUS_CYCLE = ['open', 'pending', 'closed'] as const
const STATUS_LABEL = { open: 'Open', pending: 'Pending', closed: 'Closed' }

export default function ChatWindow() {
  const supabase = createClient()
  const { activeConversationId, messages, setMessages, addMessage, updateMessage, updateConversation } = useInboxStore()
  const conversation = useActiveConversation()
  const platform = conversation?.platform ?? 'whatsapp'
  const isWA = platform === 'whatsapp'
  const [activeTab, setActiveTab] = useState<'messages' | 'notes' | 'comments'>('messages')
  const [status, setStatus] = useState<'open' | 'pending' | 'closed'>('open')
  // Track which comment the agent is replying to in the Comments tab
  const [replyingTo, setReplyingTo] = useState<{ id: string; body: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveTab('messages')
    setReplyingTo(null)
  }, [activeConversationId])

  const loadMessages = useCallback(async () => {
    if (!activeConversationId) return
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, full_name, avatar_url, role, email, workspace_id, is_online, created_at)')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) { console.error('[ChatWindow] loadMessages error:', error.message); return }
    if (data) setMessages(data as Message[])

    // Mark conversation as read
    await supabase.from('conversations').update({ unread_count: 0 }).eq('id', activeConversationId)
    updateConversation(activeConversationId, { unread_count: 0 })

    // Send WA read receipts for last 5 unread inbound messages
    if (isWA && data) {
      const unread = data.filter(m => m.direction === 'inbound' && m.status !== 'read' && m.external_id)
      if (unread.length > 0) {
        unread.slice(-5).forEach(m => {
          fetch('/api/messages/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: activeConversationId, message_id: m.external_id }),
          }).catch(() => {})
        })
      }
    }
  }, [activeConversationId, isWA]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conversation) return
    setStatus(conversation.status as 'open' | 'pending' | 'closed')
  }, [conversation?.status])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Realtime subscription
  useEffect(() => {
    if (!activeConversationId) return
    const ch = supabase
      .channel(`msg-${activeConversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      }, payload => {
        const msg = payload.new as Message
        if (!msg.id.startsWith('temp-')) addMessage(msg)
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      }, payload => {
        updateMessage(payload.new.id, payload.new as Partial<Message>)
      })
      .subscribe(s => { if (s === 'SUBSCRIBED') loadMessages() })
    return () => { supabase.removeChannel(ch) }
  }, [activeConversationId, loadMessages]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages.length])

  async function cycleStatus() {
    if (!activeConversationId) return
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length]
    setStatus(next)
    await supabase.from('conversations').update({ status: next }).eq('id', activeConversationId)
    updateConversation(activeConversationId, { status: next })
  }

  if (!conversation) return null

  const contactName = conversation.contact?.name || conversation.contact?.phone || conversation.contact?.instagram_username || 'Unknown'
  const platformIcon  = { whatsapp: 'fa-brands fa-whatsapp', instagram: 'fa-brands fa-instagram', facebook: 'fa-brands fa-facebook' }[platform]
  const platformCls   = { whatsapp: 'pp-wa', instagram: 'pp-ig', facebook: 'pp-fb' }[platform]
  const platformLabel = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook' }[platform]
  const badgeCls      = { whatsapp: 'pb-wa', instagram: 'pb-ig', facebook: 'pb-fb' }[platform]

  // Build date groups — filter messages by active tab
  const dateGroups: { date: string; msgs: Message[] }[] = []
  const displayMsgs = messages.filter(m => {
    if (activeTab === 'notes')    return m.is_note
    if (activeTab === 'comments') return m.content_type === 'comment'
    return !m.is_note && m.content_type !== 'comment'
  })
  for (const msg of displayMsgs) {
    const d = formatMessageDate(msg.created_at)
    const last = dateGroups[dateGroups.length - 1]
    if (!last || last.date !== d) dateGroups.push({ date: d, msgs: [msg] })
    else last.msgs.push(msg)
  }

  const tabs: ('messages' | 'notes' | 'comments')[] = isWA ? ['messages', 'notes'] : ['messages', 'notes', 'comments']

  return (
    <div id="main-workspace">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-contact">
          <div className="avatar-wrap">
            <div className="avatar" style={{ background: '#1a6b3a', width: 40, height: 40, fontSize: 14, fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {contactName.slice(0, 2).toUpperCase()}
            </div>
            <div className={`platform-badge ${badgeCls}`}>
              <i className={platformIcon} style={{ fontSize: '8px' }} />
            </div>
          </div>
          <div className="chat-contact-info">
            <div className="name">{contactName}</div>
            <div className="sub">
              <span className={`platform-pill-sm ${platformCls}`}><i className={platformIcon} /> {platformLabel}</span>
              {conversation.status === 'open' && <span style={{ color: 'var(--accent)', fontSize: 11 }}>● Online</span>}
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          <div className={`status-pill ${status}`} onClick={cycleStatus}>
            <i className="fa-solid fa-circle" style={{ fontSize: '7px' }} />
            <span>{STATUS_LABEL[status]}</span>
          </div>
          <button className="icon-btn" title="Search"><i className="fa-solid fa-magnifying-glass" /></button>
          <button className="icon-btn" title="More"><i className="fa-solid fa-ellipsis-vertical" /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="workspace-tabs">
        {tabs.map(tab => (
          <div
            key={tab}
            className={`ws-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); setReplyingTo(null) }}
          >
            {tab === 'messages' && <><i className="fa-solid fa-message" /> Messages</>}
            {tab === 'notes' && (
              <><i className="fa-solid fa-note-sticky" /> Notes
                {messages.filter(m => m.is_note).length > 0 && (
                  <span className="tab-badge">{messages.filter(m => m.is_note).length}</span>
                )}
              </>
            )}
            {tab === 'comments' && (
              <>
                <i className={platformIcon} style={{ color: platform === 'instagram' ? '#e1306c' : '#1877f2' }} /> Comments
                {messages.filter(m => m.content_type === 'comment').length > 0 && (
                  <span className="tab-badge">{messages.filter(m => m.content_type === 'comment').length}</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Messages area */}
      <div className="workspace-content">
        {activeTab === 'notes' && (
          <div className="note-intro"><i className="fa-solid fa-lock" /> Internal notes — never sent to customer.</div>
        )}
        {activeTab === 'comments' && (
          <div className="note-intro" style={{ borderColor: 'rgba(24,119,242,0.2)', color: 'var(--text-secondary)' }}>
            <i className={platformIcon} style={{ color: platform === 'instagram' ? '#e1306c' : '#1877f2' }} />
            {' '}Public comments on your {platform === 'instagram' ? 'Instagram' : 'Facebook'} posts. Click Reply on any comment below.
          </div>
        )}

        {dateGroups.length === 0 ? (
          <div className="empty-state">
            <i className="fa-brands fa-whatsapp" style={{ fontSize: 48, opacity: 0.15 }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {activeTab === 'messages' ? 'No messages yet.'
                : activeTab === 'notes' ? 'No notes yet.'
                : 'No comments yet.'}
            </p>
          </div>
        ) : (
          dateGroups.map(group => (
            <div key={group.date}>
              <div className="date-divider"><span>{group.date}</span></div>
              {group.msgs.map((msg, i) => {
                const prev = group.msgs[i - 1]
                const next = group.msgs[i + 1]
                const isFirst = !prev || prev.direction !== msg.direction || new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60000
                const isLast  = !next || next.direction !== msg.direction || new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() > 5 * 60000
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isFirstInGroup={isFirst}
                    isLastInGroup={isLast}
                    onSetReply={
                      activeTab === 'comments'
                        ? (id, body) => setReplyingTo({ id, body })
                        : undefined
                    }
                  />
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area — switches by tab */}
      {activeTab === 'messages' && <InputArea onMessageSent={loadMessages} />}
      {activeTab === 'notes' && (
        <NoteInput conversationId={activeConversationId!} onSaved={loadMessages} />
      )}
      {activeTab === 'comments' && (
        <CommentReplyInput
          conversation={conversation}
          replyingTo={replyingTo}
          onClearReply={() => setReplyingTo(null)}
          onSent={() => { loadMessages(); setReplyingTo(null) }}
        />
      )}
    </div>
  )
}

// ── Internal Note Input ──────────────────────────────────────────────────────
function NoteInput({ conversationId, onSaved }: { conversationId: string; onSaved: () => void }) {
  const [text, setText] = useState('')
  const supabase = createClient()

  async function save() {
    if (!text.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!p) return
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      workspace_id: p.workspace_id,
      direction: 'outbound',
      content_type: 'text',
      body: text.trim(),
      is_note: true,
      status: 'sent',
      sender_id: session.user.id,
    })
    setText('')
    onSaved()
  }

  return (
    <div className="notes-input-area">
      <div className="input-row">
        <textarea
          className="input-box"
          placeholder="Add an internal note… (Enter to save)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } }}
          rows={1}
          style={{ borderColor: 'rgba(245,158,11,0.4)' }}
        />
        <button className="send-btn" style={{ background: 'var(--accent3)' }} onClick={save}>
          <i className="fa-solid fa-plus" />
        </button>
      </div>
    </div>
  )
}

// ── Comment Reply Input (now functional) ─────────────────────────────────────
interface CommentReplyInputProps {
  conversation: Conversation
  replyingTo: { id: string; body: string } | null
  onClearReply: () => void
  onSent: () => void
}

function CommentReplyInput({ conversation, replyingTo, onClearReply, onSent }: CommentReplyInputProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)

  async function send() {
    if (!text.trim() || sending) return
    if (!replyingTo) {
      setError('Select a comment to reply to by clicking Reply below it.')
      return
    }
    setError('')
    setSending(true)

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.id,
          type: 'comment_reply',
          comment_id: replyingTo.id,
          body: text.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to send reply')
      } else {
        setText('')
        onSent()
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setSending(false)
    }
  }

  const platformIcon = {
    facebook: 'fa-brands fa-facebook',
    instagram: 'fa-brands fa-instagram',
    whatsapp: 'fa-brands fa-whatsapp',
  }[conversation.platform]

  const platformColor = conversation.platform === 'instagram' ? '#e1306c' : '#1877f2'

  return (
    <div className="notes-input-area" style={{ borderTop: '1px solid var(--border)' }}>
      {/* Reply target indicator */}
      {replyingTo ? (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 12px',
          background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
          fontSize: 12,
        }}>
          <i className="fa-solid fa-reply" style={{ color: platformColor, marginTop: 2, flexShrink: 0 }} />
          <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Replying to: <em>{replyingTo.body.slice(0, 60)}{replyingTo.body.length > 60 ? '…' : ''}</em>
          </span>
          <button
            onClick={onClearReply}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, flexShrink: 0 }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      ) : (
        <div style={{ padding: '5px 12px', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className={platformIcon} style={{ color: platformColor }} />
          Click <strong>Reply</strong> on a comment above to respond publicly
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '4px 12px', fontSize: 11, color: '#e84040' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 4 }} />{error}
        </div>
      )}

      {/* Input row */}
      <div className="input-row">
        <textarea
          ref={textRef}
          className="input-box"
          placeholder={replyingTo ? 'Write a public reply…' : 'Select a comment to reply to first…'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1}
          disabled={sending || !replyingTo}
          style={{
            borderColor: replyingTo ? `${platformColor}44` : undefined,
            opacity: replyingTo ? 1 : 0.6,
          }}
        />
        <button
          className="send-btn"
          style={{
            background: replyingTo ? platformColor : 'var(--bg-surface)',
            opacity: (sending || !text.trim() || !replyingTo) ? 0.5 : 1,
          }}
          onClick={send}
          disabled={sending || !text.trim() || !replyingTo}
          title={replyingTo ? 'Send public reply' : 'Select a comment first'}
        >
          {sending
            ? <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }} />
            : <i className="fa-solid fa-paper-plane" />
          }
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}