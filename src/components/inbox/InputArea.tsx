'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { createClient } from '@/lib/supabase/client'
import type { Template } from '@/types'

// ── Emoji data (common subset, no external lib needed) ────────────────────────
const EMOJI_GROUPS: Record<string, string[]> = {
  '😀 Smileys': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿'],
  '👋 People': ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷'],
  '❤️ Hearts': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','⛎'],
  '🎉 Activities': ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥅','⛳','🎣','🤿','🎽','🎿','🛷','🥌','🎯','🎱','🎮','🕹','🎲','🧩','🎭','🎨','🎬','🎤','🎧','🎼','🎷','🥁','🎸','🎹','🪗','🎻','🎺','🪘'],
  '🍕 Food': ['🍕','🍔','🌮','🌯','🫔','🥙','🥗','🍜','🍝','🍛','🍲','🥘','🫕','🍱','🍣','🍤','🦪','🥟','🦞','🦀','🦑','🍗','🍖','🌭','🥪','🧆','🥚','🍳','🥞','🧇','🥓','🥩','🍞','🥐','🥖','🫓','🧀','🥗','🍟','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍦','🍧','🍨','🍡','🧃','🥤','🧋','☕','🍵','🫖','🧉','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧊'],
  '🚗 Travel': ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🚲','🛴','🛺','🚁','✈️','🛩','🛫','🛬','🛳','⛴','🚤','🚀','🛸','🛶','🎠','🎡','🎢','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚞','🚝','🚋'],
  '💡 Objects': ['💡','🔦','🕯','🪔','🧯','💰','💳','💎','📱','💻','⌨️','🖥','🖨','🖱','🖲','📷','📸','📹','🎥','📽','🎞','☎️','📞','📟','📠','📺','📻','🎙','🎚','🎛','🧭','⏱','⏲','⏰','🕰','⌛','⏳','📡','🔋','🔌','💊','🩺','🩻','🩹','🩼','💉','🩸','🔬','🔭','🧬','🧪','🧫','🧲','⚗️','🪄','🔮','🧿','🪬','🔑','🗝','🔐','🔒','🔓','🔨','🪓','⛏','⚒️','🛠','🗡','⚔️','🛡','🪚','🔫','🏹','🪃','🪝','🧲','🛒','🚪','🪞','🪟'],
  '✅ Symbols': ['✅','❌','❎','✔️','💯','🔥','⭐','🌟','💫','✨','🎯','🏆','🥇','🥈','🥉','🎖','🏅','🎗','🎫','🎟','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎻','🥁','🎷','🎺','🎸','🎹','🪗','🎲','🎮','🕹','🎰','🧩','🪀','🪁','🎯','🎱','🎳'],
}

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
  const [showTemplates, setShowTemplates] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [emojiGroup, setEmojiGroup] = useState('😀 Smileys')
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateSearch, setTemplateSearch] = useState('')
  const [tplLoading, setTplLoading] = useState(false)
  const [tplError, setTplError] = useState('')
  // Template variable filling
  const [varModal, setVarModal] = useState<{ open: boolean; template: Template | null; vars: string[]; values: string[] }>({ open: false, template: null, vars: [], values: [] })
  // Voice recording
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isSendingRef = useRef(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { activeConversationId, addMessage } = useInboxStore()
  const conversation = useActiveConversation()

  useEffect(() => {
    setShowTemplates(false)
    setShowEmoji(false)
    setTemplates([])
    setTplError('')
  }, [activeConversationId])

  // Close emoji when clicking outside
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('emoji-picker')
      if (el && !el.contains(e.target as Node)) setShowEmoji(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  // ── Template loading ───────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    if (tplLoading) return
    setTplLoading(true); setTplError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
      if (!profile) return
      const { data, error } = await supabase.from('templates').select('*')
        .eq('workspace_id', profile.workspace_id).eq('platform', 'whatsapp')
        .in('status', ['approved', 'draft']).order('name')
      if (error) { setTplError(error.message); return }
      const list: Template[] = data ?? []
      if (!list.some(t => t.name === 'hello_world')) {
        list.unshift({ id: 'builtin-hello-world', workspace_id: profile.workspace_id, platform: 'whatsapp', name: 'hello_world', category: 'Utility', language: 'en_US', body: 'Hello! This is a test message from React Commerce.', header_text: null, footer_text: null, status: 'approved', meta_template_id: 'hello_world', variables: [], created_at: '' } as Template)
      }
      setTemplates(list)
    } finally { setTplLoading(false) }
  }, [tplLoading])

  useEffect(() => { if (showTemplates && !templates.length) loadTemplates() }, [showTemplates])

  // ── Extract variables from template body ───────────────────────────────────
  function extractVars(tpl: Template): string[] {
    // Matches {{1}}, {{2}}, {{name}}, etc.
    const matches = [...(tpl.body ?? '').matchAll(/\{\{([^}]+)\}\}/g)]
    return [...new Set(matches.map(m => m[0]))]
  }

  // ── Pick a template (opens var modal if has variables) ─────────────────────
  function pickTemplate(t: Template) {
    const vars = extractVars(t)
    if (vars.length > 0) {
      setVarModal({ open: true, template: t, vars, values: vars.map(() => '') })
      setShowTemplates(false)
    } else {
      sendTemplate(t, [])
      setShowTemplates(false)
    }
  }

  // ── Send text ──────────────────────────────────────────────────────────────
  async function sendText() {
    if (!text.trim() || !activeConversationId || isSendingRef.current) return
    isSendingRef.current = true; setSending(true)
    const body = text.trim()
    setText('')
    if (textRef.current) textRef.current.style.height = 'auto'
    addOptimistic('text', body)
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: activeConversationId, body, type: 'text' }),
      })
      const json = await res.json()
      if (!res.ok) setText(`[FAILED: ${json.error}]`)
      else onMessageSent()
    } finally { isSendingRef.current = false; setSending(false) }
  }

  // ── Send template ──────────────────────────────────────────────────────────
  async function sendTemplate(template: Template, variableValues: string[]) {
    if (!activeConversationId || isSendingRef.current) return
    isSendingRef.current = true; setSending(true)

    // Build WA components array from variable values
    const components: any[] = []
    if (variableValues.some(v => v)) {
      components.push({
        type: 'body',
        parameters: variableValues.map(v => ({ type: 'text', text: v })),
      })
    }

    // Substitute variables in preview body
    let previewBody = template.body
    const vars = extractVars(template)
    vars.forEach((v, i) => { if (variableValues[i]) previewBody = previewBody.replaceAll(v, variableValues[i]) })

    addOptimistic('template', previewBody, { template_name: template.name })
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          body: previewBody,
          type: 'template',
          template_name: template.name,
          template_language: template.language ?? 'en_US',
          template_components: components,
        }),
      })
      const json = await res.json()
      if (!res.ok) alert(`Template send failed: ${json.error}`)
      else onMessageSent()
    } finally { isSendingRef.current = false; setSending(false) }
  }

  // ── Send file attachment ───────────────────────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeConversationId) return
    if (isSendingRef.current) return
    isSendingRef.current = true; setSending(true)

    const mime = file.type
    const ctype = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'document'
    addOptimistic(ctype, file.name)

    const form = new FormData()
    form.append('conversation_id', activeConversationId)
    form.append('type', 'media')
    form.append('file', file)
    form.append('filename', file.name)
    if (text.trim()) form.append('body', text.trim())

    try {
      const res = await fetch('/api/messages/send', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) alert(`File send failed: ${json.error}`)
      else { setText(''); onMessageSent() }
    } finally {
      isSendingRef.current = false; setSending(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Voice recording ────────────────────────────────────────────────────────
  async function toggleRecording() {
    if (recording) {
      // Stop
      mediaRecorderRef.current?.stop()
      clearInterval(recordTimerRef.current!)
      setRecording(false); setRecordingTime(0)
    } else {
      // Start
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        audioChunksRef.current = []
        mr.ondataavailable = e => audioChunksRef.current.push(e.data)
        mr.onstop = async () => {
          stream.getTracks().forEach(t => t.stop())
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
          await sendVoice(file)
        }
        mr.start()
        mediaRecorderRef.current = mr
        setRecording(true)
        let secs = 0
        recordTimerRef.current = setInterval(() => { secs++; setRecordingTime(secs); if (secs >= 120) { mr.stop(); clearInterval(recordTimerRef.current!); setRecording(false); setRecordingTime(0) } }, 1000)
      } catch { alert('Microphone permission denied') }
    }
  }

  async function sendVoice(file: File) {
    if (!activeConversationId) return
    isSendingRef.current = true; setSending(true)
    addOptimistic('audio', 'Voice message')
    const form = new FormData()
    form.append('conversation_id', activeConversationId)
    form.append('type', 'media')
    form.append('file', file)
    form.append('filename', file.name)
    try {
      const res = await fetch('/api/messages/send', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) alert(`Voice send failed: ${json.error}`)
      else onMessageSent()
    } finally { isSendingRef.current = false; setSending(false) }
  }

  function addOptimistic(ctype: string, body: string, meta: any = {}) {
    if (!activeConversationId) return
    addMessage({
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId,
      workspace_id: '', external_id: null,
      direction: 'outbound', content_type: ctype as any,
      body, media_url: null, media_mime: null,
      sender_id: null, status: 'queued', is_note: false,
      meta, created_at: new Date().toISOString(),
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
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
    t.body.toLowerCase().includes(templateSearch.toLowerCase())
  )

  return (
    <div className="chat-input-area" style={{ position: 'relative' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        onChange={handleFileSelect}
      />

      {/* Emoji Picker */}
      {showEmoji && (
        <div id="emoji-picker" style={{
          position: 'absolute', bottom: '100%', left: 0,
          width: 320, background: 'var(--bg-panel)',
          border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', zIndex: 200,
        }}>
          {/* Group tabs */}
          <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', padding: '4px 6px', gap: 2 }}>
            {Object.keys(EMOJI_GROUPS).map(g => (
              <button key={g}
                title={g}
                onClick={() => setEmojiGroup(g)}
                style={{
                  flexShrink: 0, padding: '4px 8px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontSize: 16,
                  background: emojiGroup === g ? 'var(--bg-active)' : 'none',
                }}>
                {g.split(' ')[0]}
              </button>
            ))}
          </div>
          {/* Emoji grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '8px', maxHeight: 200, overflowY: 'auto' }}>
            {EMOJI_GROUPS[emojiGroup]?.map(emoji => (
              <button key={emoji}
                onClick={() => { setText(t => t + emoji); textRef.current?.focus() }}
                style={{ fontSize: 22, padding: '3px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none', lineHeight: 1 }}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template Panel */}
      {showTemplates && (
        <div className="templates-panel open">
          <div className="templates-header">
            <span><i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', marginRight: 5 }} />Templates</span>
            <input className="tpl-search" type="text" placeholder="Search…"
              value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} autoFocus />
            <button className="icon-btn" onClick={() => setShowTemplates(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          {tplLoading && <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Loading…</div>}
          {!tplLoading && tplError && <div style={{ padding: 12, fontSize: 12, color: '#e84040' }}>{tplError}</div>}
          {!tplLoading && !tplError && filteredTpls.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No templates. <a href="/templates" style={{ color: 'var(--accent)' }}>Create one →</a>
            </div>
          )}
          {!tplLoading && filteredTpls.map(t => {
            const vars = extractVars(t)
            return (
              <div key={t.id} className="tpl-item" onClick={() => pickTemplate(t)}>
                <div className="tpl-name">
                  <i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', fontSize: 10, marginRight: 4 }} />
                  {t.name}
                  <span className="tpl-tag" style={{ marginLeft: 8 }}>{t.category}</span>
                  {vars.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--accent3)', marginLeft: 6 }}>
                      <i className="fa-solid fa-pen-to-square" style={{ marginRight: 3 }} />
                      {vars.length} var{vars.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: t.status === 'approved' ? 'var(--accent)' : 'var(--accent3)' }}>{t.status}</span>
                </div>
                <div className="tpl-body">{t.body}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Template Variable Fill Modal */}
      {varModal.open && varModal.template && (
        <div className="tpl-modal-overlay open" onClick={() => setVarModal(v => ({ ...v, open: false }))}>
          <div className="tpl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className="fa-solid fa-pen-to-square" style={{ color: 'var(--accent)', marginRight: 6, fontSize: 12 }} />
                Fill Variables — {varModal.template.name}
              </div>
              <button className="icon-btn" onClick={() => setVarModal(v => ({ ...v, open: false }))}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="tpl-modal-body">
              <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
                Original: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{varModal.template.body}</span>
              </div>
              {varModal.vars.map((v, i) => (
                <div key={v} className="form-group" style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ color: 'var(--accent3)' }}>{v}</div>
                  <input
                    className="form-input"
                    placeholder={`Value for ${v}`}
                    value={varModal.values[i]}
                    onChange={e => setVarModal(vm => {
                      const vals = [...vm.values]
                      vals[i] = e.target.value
                      return { ...vm, values: vals }
                    })}
                  />
                </div>
              ))}
              {/* Live preview */}
              <div className="form-group">
                <div className="form-label">Preview</div>
                <div className="tpl-preview-box" style={{ fontFamily: 'inherit', fontSize: 13 }}>
                  {varModal.vars.reduce((body, v, i) =>
                    body.replaceAll(v, varModal.values[i] || v),
                    varModal.template.body
                  )}
                </div>
              </div>
            </div>
            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setVarModal(v => ({ ...v, open: false }))}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                sendTemplate(varModal.template!, varModal.values)
                setVarModal(v => ({ ...v, open: false }))
              }}>
                <i className="fa-solid fa-paper-plane" /> Send Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick replies */}
      <div className="quick-replies">
        {QUICK_REPLIES.map(r => (
          <div key={r} className="quick-reply" onClick={() => { setText(r); textRef.current?.focus() }}>{r}</div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="input-toolbar">
        <button
          className="tool-btn"
          title="Emoji"
          style={{ color: showEmoji ? 'var(--accent)' : undefined }}
          onClick={() => setShowEmoji(v => !v)}
        >
          <i className="fa-regular fa-face-smile" />
        </button>
        <button
          className="tool-btn"
          title="Attach file"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <i className="fa-solid fa-paperclip" />
        </button>
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
          placeholder={recording
            ? `🔴 Recording… ${recordingTime}s (tap mic to stop)`
            : `Type a message via ${platformLabel}… (Enter to send)`}
          value={text}
          onChange={e => { setText(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending || recording}
          style={recording ? { borderColor: 'rgba(232,64,64,0.5)', color: '#e84040' } : {}}
        />
        <button
          className="voice-btn"
          title={recording ? 'Stop recording' : 'Voice message'}
          onClick={toggleRecording}
          style={recording ? { borderColor: '#e84040', color: '#e84040', animation: 'pulse 1s infinite' } : {}}
        >
          <i className={recording ? 'fa-solid fa-stop' : 'fa-solid fa-microphone'} />
        </button>
        <button
          className="send-btn"
          onClick={sendText}
          disabled={sending || !text.trim() || recording}
          title="Send"
          style={{ opacity: (sending || !text.trim() || recording) ? 0.5 : 1 }}
        >
          {sending
            ? <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }} />
            : <i className="fa-solid fa-paper-plane" />}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
      `}</style>
    </div>
  )
}
