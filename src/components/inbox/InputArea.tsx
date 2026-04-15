'use client'
import { useState, useRef } from 'react'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { createClient } from '@/lib/supabase/client'

const QUICK_REPLIES = [
  'Sending details now',
  'Order is confirmed ✓',
  "We'll follow up shortly",
  'Please share your order ID',
  'Thank you for your purchase!',
]

interface Props {
  onMessageSent: () => void
}

export default function InputArea({ onMessageSent }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()
  const { activeConversationId, addMessage } = useInboxStore()
  const conversation = useActiveConversation()

  async function sendMessage() {
    if (!text.trim() || !activeConversationId || sending) return
    const body = text.trim()
    setText('')
    setSending(true)

    // Optimistic message
    const tempId = `temp-${Date.now()}`
    addMessage({
      id: tempId,
      conversation_id: activeConversationId,
      workspace_id: '',
      external_id: null,
      direction: 'outbound',
      content_type: 'text',
      body,
      media_url: null,
      media_mime: null,
      sender_id: null,
      status: 'queued',
      is_note: false,
      meta: {},
      created_at: new Date().toISOString(),
    })

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: activeConversationId, body, type: 'text' }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Send error:', err)
      }
      onMessageSent()
    } catch (err) {
      console.error('Send failed:', err)
    } finally {
      setSending(false)
    }
  }

  async function sendNote() {
    if (!text.trim() || !activeConversationId) return
    const body = text.trim()
    setText('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!profile) return

    await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      workspace_id: profile.workspace_id,
      direction: 'outbound',
      content_type: 'text',
      body,
      is_note: true,
      status: 'sent',
      sender_id: session.user.id,
    })
    onMessageSent()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function autoResize() {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const platformLabel = conversation
    ? { whatsapp: 'WhatsApp', instagram: 'Instagram DM', facebook: 'Facebook' }[conversation.platform]
    : 'message'

  return (
    <div className="chat-input-area">
      {/* Quick replies */}
      <div className="quick-replies">
        {QUICK_REPLIES.map(r => (
          <div key={r} className="quick-reply" onClick={() => { setText(r); textRef.current?.focus() }}>
            {r}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="input-toolbar">
        <button className="tool-btn" title="Emoji">
          <i className="fa-regular fa-face-smile" />
        </button>
        <button className="tool-btn" title="Attach file">
          <i className="fa-solid fa-paperclip" />
        </button>
        <button className="tool-btn" title="Templates">
          <i className="fa-solid fa-bolt" />
        </button>
        <button
          className="tool-btn"
          title="AI Compose"
          style={{ color: 'var(--accent)' }}
        >
          <i className="fa-solid fa-wand-magic-sparkles" />
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="tool-btn" title="Add note" onClick={sendNote}>
            <i className="fa-solid fa-note-sticky" style={{ color: 'var(--accent3)' }} />
          </button>
        </div>
      </div>

      {/* Input row */}
      <div className="input-row">
        <textarea
          ref={textRef}
          className="input-box"
          placeholder={`Type a message via ${platformLabel}… (Enter to send, Shift+Enter for new line)`}
          value={text}
          onChange={e => { setText(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
        />
        <button className="voice-btn" title="Voice note">
          <i className="fa-solid fa-microphone" />
        </button>
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={sending || !text.trim()}
          title="Send"
        >
          <i className="fa-solid fa-paper-plane" />
        </button>
      </div>
    </div>
  )
}