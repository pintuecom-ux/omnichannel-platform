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

export default function ChatWindow() {
  const supabase = createClient()
  const { activeConversationId, messages, setMessages, addMessage, updateMessage, updateConversation } = useInboxStore()
  const conversation = useActiveConversation()
  const [activeTab, setActiveTab] = useState<'messages' | 'notes' | 'comments'>('messages')
  const [status, setStatus] = useState<'open' | 'pending' | 'closed'>('open')
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    if (!activeConversationId) return

    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, full_name, avatar_url, role, email, workspace_id, is_online, created_at)')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (data) setMessages(data as Message[])

    // Mark conversation as read
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', activeConversationId)

    updateConversation(activeConversationId, { unread_count: 0 })
  }, [activeConversationId])

  useEffect(() => {
    if (!conversation) return
    setStatus(conversation.status as 'open' | 'pending' | 'closed')
  }, [conversation?.status])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Subscribe to new messages for active conversation
  useEffect(() => {
    if (!activeConversationId) return

    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        const msg = payload.new as Message
        if (!msg.id.startsWith('temp-')) {
          addMessage(msg)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        updateMessage(payload.new.id, payload.new as Partial<Message>)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConversationId])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  const platform = conversation.platform
  const platformIcon = { whatsapp: 'fa-brands fa-whatsapp', instagram: 'fa-brands fa-instagram', facebook: 'fa-brands fa-facebook' }[platform]
  const platformCls = { whatsapp: 'pp-wa', instagram: 'pp-ig', facebook: 'pp-fb' }[platform]
  const platformLabel = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook' }[platform]
  const badgeCls = { whatsapp: 'pb-wa', instagram: 'pb-ig', facebook: 'pb-fb' }[platform]

  // Group messages by date for display
  const grouped: { date: string; msgs: Message[] }[] = []
  const displayMessages = messages.filter(m => {
    if (activeTab === 'notes') return m.is_note
    if (activeTab === 'comments') return m.content_type === 'comment'
    return !m.is_note && m.content_type !== 'comment'
  })

  for (const msg of displayMessages) {
    const d = formatMessageDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== d) grouped.push({ date: d, msgs: [msg] })
    else last.msgs.push(msg)
  }

  return (
    <div id="main-workspace">
      {/* Chat header */}
      <div className="chat-header">
        <div className="chat-contact">
          <div className="avatar-wrap">
            <div
              className="avatar"
              style={{ background: '#1a6b3a', width: 36, height: 36, fontSize: 13, fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
            >
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
                <span style={{ color: 'var(--accent)', fontSize: 11 }}>● Active</span>
              )}
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          <div className={`status-pill ${status}`} onClick={cycleStatus}>
            <i className="fa-solid fa-circle" style={{ fontSize: '7px' }} />
            <span>{STATUS_LABEL[status]}</span>
          </div>
          <button className="icon-btn cs-tooltip" data-tip="Calls — Coming Soon">
            <i className="fa-solid fa-phone" />
          </button>
          <button className="icon-btn cs-tooltip" data-tip="Video — Coming Soon">
            <i className="fa-solid fa-video" />
          </button>
          <button className="icon-btn" title="Search in chat">
            <i className="fa-solid fa-magnifying-glass" />
          </button>
          <button className="icon-btn" title="More options">
            <i className="fa-solid fa-ellipsis-vertical" />
          </button>
        </div>
      </div>

      {/* Workspace tabs */}
      <div className="workspace-tabs">
        {(['messages', 'notes', 'comments'] as const).map(tab => (
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
                <i className={platformIcon} style={{ color: platform === 'instagram' ? '#e1306c' : platform === 'facebook' ? '#1877f2' : 'var(--accent)' }} />
                {' '}Comments
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
          <div className="note-intro">
            <i className="fa-solid fa-lock" />
            Internal notes — visible to team members only. Never sent to customer.
          </div>
        )}

        {grouped.length === 0 ? (
          <div className="empty-state">
            <i className={`fa-brands ${platformIcon.replace('fa-brands ', '')}`} style={{ fontSize: 32, opacity: 0.2 }} />
            <p>
              {activeTab === 'messages' && 'No messages yet. Send the first message below.'}
              {activeTab === 'notes' && 'No internal notes yet.'}
              {activeTab === 'comments' && 'No comments to show for this contact.'}
            </p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <div className="date-divider"><span>{group.date}</span></div>
              {group.msgs.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {activeTab === 'messages' && <InputArea onMessageSent={loadMessages} />}

      {activeTab === 'notes' && (
        <NoteInput conversationId={activeConversationId!} onSaved={loadMessages} />
      )}

      {activeTab === 'comments' && (
        <CommentReplyInput conversationId={activeConversationId!} onSaved={loadMessages} />
      )}
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
          placeholder="Add an internal note… (Enter to save, Shift+Enter for new line)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } }}
          rows={1}
          style={{ borderColor: 'rgba(245,158,11,0.3)' }}
        />
        <button className="send-btn" style={{ background: 'var(--accent3)' }} onClick={save}>
          <i className="fa-solid fa-plus" />
        </button>
      </div>
    </div>
  )
}

function CommentReplyInput({ conversationId, onSaved }: { conversationId: string; onSaved: () => void }) {
  const [text, setText] = useState('')

  async function send() {
    if (!text.trim()) return
    // Will be wired to Instagram/Facebook reply API in Phase 1C
    alert('Comment reply: ' + text)
    setText('')
  }

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
        <button className="send-btn" onClick={send}>
          <i className="fa-solid fa-paper-plane" />
        </button>
      </div>
    </div>
  )
}