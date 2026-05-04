'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { createClient } from '@/lib/supabase/client'
import type { Template } from '@/types'
import { InputAttachmentPreview, type AttachPreview } from './InputAttachmentPreview'
import { InputEmojiPicker } from './InputEmojiPicker'
import { InputFlowSelector, type FlowItem } from './InputFlowSelector'
import { InputFlowModal } from './InputFlowModal'
import { InputTemplateSelector } from './InputTemplateSelector'
import { InputTemplateModal } from './InputTemplateModal'



const QUICK_REPLIES = [
  'Sending details now',
  'Order is confirmed ✓',
  "We'll follow up shortly",
  'Please share your order ID',
  'Thank you for your purchase!',
]

interface Props { onMessageSent: () => void }


export default function InputArea({ onMessageSent }: Props) {
  const [text,           setText]           = useState('')
  const [sending,        setSending]        = useState(false)
  const [showTemplates,  setShowTemplates]  = useState(false)
  const [showEmoji,      setShowEmoji]      = useState(false)
  const [showFlowPicker, setShowFlowPicker] = useState(false)
  const [emojiGroup,     setEmojiGroup]     = useState('😀')
  const [templates,      setTemplates]      = useState<Template[]>([])
  const [templateSearch, setTemplateSearch] = useState('')
  const [tplLoading,     setTplLoading]     = useState(false)
  const [tplError,       setTplError]       = useState('')
  const [varModal, setVarModal] = useState<{
    open: boolean; template: Template | null; vars: string[]; values: string[]
  }>({ open: false, template: null, vars: [], values: [] })

  // Attachment preview
  const [attachPreview,  setAttachPreview]  = useState<AttachPreview | null>(null)
  const [attachCaption,  setAttachCaption]  = useState('')
  // Voice recording
  const [recording,      setRecording]      = useState(false)
  const [recordTime,     setRecordTime]     = useState(0)
  const mrRef     = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<NodeJS.Timeout | null>(null)

  // Flows
  const [flows,       setFlows]       = useState<FlowItem[]>([])
  const [flowLoading, setFlowLoading] = useState(false)
  // Flow send modal state
  const [flowSendModal, setFlowSendModal] = useState<{
    open: boolean; flow: FlowItem | null; bodyText: string; ctaText: string; mode: 'draft' | 'published'
  }>({ open: false, flow: null, bodyText: '', ctaText: 'Open', mode: 'published' })

  const isSendingRef = useRef(false)
  const textRef      = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase     = createClient()

  const { activeConversationId, addMessage, replyToMessage, setReplyTo } = useInboxStore()
  const conversation = useActiveConversation()

  // Reset state when conversation changes
  useEffect(() => {
    setShowTemplates(false)
    setShowEmoji(false)
    setShowFlowPicker(false)
    setTemplates([])
    setTplError('')
    setAttachPreview(null)
    setReplyTo(null)
  }, [activeConversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return
    const h = (e: MouseEvent) => {
      if (!(document.getElementById('emoji-picker')?.contains(e.target as Node))) setShowEmoji(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showEmoji])

  // ── Load templates ──────────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    if (tplLoading) return
    setTplLoading(true); setTplError('')
    try {
      const res  = await fetch('/api/templates')
      const json = await res.json()
      const list: Template[] = json.templates ?? []
      if (!list.some(t => t.name === 'hello_world')) {
        const { data: { session } } = await supabase.auth.getSession()
        const { data: p } = session
          ? await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
          : { data: null }
        if (p) {
          list.unshift({
            id: 'builtin-hw', workspace_id: p.workspace_id, platform: 'whatsapp',
            name: 'hello_world', category: 'Utility', language: 'en_US',
            body: 'Hello! This is a test message from React Commerce.',
            header_text: null, footer_text: null, status: 'approved',
            meta_template_id: 'hello_world', variables: [], created_at: '',
          } as Template)
        }
      }
      setTemplates(list)
    } catch { setTplError('Failed to load templates') }
    finally { setTplLoading(false) }
  }, [tplLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showTemplates && !templates.length) loadTemplates()
  }, [showTemplates]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load flows ──────────────────────────────────────────────────────────────
  const loadFlows = useCallback(async () => {
    if (flowLoading || flows.length > 0) return
    setFlowLoading(true)
    try {
      const res  = await fetch('/api/flows')
      const json = await res.json()
      setFlows((json.flows ?? []).filter((f: FlowItem) => ['DRAFT', 'PUBLISHED'].includes(f.status?.toUpperCase())))
    } catch { /* ignore */ }
    finally { setFlowLoading(false) }
  }, [flowLoading, flows.length])

  useEffect(() => {
    if (showFlowPicker) loadFlows()
  }, [showFlowPicker]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Template helpers ────────────────────────────────────────────────────────
  function extractVars(t: Template) {
    return [...new Set([...(t.body ?? '').matchAll(/\{\{(\d+|[a-z_]+)\}\}/g)].map(m => m[0]))]
  }

  function pickTemplate(t: Template) {
    const vars = extractVars(t)
    const isOTP = t.meta?.template_type === 'AUTHENTICATION' || t.category?.toUpperCase() === 'AUTHENTICATION'
    if (isOTP) {
      // OTP auth templates need the OTP code as the only variable
      setVarModal({ open: true, template: t, vars: ['OTP Code'], values: [''] })
    } else if (vars.length > 0) {
      setVarModal({ open: true, template: t, vars, values: vars.map(() => '') })
    } else {
      sendTemplate(t, [])
    }
    setShowTemplates(false)
  }

  // ── File attach ─────────────────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const mime = file.type
    const type: AttachPreview['type'] =
      mime.startsWith('image/') ? 'image'
      : mime.startsWith('video/') ? 'video'
      : mime.startsWith('audio/') ? 'audio'
      : 'document'
    setAttachPreview({ file, url: URL.createObjectURL(file), type })
    setAttachCaption(text)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function cancelAttach() {
    if (attachPreview) URL.revokeObjectURL(attachPreview.url)
    setAttachPreview(null)
    setAttachCaption('')
  }

  async function sendAttachment() {
    if (!attachPreview || !activeConversationId || isSendingRef.current) return
    isSendingRef.current = true; setSending(true)
    const { file, type } = attachPreview
    addOptimistic(type, attachCaption || file.name)
    const form = new FormData()
    form.append('conversation_id', activeConversationId)
    form.append('type', 'media')
    form.append('file', file)
    form.append('filename', file.name)
    if (attachCaption.trim()) form.append('body', attachCaption.trim())
    if (replyToMessage?.external_id) form.append('reply_to_external_id', replyToMessage.external_id)
    try {
      const res  = await fetch('/api/messages/send', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) alert(`Send failed: ${json.error}`)
      else { cancelAttach(); setText(''); setReplyTo(null); onMessageSent() }
    } finally { isSendingRef.current = false; setSending(false) }
  }

  // ── Send text ────────────────────────────────────────────────────────────────
  async function sendText() {
    if (!text.trim() || !activeConversationId || isSendingRef.current) return
    isSendingRef.current = true; setSending(true)
    const body = text.trim()
    const replyId = replyToMessage?.external_id ?? null
    setText('')
    if (textRef.current) textRef.current.style.height = 'auto'
    addOptimistic('text', body, replyId ? { reply_to_external_id: replyId } : {})
    setReplyTo(null)
    try {
      const res  = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          body,
          type: 'text',
          reply_to_external_id: replyId,
        }),
      })
      const json = await res.json()
      if (!res.ok) setText(`[FAILED: ${json.error}]`)
      else onMessageSent()
    } finally { isSendingRef.current = false; setSending(false) }
  }

  // ── Send template ────────────────────────────────────────────────────────────
  async function sendTemplate(template: Template, vals: string[]) {
    if (!activeConversationId || isSendingRef.current) return
    isSendingRef.current = true; setSending(true)

    const isOTP = template.meta?.template_type === 'AUTHENTICATION' || template.category?.toUpperCase() === 'AUTHENTICATION'
    let components: any[]

    if (isOTP && vals[0]) {
      // OTP Copy Code button: requires button component with coupon_code parameter
      components = [{
        type: 'button',
        sub_type: 'copy_code',
        index: '0',
        parameters: [{ type: 'coupon_code', coupon_code: vals[0] }],
      }]
    } else {
      components = vals.some(v => v)
        ? [{ type: 'body', parameters: vals.map(v => ({ type: 'text', text: v || '' })) }]
        : []
    }

    // Build preview (for OTP just use a placeholder)
const templateBody = template.body ?? ''

const preview: string = isOTP
  ? `[OTP Authentication — code: ${vals[0] || '******'}]`
  : extractVars(template).reduce(
      (b, v, i) => b.replaceAll(v, vals[i] || v),
      templateBody
    )

    addOptimistic('template', preview, { template_name: template.name })

    try {
      const res  = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id:    activeConversationId,
          body:               preview,
          type:               'template',
          template_name:      template.name,
          template_language:  template.language ?? 'en_US',
          template_components: components,
          otp_code:           isOTP ? (vals[0] || null) : null,
          reply_to_external_id: replyToMessage?.external_id ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) alert(`Template failed: ${json.error}`)
      else { setReplyTo(null); onMessageSent() }
    } finally { isSendingRef.current = false; setSending(false) }
  }

  // ── Send flow from inbox ─────────────────────────────────────────────────────
  async function sendFlow() {
    const { flow, bodyText, ctaText, mode } = flowSendModal
    if (!flow || !bodyText.trim() || !activeConversationId || isSendingRef.current) return
    isSendingRef.current = true; setSending(true)
    const flowToken = `flow_${flow.meta_flow_id ?? flow.id}_${Date.now()}`
    addOptimistic('flow', bodyText, { flow_cta: ctaText, flow_mode: mode })
    try {
      const res  = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id:     activeConversationId,
          type:                'flow',
          body:                bodyText,
          flow_id:             flow.meta_flow_id || undefined,
          flow_name:           !flow.meta_flow_id ? flow.name : undefined,
          flow_token:          flowToken,
          flow_cta:            ctaText,
          flow_mode:           mode,
          reply_to_external_id: replyToMessage?.external_id ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) alert(`Flow send failed: ${json.error}`)
      else {
        setFlowSendModal({ open: false, flow: null, bodyText: '', ctaText: 'Open', mode: 'published' })
        setShowFlowPicker(false)
        setReplyTo(null)
        onMessageSent()
      }
    } finally { isSendingRef.current = false; setSending(false) }
  }

  // ── Voice recording ──────────────────────────────────────────────────────────
  async function toggleRec() {
    if (recording) {
      mrRef.current?.stop()
      clearInterval(timerRef.current!)
      setRecording(false)
      setRecordTime(0)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        chunksRef.current = []
        mr.ondataavailable = e => chunksRef.current.push(e.data)
        mr.onstop = async () => {
          stream.getTracks().forEach(t => t.stop())
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
          setAttachPreview({ file, url: URL.createObjectURL(blob), type: 'audio' })
        }
        mr.start(); mrRef.current = mr; setRecording(true)
        let s = 0
        timerRef.current = setInterval(() => {
          s++; setRecordTime(s)
          if (s >= 120) { mr.stop(); clearInterval(timerRef.current!); setRecording(false); setRecordTime(0) }
        }, 1000)
      } catch { alert('Microphone permission denied') }
    }
  }

  // ── Typing indicator ─────────────────────────────────────────────────────────
  const typingDebounce = useRef<NodeJS.Timeout | null>(null)
  function handleTyping() {
    if (typingDebounce.current) return
    // Fire typing indicator for the most recent inbound message
    const { messages } = useInboxStore.getState()
    const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound' && m.external_id)
    if (lastInbound?.external_id && activeConversationId) {
      fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: activeConversationId, message_id: lastInbound.external_id }),
      }).catch(() => {})
    }
    typingDebounce.current = setTimeout(() => { typingDebounce.current = null }, 8000)
  }

  // ── Optimistic message ───────────────────────────────────────────────────────
  function addOptimistic(ctype: string, body: string, meta: any = {}) {
    if (!activeConversationId) return
    addMessage({
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId,
      workspace_id: '',
      external_id: null,
      direction: 'outbound',
      content_type: ctype as any,
      body,
      media_url: null,
      media_mime: null,
      sender_id: null,
      status: 'queued',
      is_note: false,
      meta,
      created_at: new Date().toISOString(),
    })
  }

  function handleKD(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() }
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
    (t.body ?? '').toLowerCase().includes(templateSearch.toLowerCase())
  )
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="chat-input-area" style={{ position: 'relative' }}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        onChange={handleFileSelect}
      />

      {/* ── Attachment Preview ── */}
      {attachPreview && (
        <InputAttachmentPreview
          attachPreview={attachPreview}
          attachCaption={attachCaption}
          setAttachCaption={setAttachCaption}
          sending={sending}
          sendAttachment={sendAttachment}
          cancelAttach={cancelAttach}
        />
      )}

      {/* ── Emoji Picker ── */}
      {showEmoji && (
        <InputEmojiPicker
          emojiGroup={emojiGroup}
          setEmojiGroup={setEmojiGroup}
          onEmojiSelect={(emoji) => { setText(t => t + emoji); textRef.current?.focus() }}
        />
      )}

      {/* ── Flow Picker ── */}
      {showFlowPicker && isWA && (
        <InputFlowSelector
          flows={flows}
          flowLoading={flowLoading}
          setShowFlowPicker={setShowFlowPicker}
          setFlowSendModal={setFlowSendModal}
        />
      )}

      {/* ── Flow Send Modal ── */}
      <InputFlowModal
        flowSendModal={flowSendModal}
        setFlowSendModal={setFlowSendModal}
        sendFlow={sendFlow}
        sending={sending}
      />

      {/* ── Template Panel ── */}
      {showTemplates && (
        <InputTemplateSelector
          templates={templates}
          templateSearch={templateSearch}
          setTemplateSearch={setTemplateSearch}
          tplLoading={tplLoading}
          tplError={tplError}
          setShowTemplates={setShowTemplates}
          pickTemplate={pickTemplate}
        />
      )}

      {/* ── Template Variable Modal ── */}
      <InputTemplateModal
        varModal={varModal}
        setVarModal={setVarModal}
        sendTemplate={sendTemplate}
      />

      {/* ── Quick Replies ── */}
      <div className="quick-replies">
        {QUICK_REPLIES.map(r => (
          <div key={r} className="quick-reply" onClick={() => { setText(r); textRef.current?.focus() }}>{r}</div>
        ))}
      </div>

      {/* ── Reply Bar ── */}
      {replyToMessage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)',
        }}>
          <i className="fa-solid fa-reply" style={{ color: 'var(--accent)', fontSize: 12, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>
              Replying to {replyToMessage.direction === 'outbound' ? 'yourself' : (replyToMessage.meta?.from_name ?? 'Contact')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyToMessage.body ?? `[${replyToMessage.content_type}]`}
            </div>
          </div>
          <button onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
            <i className="fa-solid fa-xmark" style={{ fontSize: 13 }} />
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="input-toolbar">
        <button className="tool-btn" title="Emoji"
          style={{ color: showEmoji ? 'var(--accent)' : undefined }}
          onClick={() => setShowEmoji(v => !v)}>
          <i className="fa-regular fa-face-smile" />
        </button>
        <button className="tool-btn" title="Attach file" onClick={() => fileInputRef.current?.click()} disabled={sending}>
          <i className="fa-solid fa-paperclip" />
        </button>
        <button className="tool-btn"
          title={isWA ? 'Templates' : 'Templates — WhatsApp only'}
          style={{ color: isWA ? 'var(--accent)' : 'var(--text-muted)', cursor: isWA ? 'pointer' : 'not-allowed' }}
          onClick={() => { if (isWA) setShowTemplates(v => !v) }}>
          <i className="fa-solid fa-bolt" />
        </button>
        {/* Flow picker button */}
        <button className="tool-btn"
          title={isWA ? 'Send a WhatsApp Flow' : 'Flows — WhatsApp only'}
          style={{ color: isWA ? 'var(--accent2)' : 'var(--text-muted)', cursor: isWA ? 'pointer' : 'not-allowed' }}
          onClick={() => { if (isWA) setShowFlowPicker(v => !v) }}>
          <i className="fa-solid fa-diagram-project" />
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

      {/* ── Input Row ── */}
      <div className="input-row">
        <textarea
          ref={textRef}
          className="input-box"
          placeholder={recording ? `🔴 Recording… ${fmt(recordTime)}s (tap mic to stop)` : `Type via ${platformLabel}… (Enter to send)`}
          value={text}
          onChange={e => { setText(e.target.value); autoResize(); handleTyping() }}
          onKeyDown={handleKD}
          rows={1}
          disabled={sending || recording}
          style={recording ? { borderColor: 'rgba(232,64,64,0.5)', color: '#e84040' } : {}}
        />
        <button className="voice-btn" title={recording ? 'Stop recording' : 'Voice message'} onClick={toggleRec}
          style={recording ? { borderColor: '#e84040', color: '#e84040' } : {}}>
          <i className={`fa-solid ${recording ? 'fa-stop' : 'fa-microphone'}`} />
        </button>
        <button className="send-btn" onClick={sendText} disabled={sending || !text.trim() || recording}
          style={{ opacity: (sending || !text.trim() || recording) ? 0.5 : 1 }}>
          {sending
            ? <i className="fa-solid fa-spinner fa-spin" />
            : <i className="fa-solid fa-paper-plane" />}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
