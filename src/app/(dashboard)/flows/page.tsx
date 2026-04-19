'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import FlowBuilder from '@/components/flows/FlowBuilder'
import { convertToMetaJSON } from '@/lib/flowConverter'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type FlowStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'BLOCKED' | 'THROTTLED'

const FLOW_CATEGORIES = [
  'SIGN_UP', 'SIGN_IN', 'APPOINTMENT_BOOKING', 'LEAD_GENERATION',
  'CONTACT_US', 'CUSTOMER_SUPPORT', 'SURVEY', 'OTHER',
] as const

// Starter Flow JSON templates
const FLOW_STARTERS: Record<string, any> = {
  blank: {
    version: '6.1',
    screens: [{
      id: 'WELCOME',
      title: 'Welcome',
      terminal: true,
      success: true,
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: [
          { type: 'TextHeading', text: 'Hello 👋' },
          { type: 'TextBody', text: 'This is a sample flow. Customize me!' },
          {
            type: 'Footer',
            label: 'Submit',
            'on-click-action': { name: 'complete', payload: {} },
          },
        ],
      },
    }],
  },
  lead_capture: {
    version: '6.1',
    screens: [{
      id: 'LEAD_FORM',
      title: 'Contact Info',
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: [
          { type: 'TextHeading', text: 'Get in Touch' },
          { type: 'TextBody', text: 'Please fill in your details below.' },
          {
            type: 'TextInput',
            label: 'Full Name',
            name: 'full_name',
            required: true,
            'input-type': 'text',
          },
          {
            type: 'TextInput',
            label: 'Phone Number',
            name: 'phone',
            required: true,
            'input-type': 'phone',
          },
          {
            type: 'TextInput',
            label: 'Email Address',
            name: 'email',
            required: false,
            'input-type': 'email',
          },
          {
            type: 'Footer',
            label: 'Submit',
            'on-click-action': {
              name: 'complete',
              payload: {
                full_name: '${form.full_name}',
                phone: '${form.phone}',
                email: '${form.email}',
              },
            },
          },
        ],
      },
      terminal: true,
      success: true,
    }],
  },
  appointment: {
    version: '6.1',
    screens: [
      {
        id: 'APPOINTMENT_DATE',
        title: 'Book Appointment',
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'Book Your Slot' },
            {
              type: 'DatePicker',
              label: 'Select Date',
              name: 'appointment_date',
              required: true,
            },
            {
              type: 'Dropdown',
              label: 'Select Time Slot',
              name: 'time_slot',
              required: true,
              'data-source': [
                { id: '9am', title: '9:00 AM' },
                { id: '11am', title: '11:00 AM' },
                { id: '2pm', title: '2:00 PM' },
                { id: '4pm', title: '4:00 PM' },
              ],
            },
            {
              type: 'Footer',
              label: 'Confirm Booking',
              'on-click-action': {
                name: 'navigate',
                next: { type: 'screen', name: 'CONFIRMATION' },
                payload: {
                  appointment_date: '${form.appointment_date}',
                  time_slot: '${form.time_slot}',
                },
              },
            },
          ],
        },
      },
      {
        id: 'CONFIRMATION',
        title: 'Confirmed!',
        data: {
          appointment_date: { type: 'string', '__example__': '2024-01-15' },
          time_slot: { type: 'string', '__example__': '9am' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: '✅ Booking Confirmed!' },
            { type: 'TextBody', text: 'Your appointment has been scheduled.' },
            {
              type: 'Footer',
              label: 'Done',
              'on-click-action': { name: 'complete', payload: {} },
            },
          ],
        },
        terminal: true,
        success: true,
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, [string, string]> = {
    DRAFT:       ['var(--accent3)',    'fa-pencil'],
    PUBLISHED:   ['var(--accent)',     'fa-circle-check'],
    DEPRECATED:  ['var(--text-muted)', 'fa-archive'],
    BLOCKED:     ['#e84040',           'fa-ban'],
    THROTTLED:   ['#fb923c',           'fa-gauge-simple'],
  }
  const [color, icon] = cfg[status?.toUpperCase()] ?? ['var(--text-muted)', 'fa-question']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color }}>
      <i className={`fa-solid ${icon}`} style={{ fontSize: 9 }} />
      {status}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Send Flow Modal
