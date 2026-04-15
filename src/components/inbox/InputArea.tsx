'use client'
import { useState, useRef, useEffect } from 'react'
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

interface Props {
  onMessageSent: () => void
}

export default function InputArea({ onMessageSent }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()
  const { activeConversationId, addMessage } = useInboxStore()
  const conversation = useActiveConversation()

  // Load templates when panel opens
  useEffect(() => {
    if (!showTemplates || templatesLoaded) return
    loadTemplates()
  }, [showTemplates])

  async function loadTemplates() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!profile) return

    const { data } = await supabase
      .from('templates')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .in('platform', ['whatsapp'])
      .in('status', ['approved', 'draft']) // draft for testing
      .order('name')

    // Always include hello_world for testing
    const allTemplates = data ?? []
    const hasHelloWorld = allTemplates.some(t => t.name.toLowerCase().includes('hello'))
    if (!hasHelloWorld) {
      allTemplates.unshift({
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

    setTemplates(allTemplates)
    setTemplatesLoaded(true)
  }

  async function sendText() {
    if (!text.trim() || !activeConversationId || sending) return
    const body = text.trim()
    setText('')
    setSending(true)

    // Optimistic update
    addMessage({
      id: `temp-${Date.now()}`,
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
        body: JSON.stringify({
          conversation_id: activeConversationId,
          body,
          type: 'text',
        }),
      })
      const json = await res.json()
      if (!res.ok) console.error('[Send] Error:', json)
      else onMessageSent()
    } catch (err) {
      console.error('[Send] Failed:', err)
    } finally {
      setSending(false)
    }
  }

  async function sendTemplate(template: Template) {
    if (!activeConversationId || sending) return
    setSending(true)
    setShowTemplates(false)

    // Optimistic message
    addMessage({
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId,
      workspace_id: '',
      external_id: null,
      direction: 'outbound',
      content_type: 'template',
      body: `[Template: ${template.name}]`,
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
          template_language: template.language || 'en_US',
        }),
      })
      const json = await res.json()
      if (!res.ok) console.error('[Template Send] Error:', json)
      else {
        console.log('[Template Send] ✅ Sent:', template.name)
        onMessageSent()
      }
    } catch (err) {
      console.error('[Template Send] Failed:', err)
    } finally {
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

  const isWhatsApp = conversation?.platform === 'whatsapp'
  const platformLabel = conversation
    ? { whatsapp: 'WhatsApp', instagram: 'Instagram DM', facebook: 'Facebook' }[conversation.platform]
    : 'message'

  const filteredTemplates = templates.filter(t =>
    !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.body.toLowerCase().includes(templateSearch.toLowerCase())
  )

  return (
    <div className="chat-input-area" style={{ position: 'relative' }}>
      {/* Template Panel */}
      {showTemplates && (
        <div className="templates-panel open">
          <div className="templates-header">
            <span><i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', marginRight: 5 }} />Templates</span>
            <input
              type="text"
              className="tpl-search"
              placeholder="Search templates…"
              value={templateSearch}
              onChange={e => setTemplateSearch(e.target.value)}
              autoFocus
            />
            <button className="icon-btn" onClick={() => setShowTemplates(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {!templatesLoaded ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              Loading templates…
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No templates found.{' '}
              <a href="/templates" style={{ color: 'var(--accent)' }}>Create one →</a>
            </div>
          ) : (
            filteredTemplates.map(t => (
              <div
                key={t.id}
                className="tpl-item"
                onClick={() => sendTemplate(t)}
              >
                <div className="tpl-name">
                  {t.name}
                  <span className="tpl-tag">{t.category}</span>
                  <span style={{ fontSize: 10, color: t.status === 'approved' ? 'var(--accent)' : 'var(--accent3)', marginLeft: 'auto' }}>
                    {t.status}
                  </span>
                </div>
                <div className="tpl-body">{t.body}</div>
              </div>
            ))
          )}
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
        <button className="tool-btn" title="Emoji">
          <i className="fa-regular fa-face-smile" />
        </button>
        <button className="tool-btn" title="Attach file">
          <i className="fa-solid fa-paperclip" />
        </button>
        <button
          className="tool-btn"
          title={isWhatsApp ? 'Templates (WhatsApp only)' : 'Templates only available on WhatsApp'}
          style={{ color: isWhatsApp ? 'var(--accent)' : 'var(--text-muted)' }}
          onClick={() => { if (isWhatsApp) setShowTemplates(v => !v) }}
          disabled={!isWhatsApp}
        >
          <i className="fa-solid fa-bolt" />
        </button>
        <button className="tool-btn" title="AI Compose" style={{ color: 'var(--accent)' }}>
          <i className="fa-solid fa-wand-magic-sparkles" />
        </button>

        {/* WhatsApp-specific notice */}
        {isWhatsApp && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }} />
            24hr window active
          </span>
        )}
      </div>

      {/* Input row */}
      <div className="input-row">
        <textarea
          ref={textRef}
          className="input-box"
          placeholder={`Type a message via ${platformLabel}… (Enter to send)`}
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
          title="Send message"
          style={{ opacity: (sending || !text.trim()) ? 0.5 : 1 }}
        >
          {sending
            ? <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }} />
            : <i className="fa-solid fa-paper-plane" />
          }
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
