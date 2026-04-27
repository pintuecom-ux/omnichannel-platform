'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { createClient } from '@/lib/supabase/client'
import type { Template } from '@/types'

const EMOJI_GROUPS: Record<string, string[]> = {
  '😀': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤔','🤐','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','😵','🤯','😎','🤓','😕','😟','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','😤','😡','😠','🤬','😈','👿'],
  '👋': ['👋','🤚','🖐','✋','🖖','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','👏','🙌','🤝','🙏','💪','🫀','👀','👅','👄','🧠','💅','🤳'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','⭐','🌟','💫','✨','🎯','🏆','🥇','💯','🎉','🎊','🎁','🎈'],
  '🍕': ['🍕','🍔','🌮','🌯','🥙','🍜','🍝','🍛','🍲','🍱','🍣','🥟','🦞','🦀','🍗','🍖','🌭','🥪','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹'],
  '🚗': ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🛻','🚚','🚛','🏍','🛵','🚲','✈️','🚀','🛸','🚂','🚄','🚆'],
  '💡': ['💡','📱','💻','⌨️','🖥','📷','📸','📹','🎥','📺','📻','🎙','🔋','🔌','💊','🩺','🔬','🔭','🧬','🧪','🔑','🗝','🔐','🔒','🔓','🔨','🛡','💰','💳','💎','📡'],
  '✅': ['✅','❌','✔️','💯','⭐','🎯','🏆','🥇','🎖','🎗','🎫','🎟','🎲','🎮','🕹','🎰','🧩','🪀','🎳','🎱','🎲','🎯','🔥','💥','🌈','☀️','🌙','⚡','🌊','🌺','🌸','🍀','🌿'],
}

const QUICK_REPLIES = [
  'Sending details now',
  'Order is confirmed ✓',
  "We'll follow up shortly",
  'Please share your order ID',
  'Thank you for your purchase!',
]

interface Props { onMessageSent: () => void }
interface AttachPreview { file: File; url: string; type: 'image' | 'video' | 'audio' | 'document' }

// Flow picker data — fetched once from /api/flows
interface FlowItem { id: string; meta_flow_id: string | null; name: string; status: string }

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
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', padding: 16, zIndex: 150 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ flexShrink: 0 }}>
              {attachPreview.type === 'image' && <img src={attachPreview.url} alt="preview" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8 }} />}
              {attachPreview.type === 'video' && <video src={attachPreview.url} style={{ width: 120, height: 90, borderRadius: 8, objectFit: 'cover' }} />}
              {attachPreview.type === 'audio' && (
                <div style={{ width: 120, height: 60, background: 'var(--bg-surface)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-microphone" style={{ fontSize: 28, color: 'var(--accent)' }} />
                </div>
              )}
              {attachPreview.type === 'document' && (
                <div style={{ width: 80, height: 80, background: '#e84040', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <i className="fa-solid fa-file" style={{ fontSize: 24, color: '#fff' }} />
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{attachPreview.file.name.split('.').pop()?.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{attachPreview.file.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                {(attachPreview.file.size / 1024 / 1024).toFixed(2)} MB
              </div>
              {['image', 'video', 'document'].includes(attachPreview.type) && (
                <input className="form-input" style={{ fontSize: 13 }}
                  placeholder="Add a caption (optional)…"
                  value={attachCaption}
                  onChange={e => setAttachCaption(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendAttachment() }}
                  autoFocus
                />
              )}
              {attachPreview.type === 'audio' && (
                <audio src={attachPreview.url} controls style={{ width: '100%', marginTop: 4 }} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="send-btn" onClick={sendAttachment} disabled={sending}>
                {sending ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
              </button>
              <button onClick={cancelAttach}
                style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-xmark" style={{ fontSize: 14 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Emoji Picker ── */}
      {showEmoji && (
        <div id="emoji-picker"
          style={{ position: 'absolute', bottom: '100%', left: 0, width: 300, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', zIndex: 200 }}>
          <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', padding: '4px 6px', gap: 2 }}>
            {Object.keys(EMOJI_GROUPS).map(g => (
              <button key={g} onClick={() => setEmojiGroup(g)}
                style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 16, background: emojiGroup === g ? 'var(--bg-active)' : 'none', fontFamily: 'inherit' }}>
                {g}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '8px', maxHeight: 200, overflowY: 'auto' }}>
            {EMOJI_GROUPS[emojiGroup]?.map(emoji => (
              <button key={emoji} onClick={() => { setText(t => t + emoji); textRef.current?.focus() }}
                style={{ fontSize: 22, padding: '3px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none', lineHeight: 1, fontFamily: 'inherit' }}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Flow Picker ── */}
      {showFlowPicker && isWA && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px 12px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', zIndex: 200, maxHeight: 320, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              <i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent2)', marginRight: 6 }} />
              Send a WhatsApp Flow
            </span>
            <button className="icon-btn" onClick={() => setShowFlowPicker(false)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {flowLoading && (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Loading flows…
              </div>
            )}
            {!flowLoading && flows.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                No active flows. <a href="/flows" style={{ color: 'var(--accent2)' }}>Create one →</a>
              </div>
            )}
            {!flowLoading && flows.map(f => (
              <div key={f.id}
                onClick={() => {
                  setFlowSendModal({ open: true, flow: f, bodyText: `Check out: ${f.name}`, ctaText: 'Open', mode: f.status === 'PUBLISHED' ? 'published' : 'draft' })
                  setShowFlowPicker(false)
                }}
                style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'none' }}
              >
                <i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent2)', fontSize: 13, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: f.status === 'PUBLISHED' ? 'var(--accent)' : 'var(--accent3)' }}>
                    ● {f.status}
                    {f.status === 'DRAFT' && ' — test only'}
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Flow Send Modal ── */}
      {flowSendModal.open && flowSendModal.flow && (
        <div className="tpl-modal-overlay open" onClick={() => setFlowSendModal(v => ({ ...v, open: false }))}>
          <div className="tpl-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent2)', marginRight: 6 }} />
                Send Flow — {flowSendModal.flow.name}
              </div>
              <button className="icon-btn" onClick={() => setFlowSendModal(v => ({ ...v, open: false }))}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="tpl-modal-body">
              {flowSendModal.flow.status === 'DRAFT' && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: 'var(--accent3)', marginBottom: 12 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 5 }} />Draft mode — only test numbers can receive this
                </div>
              )}
              <div className="form-group">
                <div className="form-label">Message Body *</div>
                <textarea className="form-input" rows={2} style={{ resize: 'none' }}
                  value={flowSendModal.bodyText}
                  onChange={e => setFlowSendModal(v => ({ ...v, bodyText: e.target.value }))}
                  placeholder="Please fill out the form below" />
              </div>
              <div className="form-row">
                <div>
                  <div className="form-label">Button Label</div>
                  <input className="form-input" value={flowSendModal.ctaText}
                    onChange={e => setFlowSendModal(v => ({ ...v, ctaText: e.target.value }))}
                    placeholder="Open" />
                </div>
                <div>
                  <div className="form-label">Mode</div>
                  <select className="form-input" value={flowSendModal.mode}
                    onChange={e => setFlowSendModal(v => ({ ...v, mode: e.target.value as any }))}>
                    <option value="published">Published</option>
                    <option value="draft">Draft (test)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setFlowSendModal(v => ({ ...v, open: false }))}>Cancel</button>
              <button className="btn btn-primary" onClick={sendFlow} disabled={sending || !flowSendModal.bodyText.trim()}>
                <i className="fa-solid fa-paper-plane" style={{ marginRight: 5 }} />Send Flow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Panel ── */}
      {showTemplates && (
        <div className="templates-panel open">
          <div className="templates-header">
            <span><i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', marginRight: 5 }} />Templates</span>
            <input className="tpl-search" type="text" placeholder="Search…" value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} autoFocus />
            <button className="icon-btn" onClick={() => setShowTemplates(false)}><i className="fa-solid fa-xmark" /></button>
          </div>
          {tplLoading && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Loading…
            </div>
          )}
          {!tplLoading && tplError && <div style={{ padding: 12, fontSize: 12, color: '#e84040' }}>{tplError}</div>}
          {!tplLoading && !tplError && filteredTpls.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No templates. <a href="/templates" style={{ color: 'var(--accent)' }}>Create one →</a>
            </div>
          )}
          {!tplLoading && filteredTpls.map(t => {
            const vars = extractVars(t)
            const isOTP = t.meta?.template_type === 'AUTHENTICATION' || t.category?.toUpperCase() === 'AUTHENTICATION'
            return (
              <div key={t.id} className="tpl-item" onClick={() => pickTemplate(t)}>
                <div className="tpl-name">
                  <i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', fontSize: 10, marginRight: 4 }} />
                  {t.name}
                  <span className="tpl-tag" style={{ marginLeft: 8 }}>{t.category}</span>
                  {isOTP && <span style={{ fontSize: 10, color: 'var(--accent2)', marginLeft: 6 }}>🔑 OTP</span>}
                  {!isOTP && vars.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--accent3)', marginLeft: 6 }}>
                      <i className="fa-solid fa-pen-to-square" style={{ marginRight: 2 }} />{vars.length} var{vars.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: t.status === 'approved' ? 'var(--accent)' : 'var(--accent3)' }}>
                    {t.status}
                  </span>
                </div>
                <div className="tpl-body">{isOTP ? '[Authentication OTP — enter code when sending]' : t.body}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Template Variable Modal ── */}
      {varModal.open && varModal.template && (
        <div className="tpl-modal-overlay open" onClick={() => setVarModal(v => ({ ...v, open: false }))}>
          <div className="tpl-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className="fa-solid fa-pen-to-square" style={{ color: 'var(--accent)', marginRight: 6, fontSize: 12 }} />
                {varModal.template.meta?.template_type === 'AUTHENTICATION' || varModal.template.category?.toUpperCase() === 'AUTHENTICATION'
                  ? `Send OTP — ${varModal.template.name}`
                  : `Fill Variables — ${varModal.template.name}`}
              </div>
              <button className="icon-btn" onClick={() => setVarModal(v => ({ ...v, open: false }))}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="tpl-modal-body">
              {varModal.template.category?.toUpperCase() === 'AUTHENTICATION' || varModal.template.meta?.template_type === 'AUTHENTICATION' ? (
                // OTP special UI
                <div>
                  <div style={{ background: 'rgba(0,168,232,0.08)', border: '1px solid rgba(0,168,232,0.2)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 600, marginBottom: 6 }}>
                      <i className="fa-solid fa-shield-halved" style={{ marginRight: 5 }} />Authentication Template
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      WhatsApp will auto-generate the message. Enter the OTP code below — it will be sent as the Copy Code button value.
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="form-label" style={{ color: 'var(--accent3)' }}>OTP Code to Send</div>
                    <input
                      className="form-input"
                      placeholder="e.g. 482913"
                      maxLength={8}
                      value={varModal.values[0] ?? ''}
                      onChange={e => setVarModal(vm => { const vals = [...vm.values]; vals[0] = e.target.value; return { ...vm, values: vals } })}
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                // Standard variable UI
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Template: <code style={{ color: 'var(--accent3)' }}>{varModal.template.body}</code>
                  </div>
                  {varModal.vars.map((v, i) => (
                    <div key={v} className="form-group" style={{ marginBottom: 10 }}>
                      <div className="form-label" style={{ color: 'var(--accent3)' }}>{v}</div>
                      <input
                        className="form-input"
                        placeholder={`Value for ${v}`}
                        value={varModal.values[i] ?? ''}
                        onChange={e => setVarModal(vm => { const vals = [...vm.values]; vals[i] = e.target.value; return { ...vm, values: vals } })}
                      />
                    </div>
                  ))}
                  <div className="form-group">
                    <div className="form-label">Preview</div>
                    <div className="tpl-preview-box" style={{ fontFamily: 'inherit', fontSize: 13 }}>
                      {varModal.vars.reduce(
  (body, v, i) =>
    body.replaceAll(v, varModal.values[i] || v),
  varModal.template.body ?? ''
)}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setVarModal(v => ({ ...v, open: false }))}>Cancel</button>
              <button className="btn btn-primary"
                onClick={() => { sendTemplate(varModal.template!, varModal.values); setVarModal(v => ({ ...v, open: false })) }}>
                <i className="fa-solid fa-paper-plane" style={{ marginRight: 5 }} />
                {varModal.template.category?.toUpperCase() === 'AUTHENTICATION' ? 'Send OTP' : 'Send Template'}
              </button>
            </div>
          </div>
        </div>
      )}

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