// ─────────────────────────────────────────────────────────────────────────────
function SendFlowModal({ flow, onClose }: { flow: any; onClose: () => void }) {
  const supabase = createClient()
  const [convs,       setConvs]       = useState<any[]>([])
  const [search,      setSearch]      = useState('')
  const [selected,    setSelected]    = useState<any | null>(null)
  const [headerText,  setHeaderText]  = useState('')
  const [bodyText,    setBodyText]    = useState(`Check out our ${flow.name}!`)
  const [footerText,  setFooterText]  = useState('')
  const [ctaText,     setCtaText]     = useState('Open')
  const [mode,        setMode]        = useState<'draft' | 'published'>(flow.status === 'PUBLISHED' ? 'published' : 'draft')
  const [screenId,    setScreenId]    = useState('')
  const [sending,     setSending]     = useState(false)
  const [result,      setResult]      = useState<{ ok?: boolean; error?: string } | null>(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    supabase.from('conversations')
      .select('id, platform, contact:contacts(name, phone)')
      .eq('platform', 'whatsapp')
      .order('last_message_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setConvs(data ?? []); setLoading(false) })
  }, [])

  const filtered = convs.filter(c => {
    if (!search) return true
    const n = (c.contact?.name ?? '').toLowerCase()
    const p = c.contact?.phone ?? ''
    return n.includes(search.toLowerCase()) || p.includes(search)
  })

  // Get first screen ID from flow JSON if available
  useEffect(() => {
    if (flow.flow_json?.screens?.[0]?.id) {
      setScreenId(flow.flow_json.screens[0].id)
    }
  }, [flow.flow_json])

  async function send() {
    if (!selected || !bodyText.trim()) return
    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:         'send',
          conversation_id: selected.id,
          meta_flow_id:   flow.meta_flow_id,
          header_text:    headerText || undefined,
          body_text:      bodyText,
          footer_text:    footerText || undefined,
          cta_text:       ctaText,
          screen_id:      screenId || undefined,
          mode,
          flow_token:     `flow_${flow.meta_flow_id}_${Date.now()}`,
        }),
      })
      const json = await res.json()
      if (!res.ok) setResult({ error: json.error })
      else { setResult({ ok: true }); setTimeout(onClose, 1400) }
    } finally { setSending(false) }
  }

  const screens = flow.flow_json?.screens ?? []

  return (
    <div className="tpl-modal-overlay open" onClick={onClose}>
      <div className="tpl-modal" style={{ width: 620, maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="tpl-modal-header">
          <div className="tpl-modal-title">
            <i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent)', marginRight: 7 }} />
            Send Flow
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{flow.name}</span>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="tpl-modal-body">
          {/* Mode warning */}
          {mode === 'draft' && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--accent3)' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
              <strong>Draft mode:</strong> Only your test numbers can receive this flow. UI text fields are hidden.
            </div>
          )}

          {/* Send mode */}
          <div>
            <div className="form-label">Send Mode</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['published', 'draft'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '5px 16px', borderRadius: 8, border: '1px solid', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  borderColor: mode === m ? 'var(--accent)' : 'var(--border)',
                  background:  mode === m ? 'var(--accent-glow)' : 'var(--bg-surface)',
                  color:       mode === m ? 'var(--accent)' : 'var(--text-secondary)',
                }}>
                  {m === 'published' ? '🚀 Published' : '🧪 Draft (test)'}
                </button>
              ))}
            </div>
          </div>

          {/* Message body fields */}
          {mode !== 'draft' && (
            <div className="form-row">
              <div>
                <div className="form-label">Header Text <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 400 }}>(optional)</span></div>
                <input className="form-input" value={headerText} onChange={e => setHeaderText(e.target.value)} placeholder="Welcome" />
              </div>
              <div>
                <div className="form-label">Footer Text <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 400 }}>(optional)</span></div>
                <input className="form-input" value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Powered by React Commerce" />
              </div>
            </div>
          )}
          <div>
            <div className="form-label">Message Body *</div>
            <textarea className="form-input" rows={2} value={bodyText} onChange={e => setBodyText(e.target.value)} placeholder="Please fill out the form below" style={{ resize: 'none' }} />
          </div>
          <div className="form-row">
            <div>
              <div className="form-label">CTA Button Label</div>
              <input className="form-input" value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Open" />
            </div>
            <div>
              <div className="form-label">Initial Screen</div>
              {screens.length > 0 ? (
                <select className="form-input" value={screenId} onChange={e => setScreenId(e.target.value)}>
                  {screens.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.id} — {s.title}</option>
                  ))}
                </select>
              ) : (
                <input className="form-input" value={screenId} onChange={e => setScreenId(e.target.value)} placeholder="Screen ID (optional)" />
              )}
            </div>
          </div>

          {/* Conversation picker */}
          <div>
            <div className="form-label">Send To *</div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                <input className="form-input" style={{ padding: '5px 10px', fontSize: 12 }}
                  placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Loading…
                  </div>
                ) : filtered.map(c => {
                  const sel = selected?.id === c.id
                  const init = (c.contact?.name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <button key={c.id} onClick={() => setSelected(c)} style={{
                      width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid var(--border)',
                      background: sel ? 'var(--bg-active)' : 'none', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
                      color: sel ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: sel ? 'var(--accent-glow)' : 'var(--bg-surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{init}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{c.contact?.name ?? 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.contact?.phone}</div>
                      </div>
                      {sel && <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent)', fontSize: 13 }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {result?.error && (
            <div style={{ background: 'rgba(232,64,64,0.1)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e84040' }}>
              <i className="fa-solid fa-circle-xmark" style={{ marginRight: 6 }} />{result.error}
            </div>
          )}
          {result?.ok && (
            <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--accent)' }}>
              <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />Flow sent successfully!
            </div>
          )}
        </div>

        <div className="tpl-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={send} disabled={sending || !selected || !bodyText.trim()}>
            {sending ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Sending…</> : <><i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} />Send Flow</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Flows Page
// ─────────────────────────────────────────────────────────────────────────────
export default function FlowsPage() {
const [builderState, setBuilderState] = useState<any[]>([
  {
    id: 'WELCOME',
    title: 'Welcome',
    blocks: []
  }
])
  const [flows,       setFlows]       = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [syncing,     setSyncing]     = useState(false)
  const [hasWABA,     setHasWABA]     = useState<boolean | null>(null)
  const [syncError,   setSyncError]   = useState<string | null>(null)
  const [statusFilter, setStatus]     = useState('all')
  const [search,      setSearch]      = useState('')

  // Modals
  const [showCreate,  setShowCreate]  = useState(false)
  const [editFlow,    setEditFlow]    = useState<any | null>(null)   // JSON editor
  const [sendFlow,    setSendFlow]    = useState<any | null>(null)
  const [deleteFlow,  setDeleteFlow]  = useState<any | null>(null)

  // Create form
  const [newName,     setNewName]     = useState('')
  const [newCats,     setNewCats]     = useState<string[]>(['OTHER'])
  const [starterTpl,  setStarterTpl]  = useState('blank')
  const [creating,    setCreating]    = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // JSON editor
  const [jsonText,    setJsonText]    = useState('')
  const [jsonError,   setJsonError]   = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  // Action states
  const [actionState, setActionState] = useState<Record<string, string>>({})

  const load = useCallback(async (sync = false) => {
    if (sync) setSyncing(true); else setLoading(true)
    setSyncError(null)
    try {
      const res  = await fetch(sync ? '/api/flows?sync=true' : '/api/flows')
      const json = await res.json()
      setFlows(json.flows ?? [])
      setHasWABA(json.has_waba ?? false)
      if (json.sync_error) setSyncError(json.sync_error)
    } catch { /* ignore */ }
    finally { setLoading(false); setSyncing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function setAction(flowId: string, state: string) {
    setActionState(prev => ({ ...prev, [flowId]: state }))
    if (state === '') {
      setTimeout(() => setActionState(prev => { const n = { ...prev }; delete n[flowId]; return n }), 3000)
    }
  }

  // ── Create flow ───────────────────────────────────────────────────────────
  async function createFlow() {
    if (!newName.trim()) { setCreateError('Name is required'); return }
    setCreating(true); setCreateError(null)
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:     'create',
          name:       newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          categories: newCats,
          flow_json:  FLOW_STARTERS[starterTpl],
        }),
      })
      const json = await res.json()
      if (!res.ok) { setCreateError(json.error); return }
      setShowCreate(false); setNewName(''); setNewCats(['OTHER']); setStarterTpl('blank')
      await load(false)
      // Auto-open JSON editor to let user customize
      if (json.flow) setEditFlow(json.flow)
    } finally { setCreating(false) }
  }

  // ── Open JSON editor ──────────────────────────────────────────────────────
  function openEditor(flow: any) {
    const json = flow.flow_json ?? FLOW_STARTERS.blank
    setJsonText(JSON.stringify(json, null, 2))
    setJsonError(null)
    setEditFlow(flow)
  }

  // ── Save JSON ─────────────────────────────────────────────────────────────
 async function saveJson() {
  if (!editFlow) return

  const parsed = convertToMetaJSON(builderState)

  setSaving(true)
  setJsonError(null)

  try {
    const res = await fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_json',
        flow_id: editFlow.id,
        meta_flow_id: editFlow.meta_flow_id,
        flow_json: parsed,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setJsonError(json.error || 'Save failed')
      return
    }

    if (json.flow?.validation_errors?.length > 0) {
      setJsonError(
        `Meta validation: ${JSON.stringify(json.flow.validation_errors)}`
      )
    } else {
      setEditFlow(json.flow)
      setFlows((prev:any) =>
        prev.map((f:any) =>
          f.id === json.flow.id ? json.flow : f
        )
      )
      if (!json.meta_error) setJsonError(null)
    }

  } finally {
    setSaving(false)
  }
}

  // ── Publish ───────────────────────────────────────────────────────────────
  async function publishFlow(flow: any) {
    if (!confirm(`Publish "${flow.name}"? Published flows cannot be edited. You can still deprecate them.`)) return
    setAction(flow.id, 'publishing…')
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', flow_id: flow.id, meta_flow_id: flow.meta_flow_id }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error); setAction(flow.id, ''); return }
      setFlows(prev => prev.map(f => f.id === flow.id ? json.flow : f))
      setAction(flow.id, '✅ Published!')
    } finally { setTimeout(() => setAction(flow.id, ''), 3000) }
  }

  // ── Deprecate ─────────────────────────────────────────────────────────────
  async function deprecateFlow(flow: any) {
    if (!confirm(`Deprecate "${flow.name}"? It can no longer be sent to users.`)) return
    setAction(flow.id, 'deprecating…')
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deprecate', flow_id: flow.id, meta_flow_id: flow.meta_flow_id }),
      })
      const json = await res.json()
      setFlows(prev => prev.map(f => f.id === flow.id ? json.flow : f))
      setAction(flow.id, '⚠️ Deprecated')
    } finally { setTimeout(() => setAction(flow.id, ''), 3000) }
  }

  // ── Get preview URL ───────────────────────────────────────────────────────
  async function getPreview(flow: any) {
    setAction(flow.id, 'getting preview…')
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', flow_id: flow.id, meta_flow_id: flow.meta_flow_id, invalidate: false }),
      })
      const json = await res.json()
      if (json.preview_url) {
        window.open(json.preview_url, '_blank')
        setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, preview_url: json.preview_url } : f))
        setAction(flow.id, '✅ Opened!')
      } else {
        alert(json.error ?? 'No preview URL returned')
        setAction(flow.id, '')
      }
    } finally { setTimeout(() => setAction(flow.id, ''), 3000) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function doDelete(flow: any) {
    const res = await fetch('/api/flows', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flow_id: flow.id, meta_flow_id: flow.meta_flow_id }),
    })
    const json = await res.json()
    if (json.success) { setFlows(prev => prev.filter(f => f.id !== flow.id)); setDeleteFlow(null) }
    else alert('Delete failed: ' + (json.error ?? json.meta_error ?? 'unknown'))
  }

  const filtered = flows.filter(f => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'var(--accent3)', PUBLISHED: 'var(--accent)', DEPRECATED: 'var(--text-muted)',
    BLOCKED: '#e84040', THROTTLED: '#fb923c',
  }

  return (
    <div className="generic-page">
      {/* Header */}
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent)', marginRight: 8 }} />
          WhatsApp Flows
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasWABA === false && (
            <span style={{ fontSize: 11, color: 'var(--accent3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fa-solid fa-triangle-exclamation" />Set WHATSAPP_WABA_ID to enable Meta sync
            </span>
          )}
          <button className="btn btn-secondary" onClick={() => load(true)} disabled={syncing || !hasWABA}
            title={!hasWABA ? 'Add WHATSAPP_WABA_ID to env' : 'Sync all flows from Meta'}>
            <i className={`fa-solid fa-rotate ${syncing ? 'fa-spin' : ''}`} />
            {syncing ? ' Syncing…' : ' Sync from Meta'}
          </button>
          <button className="btn btn-primary" onClick={() => { setShowCreate(true); setCreateError(null) }}>
            <i className="fa-solid fa-plus" /> New Flow
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ padding: '10px 24px', background: 'rgba(0,168,232,0.06)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="fa-solid fa-info-circle" style={{ color: 'var(--accent2)', flexShrink: 0 }} />
        WhatsApp Flows are interactive forms/experiences that open inside WhatsApp. Create → Edit JSON → Publish → Send to customers.
        <a href="https://developers.facebook.com/docs/whatsapp/flows" target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', marginLeft: 4 }}>
          Docs <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9 }} />
        </a>
      </div>

      <div className="page-body">
        {syncError && (
          <div style={{ background: 'rgba(232,64,64,0.07)', border: '1px solid rgba(232,64,64,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#e84040', marginBottom: 12 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />Meta sync error: {syncError}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ width: 220 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search flows…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none' }}>
            <option value="all">All Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="DEPRECATED">DEPRECATED</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} flow{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Flow cards grid */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading flows…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(flow => {
              const statusColor = STATUS_COLORS[flow.status?.toUpperCase()] ?? 'var(--text-muted)'
              const canPublish  = flow.status === 'DRAFT' && flow.meta_flow_id
              const canEdit     = ['DRAFT', 'DEPRECATED'].includes(flow.status?.toUpperCase())
              const canSend     = flow.meta_flow_id && ['PUBLISHED', 'DRAFT'].includes(flow.status?.toUpperCase())
              const canDeprecate = flow.status?.toUpperCase() === 'PUBLISHED'
              const canDelete   = ['DRAFT', 'DEPRECATED'].includes(flow.status?.toUpperCase())
              const action      = actionState[flow.id]

              const screens = flow.flow_json?.screens ?? []
              const hasErrors = flow.validation_errors?.length > 0

              return (
                <div key={flow.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-active)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flow.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {flow.categories?.map((c: string) => (
                          <span key={c} style={{ padding: '1px 6px', borderRadius: 6, background: 'var(--bg-surface2)', border: '1px solid var(--border)' }}>{c}</span>
                        ))}
                        {flow.meta_flow_id && <span style={{ color: 'var(--text-muted)' }}><i className="fa-brands fa-meta" style={{ marginRight: 2 }} />{flow.meta_flow_id.slice(0, 8)}</span>}
                      </div>
                    </div>
                    <StatusBadge status={flow.status ?? 'DRAFT'} />
                  </div>

                  {/* Screens info */}
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {screens.length > 0 && (
                      <span><i className="fa-solid fa-layer-group" style={{ marginRight: 4, color: 'var(--accent2)' }} />{screens.length} screen{screens.length !== 1 ? 's' : ''}</span>
                    )}
                    {flow.json_version && (
                      <span><i className="fa-solid fa-code" style={{ marginRight: 4, color: 'var(--text-muted)' }} />v{flow.json_version}</span>
                    )}
                    {screens.slice(0, 3).map((s: any) => (
                      <span key={s.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'var(--bg-surface2)', border: '1px solid var(--border)' }}>{s.id}</span>
                    ))}
                    {screens.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{screens.length - 3} more</span>}
                  </div>

                  {/* Validation errors */}
                  {hasErrors && (
                    <div style={{ background: 'rgba(232,64,64,0.08)', border: '1px solid rgba(232,64,64,0.2)', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
                      <i className="fa-solid fa-circle-xmark" style={{ color: '#e84040', marginRight: 5 }} />
                      {flow.validation_errors.length} validation error{flow.validation_errors.length !== 1 ? 's' : ''} — edit JSON to fix
                    </div>
                  )}

                  {/* Health status */}
                  {flow.health_status && flow.health_status.can_send_message === 'ENABLED' && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="fa-solid fa-heart-pulse" style={{ fontSize: 9 }} />Healthy — can send
                    </div>
                  )}

                  {/* Action feedback */}
                  {action && (
                    <div style={{ fontSize: 11, color: action.startsWith('✅') ? 'var(--accent)' : action.startsWith('⚠') ? 'var(--accent3)' : 'var(--text-secondary)', textAlign: 'center' }}>
                      {action.includes('…') && <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 4 }} />}
                      {action}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {/* Edit JSON */}
                    <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, height: 28, display: 'flex', alignItems: 'center', gap: 5 }}
                      onClick={() => openEditor(flow)} title="Edit Flow JSON">
                      <i className="fa-solid fa-code" />JSON
                    </button>

                    {/* Preview */}
                    {flow.meta_flow_id && (
                      <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, height: 28, display: 'flex', alignItems: 'center', gap: 5 }}
                        onClick={() => getPreview(flow)} title="Open preview in browser" disabled={!!action}>
                        <i className="fa-solid fa-eye" />Preview
                      </button>
                    )}

                    {/* Send */}
                    {canSend && (
                      <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, height: 28, color: 'var(--accent)', borderColor: 'rgba(37,211,102,0.3)', display: 'flex', alignItems: 'center', gap: 5 }}
                        onClick={() => setSendFlow(flow)}>
                        <i className="fa-solid fa-paper-plane" />Send
                      </button>
                    )}

                    {/* Publish */}
                    {canPublish && !hasErrors && (
                      <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 11, height: 28, display: 'flex', alignItems: 'center', gap: 5 }}
                        onClick={() => publishFlow(flow)} disabled={!!action}>
                        <i className="fa-solid fa-rocket" />Publish
                      </button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      {/* Deprecate */}
                      {canDeprecate && (
                        <button className="icon-btn" title="Deprecate (disable)" onClick={() => deprecateFlow(flow)}>
                          <i className="fa-solid fa-archive" style={{ fontSize: 11, color: 'var(--accent3)' }} />
                        </button>
                      )}
                      {/* Delete */}
                      {canDelete && (
                        <button className="icon-btn" title="Delete" onClick={() => setDeleteFlow(flow)}>
                          <i className="fa-solid fa-trash" style={{ fontSize: 11, color: '#e84040' }} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && !loading && (
              <div style={{ gridColumn: '1/-1', padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <i className="fa-solid fa-diagram-project" style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: 12 }} />
                {flows.length === 0
                  ? <>No flows yet. Click <strong>New Flow</strong> to create one, or <strong>Sync from Meta</strong> to import existing flows.</>
                  : 'No flows match your filters.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Flow Modal ── */}
      {showCreate && (
        <div className="tpl-modal-overlay open" onClick={() => setShowCreate(false)}>
          <div className="tpl-modal" style={{ width: 580 }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title"><i className="fa-solid fa-plus" style={{ color: 'var(--accent)', marginRight: 6 }} />New WhatsApp Flow</div>
              <button className="icon-btn" onClick={() => setShowCreate(false)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="tpl-modal-body">
              {createError && (
                <div style={{ background: 'rgba(232,64,64,0.1)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e84040' }}>
                  <i className="fa-solid fa-circle-xmark" style={{ marginRight: 6 }} />{createError}
                </div>
              )}
              <div>
                <div className="form-label">Flow Name * <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>lowercase + underscores only</span></div>
                <input className="form-input" value={newName} onChange={e => setNewName(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))} placeholder="lead_capture" />
              </div>
              <div>
                <div className="form-label">Categories</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FLOW_CATEGORIES.map(cat => {
                    const active = newCats.includes(cat)
                    return (
                      <div key={cat} onClick={() => setNewCats(prev => active ? prev.filter(c => c !== cat) : [...prev, cat])}
                        style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: '1px solid', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent-glow)' : 'var(--bg-surface)', color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>
                        {active && <i className="fa-solid fa-check" style={{ fontSize: 9, marginRight: 4 }} />}{cat}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="form-label">Starter Template</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[
                    { id: 'blank',        icon: '📄', label: 'Blank',           desc: 'Start from scratch' },
                    { id: 'lead_capture', icon: '📋', label: 'Lead Capture',    desc: 'Name, phone, email' },
                    { id: 'appointment',  icon: '📅', label: 'Appointment',     desc: 'Date picker + slots' },
                  ].map(t => (
                    <div key={t.id} onClick={() => setStarterTpl(t.id)} style={{
                      padding: '10px 12px', borderRadius: 10, border: '1px solid', cursor: 'pointer', textAlign: 'center',
                      borderColor: starterTpl === t.id ? 'var(--accent)' : 'var(--border)',
                      background:  starterTpl === t.id ? 'var(--accent-glow)' : 'var(--bg-surface)',
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: starterTpl === t.id ? 'var(--accent)' : 'var(--text-secondary)' }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <i className="fa-solid fa-info-circle" style={{ color: 'var(--accent)', marginRight: 5 }} />
                The flow will be created on Meta as a DRAFT. You can then edit the JSON, validate, and publish.
              </div>
            </div>
            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createFlow} disabled={creating || !newName.trim()}>
                {creating ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Creating…</> : <><i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Create Flow</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── JSON Editor Modal ── */}
      {editFlow && (
        <div className="tpl-modal-overlay open" onClick={() => setEditFlow(null)}>
          <div className="tpl-modal" style={{ width: '90vw', maxWidth: 860, maxHeight: '94vh' }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className="fa-solid fa-code" style={{ color: 'var(--accent)', marginRight: 6 }} />
                Flow JSON Editor
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{editFlow.name}</span>
                {editFlow.meta_flow_id && <StatusBadge status={editFlow.status ?? 'DRAFT'} />}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {editFlow.meta_flow_id && editFlow.status === 'DRAFT' && (
                  <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => publishFlow(editFlow)} title="Publish after saving">
                    <i className="fa-solid fa-rocket" /> Publish
                  </button>
                )}
                <button className="icon-btn" onClick={() => setEditFlow(null)}><i className="fa-solid fa-xmark" /></button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Error bar */}
              {jsonError && (
                <div style={{ padding: '8px 16px', background: 'rgba(232,64,64,0.1)', borderBottom: '1px solid rgba(232,64,64,0.25)', fontSize: 11, color: '#e84040', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <i className="fa-solid fa-circle-xmark" style={{ flexShrink: 0, marginTop: 1 }} />{jsonError}
                </div>
              )}

              {/* Help bar */}
              <div style={{ padding: '6px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span><strong>Version:</strong> {editFlow.json_version ?? '6.1'}</span>
                <span><strong>Screens:</strong> {editFlow.flow_json?.screens?.length ?? 0}</span>
                <a href="https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson" target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Flow JSON Reference <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9 }} />
                </a>
              </div>

              {/* Editor */}
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <div style={{ height:'70vh' }}>
                  <FlowBuilder
                    value={builderState}
                    onChange={setBuilderState}
                  />
                </div>
              </div>
            </div>

            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => { setJsonText(JSON.stringify(FLOW_STARTERS[starterTpl] ?? FLOW_STARTERS.blank, null, 2)); setJsonError(null) }} title="Reset to starter template">
                <i className="fa-solid fa-rotate-left" /> Reset
              </button>
              <button className="btn btn-secondary" onClick={() => setEditFlow(null)}>Close</button>
              <button className="btn btn-primary" onClick={saveJson} disabled={saving}>
                {saving
                  ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Saving…</>
                  : <><i className="fa-solid fa-floppy-disk" style={{ marginRight: 6 }} />Save & Validate</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Modal ── */}
      {sendFlow && <SendFlowModal flow={sendFlow} onClose={() => setSendFlow(null)} />}

      {/* ── Delete Confirm ── */}
      {deleteFlow && (
        <div className="tpl-modal-overlay open" onClick={() => setDeleteFlow(null)}>
          <div style={{ background: 'var(--bg-panel)', borderRadius: 14, padding: 24, maxWidth: 400, width: '90vw', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: '#e84040' }} />Delete Flow?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
              This will delete <strong style={{ color: 'var(--text-primary)' }}>{deleteFlow.name}</strong> permanently.
              {deleteFlow.status === 'PUBLISHED' && (
                <div style={{ marginTop: 8, color: '#e84040', fontSize: 12 }}>
                  <i className="fa-solid fa-ban" style={{ marginRight: 5 }} />Published flows cannot be deleted. Deprecate it first.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteFlow(null)}>Cancel</button>
              {deleteFlow.status !== 'PUBLISHED' && (
                <button className="btn" style={{ background: '#e84040', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => doDelete(deleteFlow)}>
                  <i className="fa-solid fa-trash" />Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
