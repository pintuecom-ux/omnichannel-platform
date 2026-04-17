'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { formatMessageDate } from '@/lib/utils'
import MessageBubble from './MessageBubble'
import InputArea from './InputArea'
import type { Message } from '@/types'

const STATUS_CYCLE = ['open', 'pending', 'closed'] as const
const STATUS_LABEL = { open: 'Open', pending: 'Pending', closed: 'Closed' }

// Group messages: consecutive same-direction messages within 5 minutes = same group
function groupMessages(messages: Message[]) {
  const groups: { msgs: Message[]; isLast: boolean }[] = []
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const sameAsPrev = prev &&
      prev.direction === msg.direction &&
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
    const sameAsNext = next &&
      next.direction === msg.direction &&
      new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() < 5 * 60 * 1000

    groups.push({
      msgs: [msg],
      isLast: !sameAsNext,
    })
  }
  return groups
}

export default function ChatWindow() {
  const supabase = createClient()
  const {
    activeConversationId, messages, setMessages,
    addMessage, updateMessage, updateConversation,
  } = useInboxStore()
  const conversation = useActiveConversation()
  // Only show Notes for WhatsApp — Comments only for IG/FB
  const platform = conversation?.platform ?? 'whatsapp'
  const isWA = platform === 'whatsapp'
  const [activeTab, setActiveTab] = useState<'messages' | 'notes' | 'comments'>('messages')
  const [status, setStatus] = useState<'open' | 'pending' | 'closed'>('open')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Reset to messages tab when switching conversations
  useEffect(() => { setActiveTab('messages') }, [activeConversationId])

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

    // Mark as read
    await supabase.from('conversations').update({ unread_count: 0 }).eq('id', activeConversationId)
    updateConversation(activeConversationId, { unread_count: 0 })
  }, [activeConversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conversation) return
    setStatus(conversation.status as 'open' | 'pending' | 'closed')
  }, [conversation?.status])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Realtime subscription with reconnect handler
  useEffect(() => {
    if (!activeConversationId) return

    const ch = supabase
      .channel(`msg-${activeConversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        const msg = payload.new as Message
        // Don't add temp/optimistic messages via realtime
        if (!msg.id.startsWith('temp-')) addMessage(msg)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        updateMessage(payload.new.id, payload.new as Partial<Message>)
      })
      .subscribe((status) => {
        // KEY FIX: When realtime reconnects, reload all messages
        // This catches any messages that arrived during a connection gap
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to messages, reloading...')
          loadMessages()
        }
      })

    return () => { supabase.removeChannel(ch) }
  }, [activeConversationId, loadMessages]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages.length])

  async function cycleStatus() {
    if (!activeConversationId) return
    const idx = STATUS_CYCLE.indexOf(status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    setStatus(next)
    await supabase.from('conversations').update({ status: next }).eq('id', activeConversationId)
    updateConversation(activeConversationId, { status: next })
  }

  if (!conversation) return null

  const contactName = conversation.contact?.name
    || conversation.contact?.phone
    || conversation.contact?.instagram_username
    || 'Unknown'

  const platformIcon = { whatsapp: 'fa-brands fa-whatsapp', instagram: 'fa-brands fa-instagram', facebook: 'fa-brands fa-facebook' }[platform]
  const platformCls  = { whatsapp: 'pp-wa', instagram: 'pp-ig', facebook: 'pp-fb' }[platform]
  const platformLabel = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook' }[platform]
  const badgeCls     = { whatsapp: 'pb-wa', instagram: 'pb-ig', facebook: 'pb-fb' }[platform]

  // Build date-grouped + message-grouped display
  interface DateGroup { date: string; msgs: Message[] }
  const dateGroups: DateGroup[] = []
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

  // Tabs: WhatsApp only shows Messages + Notes. IG/FB also show Comments.
  const tabs = isWA
    ? (['messages', 'notes'] as const)
    : (['messages', 'notes', 'comments'] as const)

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
              <span className={`platform-pill-sm ${platformCls}`}>
                <i className={platformIcon} /> {platformLabel}
              </span>
              {conversation.status === 'open' && (
                <span style={{ color: 'var(--accent)', fontSize: 11 }}>● Online</span>
              )}
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
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'messages' && <><i className="fa-solid fa-message" /> Messages</>}
            {tab === 'notes' && (
              <>
                <i className="fa-solid fa-note-sticky" /> Notes
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

      {/* Messages */}
      <div className="workspace-content">
        {activeTab === 'notes' && (
          <div className="note-intro"><i className="fa-solid fa-lock" /> Internal notes — never sent to customer.</div>
        )}

        {dateGroups.length === 0 ? (
          <div className="empty-state">
            <i className="fa-brands fa-whatsapp" style={{ fontSize: 48, opacity: 0.15 }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {activeTab === 'messages' ? 'No messages yet. Send the first message below.' :
               activeTab === 'notes'    ? 'No notes yet.' : 'No comments yet.'}
            </p>
          </div>
        ) : (
          dateGroups.map(group => (
            <div key={group.date}>
              <div className="date-divider"><span>{group.date}</span></div>
              {group.msgs.map((msg, i) => {
                const prev = group.msgs[i - 1]
                const next = group.msgs[i + 1]
                const isFirstInGroup = !prev || prev.direction !== msg.direction
                  || new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000
                const isLastInGroup = !next || next.direction !== msg.direction
                  || new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() > 5 * 60 * 1000
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                  />
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input areas */}
      {activeTab === 'messages' && <InputArea onMessageSent={loadMessages} />}
      {activeTab === 'notes' && <NoteInput conversationId={activeConversationId!} onSaved={loadMessages} />}
      {activeTab === 'comments' && <CommentReplyInput onSaved={loadMessages} />}
    </div>
  )
}

function NoteInput({ conversationId, onSaved }: { conversationId: string; onSaved: () => void }) {
  const [text, setText] = useState('')
  const supabase = createClient()

  async function save() {
    if (!text.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!profile) return
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      workspace_id: profile.workspace_id,
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

function CommentReplyInput({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState('')
  return (
    <div className="notes-input-area">
      <div className="input-row">
        <textarea
          className="input-box"
          placeholder="Write a public reply to the comment…"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={1}
        />
        <button className="send-btn"><i className="fa-solid fa-paper-plane" /></button>
      </div>
    </div>
  )
}