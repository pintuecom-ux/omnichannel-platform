'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { createClient } from '@/lib/supabase/client'
import type { Template } from '@/types'

const QUICK_REPLIES = [
  'Sending details now',
  'Order is confirmed ✓',
  "We'll follow up shortly",
  'Please share your order ID',
  'Thank you for your purchase!',
]

interface Props { onMessageSent: () => void }

export default function InputArea({ onMessageSent }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateSearch, setTemplateSearch] = useState('')
  const [tplLoading, setTplLoading] = useState(false)
  const [tplError, setTplError] = useState('')
  // Use ref to prevent double-send race condition
  const isSendingRef = useRef(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()
  const { activeConversationId, addMessage } = useInboxStore()
  const conversation = useActiveConversation()

  // Reset template state when conversation changes
  useEffect(() => {
    setShowTemplates(false)
    setTemplates([])
    setTplError('')
  }, [activeConversationId])

  const loadTemplates = useCallback(async () => {
    if (tplLoading) return
    setTplLoading(true)
    setTplError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', session.user.id)
        .single()
      if (!profile) return

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('workspace_id', profile.workspace_id)
        .eq('platform', 'whatsapp')
        .in('status', ['approved', 'draft'])
        .order('name')

      if (error) {
        console.error('[Templates] Load error:', error.message)
        setTplError(`Could not load templates: ${error.message}`)
      }

      const list: Template[] = data ?? []

      // Always inject hello_world as a built-in fallback
      const hasHello = list.some(t => t.name === 'hello_world')
      if (!hasHello) {
        list.unshift({
          id: 'builtin-hello-world',
          workspace_id: profile.workspace_id,
          platform: 'whatsapp',
          name: 'hello_world',
          category: 'Utility',
          language: 'en_US',
          body: 'Hello! This is a test message from React Commerce.',
          header_text: null,
          footer_text: null,
          status: 'approved',
          meta_template_id: 'hello_world',
          variables: [],
          created_at: new Date().toISOString(),
        } as Template)
      }

      setTemplates(list)
    } finally {
      setTplLoading(false)
    }
  }, [tplLoading])

  useEffect(() => {
    if (showTemplates && templates.length === 0) {
      loadTemplates()
    }
  }, [showTemplates])

  async function sendText() {
    // Use ref to prevent race condition double-sends
    if (!text.trim() || !activeConversationId || isSendingRef.current) return
    isSendingRef.current = true
    setSending(true)

    const body = text.trim()
    setText('')
    if (textRef.current) textRef.current.style.height = 'auto'

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
      const json = await res.json()
      if (!res.ok) {
        console.error('[Send] Failed:', json.error)
        setSendError(json.error)
        setTimeout(() => setSendError(null), 6000)
      } else {
        setSendError(null)
        onMessageSent()
      }
    } catch (err) {
      console.error('[Send] Network error:', err)
    } finally {
      isSendingRef.current = false
      setSending(false)
    }
  }

  async function sendTemplate(template: Template) {
    if (!activeConversationId || isSendingRef.current) return
    isSendingRef.current = true
    setSending(true)
    setShowTemplates(false)

    addMessage({
      id: `temp-tpl-${Date.now()}`,
      conversation_id: activeConversationId,
      workspace_id: '',
      external_id: null,
      direction: 'outbound',
      content_type: 'template',
      body: template.body,
      media_url: null,
      media_mime: null,
      sender_id: null,
      status: 'queued',
      is_note: false,
      meta: { template_name: template.name },
      created_at: new Date().toISOString(),
    })

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          body: template.body,
          type: 'template',
          template_name: template.name,
          template_language: template.language ?? 'en_US',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[Template Send] Failed:', json.error)
        setSendError(json.error)
        setTimeout(() => setSendError(null), 6000)
      } else {
        console.log('[Template Send] ✅', template.name)
        onMessageSent()
      }
    } catch (err) {
      console.error('[Template Send] Network error:', err)
    } finally {
      isSendingRef.current = false
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendText()
    }
  }

  function autoResize() {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const isWA = conversation?.platform === 'whatsapp'
  const platformLabel = conversation
    ? ({ whatsapp: 'WhatsApp', instagram: 'Instagram DM', facebook: 'Facebook' })[conversation.platform]
    : 'message'

  const filteredTpls = templates.filter(t =>
    !templateSearch ||
    t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.body.toLowerCase().includes(templateSearch.toLowerCase())
  )

  return (
    <div className="chat-input-area" style={{ position: 'relative' }}>

      {/* Template panel */}
      {showTemplates && (
        <div className="templates-panel open">
          <div className="templates-header">
            <span>
              <i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', marginRight: 5 }} />
              Templates
            </span>
            <input
              className="tpl-search"
              type="text"
              placeholder="Search templates…"
              value={templateSearch}
              onChange={e => setTemplateSearch(e.target.value)}
              autoFocus
            />
            <button className="icon-btn" onClick={() => setShowTemplates(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {tplLoading && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />
              Loading templates…
            </div>
          )}
          {!tplLoading && tplError && (
            <div style={{ padding: 16, fontSize: 12, color: '#e84040' }}>
              {tplError}
              <button onClick={loadTemplates} style={{ marginLeft: 8, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                Retry
              </button>
            </div>
          )}
          {!tplLoading && !tplError && filteredTpls.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No templates found.{' '}
              <a href="/templates" style={{ color: 'var(--accent)' }}>Create one →</a>
            </div>
          )}
          {!tplLoading && filteredTpls.map(t => (
            <div key={t.id} className="tpl-item" onClick={() => sendTemplate(t)}>
              <div className="tpl-name">
                <i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', fontSize: 10, marginRight: 4 }} />
                {t.name}
                <span className="tpl-tag" style={{ marginLeft: 8 }}>{t.category}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: t.status === 'approved' ? 'var(--accent)' : 'var(--accent3)' }}>
                  {t.status}
                </span>
              </div>
              <div className="tpl-body">{t.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Send error banner */}
      {sendError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', background: 'rgba(232,64,64,0.12)',
          borderTop: '1px solid rgba(232,64,64,0.25)',
          fontSize: 12, color: '#e84040',
        }}>
          <i className="fa-solid fa-circle-exclamation" />
          <span style={{ flex: 1 }}>{sendError}</span>
          <button onClick={() => setSendError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e84040', padding: 0 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

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
        <button className="tool-btn" title="Emoji"><i className="fa-regular fa-face-smile" /></button>
        <button className="tool-btn" title="Attach"><i className="fa-solid fa-paperclip" /></button>
        <button
          className="tool-btn"
          title={isWA ? 'Templates' : 'Templates — WhatsApp only'}
          style={{ color: isWA ? 'var(--accent)' : 'var(--text-muted)', cursor: isWA ? 'pointer' : 'not-allowed' }}
          onClick={() => { if (isWA) setShowTemplates(v => !v) }}
        >
          <i className="fa-solid fa-bolt" />
        </button>
        <button className="tool-btn" style={{ color: 'var(--accent)' }} title="AI Compose">
          <i className="fa-solid fa-wand-magic-sparkles" />
        </button>
        {isWA && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }} /> 24hr window
          </span>
        )}
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
          onClick={sendText}
          disabled={sending || !text.trim()}
          title="Send"
          style={{ opacity: (sending || !text.trim()) ? 0.5 : 1 }}
        >
          {sending
            ? <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }} />
            : <i className="fa-solid fa-paper-plane" />
          }
        </button>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}