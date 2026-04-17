'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Template } from '@/types'

// WhatsApp-supported languages
const WA_LANGUAGES = [
  { code: 'en_US', label: 'English (US)' }, { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi', label: 'Hindi' }, { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' }, { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' }, { code: 'kn', label: 'Kannada' },
  { code: 'bn', label: 'Bengali' }, { code: 'pa', label: 'Punjabi' },
  { code: 'ml', label: 'Malayalam' }, { code: 'ur', label: 'Urdu' },
  { code: 'ar', label: 'Arabic' }, { code: 'es', label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (Brazil)' }, { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' }, { code: 'it', label: 'Italian' },
  { code: 'id', label: 'Indonesian' }, { code: 'tr', label: 'Turkish' },
]

type BtnType = { type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'; text: string; url?: string; phone?: string }
type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'

interface FormState {
  name: string; category: string; language: string
  header_type: HeaderType; header_text: string; header_url: string
  body_text: string; footer_text: string; buttons: BtnType[]
  body_examples: string[]  // sample values for {{1}},{{2}}...
}

const EMPTY: FormState = {
  name: '', category: 'UTILITY', language: 'en_US',
  header_type: 'NONE', header_text: '', header_url: '',
  body_text: '', footer_text: '', buttons: [], body_examples: [],
}

function hlVars(t: string) {
  return t.replace(/\{\{(\d+|[a-z_]+)\}\}/g, '<span class="tpl-var">{{$1}}</span>')
}

function extractVarCount(text: string): number {
  const m = [...text.matchAll(/\{\{(\d+)\}\}/g)]
  if (!m.length) return 0
  return Math.max(...m.map(x => parseInt(x[1])))
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; icon: string }> = {
    approved: { color: 'var(--accent)', icon: 'fa-circle-check' },
    pending:  { color: 'var(--accent3)', icon: 'fa-clock' },
    draft:    { color: 'var(--text-muted)', icon: 'fa-pencil' },
    rejected: { color: '#e84040', icon: 'fa-circle-xmark' },
    paused:   { color: 'var(--accent4)', icon: 'fa-pause-circle' },
    disabled: { color: '#888', icon: 'fa-ban' },
  }
  const c = cfg[status] ?? cfg.draft
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: c.color }}>
      <i className={`fa-solid ${c.icon}`} style={{ fontSize: 10 }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function TemplatesPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'instagram' | 'facebook'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ error?: string; meta_error?: string; success?: boolean } | null>(null)
  const [hasWABA, setHasWABA] = useState<boolean | null>(null)

  const loadTemplates = useCallback(async (sync = false) => {
    if (sync) setSyncing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/templates')
      const json = await res.json()
      setTemplates(json.templates ?? [])
      setHasWABA(json.source === 'meta_synced')
    } catch (err) {
      console.error('Failed to load templates', err)
    } finally {
      setLoading(false); setSyncing(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  const upd = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }))

  function insertVar() {
    const count = extractVarCount(form.body_text) + 1
    const varStr = `{{${count}}}`
    upd('body_text', form.body_text + varStr)
    upd('body_examples', [...form.body_examples, ''])
  }

  function addBtn(type: BtnType['type']) {
    if (form.buttons.length >= 10) { alert('Max 10 buttons'); return }
    upd('buttons', [...form.buttons, { type, text: '' }])
  }

  function updBtn(i: number, u: Partial<BtnType>) {
    const btns = [...form.buttons]; btns[i] = { ...btns[i], ...u }; upd('buttons', btns)
  }

  async function save() {
    if (!form.name.trim() || !form.body_text.trim()) {
      alert('Template name and body are required')
      return
    }
    setSaving(true); setSaveResult(null)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.toLowerCase().replace(/\s+/g, '_'),
          category: form.category,
          language: form.language,
          header_type: form.header_type,
          header_text: form.header_text,
          header_url: form.header_url,
          body_text: form.body_text,
          footer_text: form.footer_text,
          buttons: form.buttons,
          body_examples: form.body_examples.filter(Boolean),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSaveResult({ error: json.error })
      } else {
        setSaveResult({ success: true, meta_error: json.meta_error ?? null })
        await loadTemplates()
        if (!json.meta_error) {
          setShowModal(false)
          setForm({ ...EMPTY })
        }
      }
    } finally { setSaving(false) }
  }

  async function deleteTemplate(t: any) {
    if (!confirm(`Delete template "${t.name}"? This also removes it from WhatsApp.`)) return
    await fetch('/api/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: t.id, template_name: t.name }),
    })
    setTemplates(prev => prev.filter(x => x.id !== t.id))
  }

  const varCount = extractVarCount(form.body_text)
  const examples = form.body_examples

  const filtered = templates.filter(t => {
    if (filter !== 'all' && t.platform !== filter) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.body.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const HEADER_ICONS: Record<string, string> = {
    TEXT: 'fa-solid fa-font', IMAGE: 'fa-solid fa-image',
    VIDEO: 'fa-solid fa-video', DOCUMENT: 'fa-solid fa-file',
  }

  return (
    <div className="generic-page">
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-file-code" style={{ color: 'var(--accent)', marginRight: 8 }} />
          Templates
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasWABA === false && (
            <span style={{ fontSize: 11, color: 'var(--accent3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fa-solid fa-triangle-exclamation" />
              Set WHATSAPP_WABA_ID in Vercel env to sync with Meta
            </span>
          )}
          <button className="btn btn-secondary" onClick={() => loadTemplates(true)} disabled={syncing}>
            <i className={`fa-solid fa-rotate ${syncing ? 'fa-spin' : ''}`} /> Sync from Meta
          </button>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setSaveResult(null) }}>
            <i className="fa-solid fa-plus" /> New Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tpl-page-tabs">
        {(['all','whatsapp','instagram','facebook'] as const).map(ch => (
          <div key={ch} className={`tpl-page-tab ${filter === ch ? 'active' : ''}`} onClick={() => setFilter(ch)}>
            {ch === 'all' && 'All'}
            {ch === 'whatsapp'  && <><i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: 5 }} />WhatsApp</>}
            {ch === 'instagram' && <><i className="fa-brands fa-instagram" style={{ color: '#e1306c', marginRight: 5 }} />Instagram</>}
            {ch === 'facebook'  && <><i className="fa-brands fa-facebook" style={{ color: '#1877f2', marginRight: 5 }} />Facebook</>}
            <span className="tpl-page-badge">{ch === 'all' ? templates.length : templates.filter(t => t.platform === ch).length}</span>
          </div>
        ))}
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ width: 240 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Review</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            {filtered.length} templates
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading templates…
          </div>
        ) : (
          <div className="tpl-grid">
            {filtered.map(t => {
              const meta = t.meta ?? {}
              const hasHeader = meta.header_type && meta.header_type !== 'NONE'
              const btns: BtnType[] = meta.buttons ?? []
              const qualityScore = meta.quality_score?.score ?? null

              return (
                <div className="tpl-card" key={t.id}>
                  <div className="tpl-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <div className="tpl-card-category">{t.category}</div>
                        {qualityScore && (
                          <span style={{ fontSize: 10, color: qualityScore === 'GREEN' ? 'var(--accent)' : qualityScore === 'YELLOW' ? 'var(--accent3)' : '#e84040' }}>
                            ● {qualityScore}
                          </span>
                        )}
                      </div>
                      <div className="tpl-card-name">{t.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{t.language}</div>
                    </div>
                    <span className={`tpl-card-channel ${t.platform === 'whatsapp' ? 'tpl-ch-wa' : t.platform === 'instagram' ? 'tpl-ch-ig' : 'tpl-ch-fb'}`}>
                      <i className={t.platform === 'whatsapp' ? 'fa-brands fa-whatsapp' : t.platform === 'instagram' ? 'fa-brands fa-instagram' : 'fa-brands fa-facebook'} />
                    </span>
                  </div>

                  {/* Header */}
                  {hasHeader && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <i className={HEADER_ICONS[meta.header_type] ?? 'fa-solid fa-paperclip'} style={{ fontSize: 9 }} />
                      {meta.header_type === 'TEXT' ? (t.header_text ?? 'Text header') : `${meta.header_type} header`}
                    </div>
                  )}

                  <div className="tpl-card-body" dangerouslySetInnerHTML={{ __html: hlVars(t.body) }} />

                  {t.footer_text && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>{t.footer_text}</div>
                  )}

                  {btns.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {btns.map((b, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'var(--bg-surface2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <i className={b.type === 'URL' ? 'fa-solid fa-link' : b.type === 'PHONE_NUMBER' ? 'fa-solid fa-phone' : 'fa-solid fa-reply'} style={{ fontSize: 8 }} />
                          {b.text}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rejected reason */}
                  {t.status === 'rejected' && meta.rejected_reason && (
                    <div style={{ fontSize: 11, color: '#e84040', background: 'rgba(232,64,64,0.08)', borderRadius: 6, padding: '5px 8px', marginTop: 6 }}>
                      <i className="fa-solid fa-circle-xmark" style={{ marginRight: 4 }} />
                      Rejected: {meta.rejected_reason}
                    </div>
                  )}

                  <div className="tpl-card-footer" style={{ marginTop: 8 }}>
                    <StatusBadge status={t.status} />
                    <div className="tpl-card-actions">
                      {t.meta_template_id && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 4 }}>
                          <i className="fa-brands fa-meta" style={{ marginRight: 2 }} />Synced
                        </span>
                      )}
                      <button className="icon-btn" title="Delete" onClick={() => deleteTemplate(t)}>
                        <i className="fa-solid fa-trash" style={{ fontSize: 11, color: '#e84040' }} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && !loading && (
              <div style={{ gridColumn: '1/-1', padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                {templates.length === 0 ? (
                  <>
                    <i className="fa-solid fa-file-code" style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: 12 }} />
                    No templates yet.{' '}
                    {hasWABA
                      ? 'Create one below, or create in WhatsApp Manager and click Sync.'
                      : 'Add WHATSAPP_WABA_ID to Vercel env to sync from Meta.'}
                  </>
                ) : 'No templates match your filters.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showModal && (
        <div className="tpl-modal-overlay open" onClick={() => setShowModal(false)}>
          <div className="tpl-modal" style={{ width: 680, maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: 6 }} />
                New WhatsApp Template
                {!hasWABA && <span style={{ fontSize: 10, color: 'var(--accent3)', marginLeft: 8 }}>Will save as draft (no WABA_ID)</span>}
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>

            <div className="tpl-modal-body">
              {/* Save result banner */}
              {saveResult?.error && (
                <div style={{ background: 'rgba(232,64,64,0.1)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e84040', marginBottom: 8 }}>
                  <i className="fa-solid fa-circle-xmark" style={{ marginRight: 6 }} />{saveResult.error}
                </div>
              )}
              {saveResult?.meta_error && !saveResult.error && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--accent3)', marginBottom: 8 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                  Saved locally but Meta submission failed: {saveResult.meta_error}
                </div>
              )}
              {saveResult?.success && !saveResult.meta_error && (
                <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />Template submitted to WhatsApp for review!
                </div>
              )}

              {/* Name + Category + Language */}
              <div className="form-row">
                <div>
                  <div className="form-label">Template Name *</div>
                  <input className="form-input" value={form.name} onChange={e => upd('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="order_confirmation" />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>lowercase + underscores only</div>
                </div>
                <div>
                  <div className="form-label">Category *</div>
                  <select className="form-input" value={form.category} onChange={e => upd('category', e.target.value)}>
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {form.category === 'MARKETING' ? 'Promos, offers — Meta reviews carefully' : form.category === 'UTILITY' ? 'Order updates, alerts — fastest approval' : 'OTPs, login codes'}
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 0 }}>
                <div>
                  <div className="form-label">Language *</div>
                  <select className="form-input" value={form.language} onChange={e => upd('language', e.target.value)}>
                    {WA_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7, padding: '4px 0' }}>
                    <i className="fa-solid fa-info-circle" style={{ color: 'var(--accent)', marginRight: 4 }} />
                    Language must exactly match your message. Wrong language = instant rejection.
                  </div>
                </div>
              </div>

              {/* Header */}
              <div>
                <div className="form-label">Header <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>(optional)</span></div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {(['NONE','TEXT','IMAGE','VIDEO','DOCUMENT'] as HeaderType[]).map(h => (
                    <button key={h} onClick={() => upd('header_type', h)}
                      style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        borderColor: form.header_type === h ? 'var(--accent)' : 'var(--border)',
                        background: form.header_type === h ? 'var(--accent-glow)' : 'var(--bg-surface)',
                        color: form.header_type === h ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                      {h === 'NONE' ? 'None' : h === 'TEXT' ? '📝 Text' : h === 'IMAGE' ? '🖼 Image' : h === 'VIDEO' ? '🎬 Video' : '📄 Document'}
                    </button>
                  ))}
                </div>
                {form.header_type === 'TEXT' && (
                  <input className="form-input" value={form.header_text} onChange={e => upd('header_text', e.target.value)} placeholder="Bold header text (max 60 chars)" maxLength={60} />
                )}
                {form.header_type !== 'NONE' && form.header_type !== 'TEXT' && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <i className="fa-solid fa-info-circle" style={{ color: 'var(--accent)', marginRight: 4 }} />
                    Media headers require a sample URL for Meta review. Paste the public URL:
                    <input className="form-input" style={{ marginTop: 6 }} value={form.header_url} onChange={e => upd('header_url', e.target.value)} placeholder="https://example.com/sample.jpg" />
                  </div>
                )}
              </div>

              {/* Body */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div className="form-label" style={{ marginBottom: 0 }}>Message Body * <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>({form.body_text.length}/1024)</span></div>
                  <button onClick={insertVar} style={{ fontSize: 11, color: 'var(--accent3)', background: 'none', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    + Add Variable
                  </button>
                </div>
                <textarea
                  className="form-input" rows={4} value={form.body_text}
                  onChange={e => {
                    upd('body_text', e.target.value)
                    const n = extractVarCount(e.target.value)
                    const cur = form.body_examples
                    if (n > cur.length) upd('body_examples', [...cur, ...Array(n - cur.length).fill('')])
                    else if (n < cur.length) upd('body_examples', cur.slice(0, n))
                  }}
                  placeholder="Hi {{1}}, your order {{2}} is confirmed. Total: ₹{{3}}"
                  maxLength={1024} style={{ resize: 'vertical' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Use {'{{1}}'}, {'{{2}}'} etc. for variables. You must provide sample values below for Meta review.
                </div>

                {/* Variable sample values */}
                {varCount > 0 && (
                  <div style={{ marginTop: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent3)', marginBottom: 8 }}>
                      <i className="fa-solid fa-pen-to-square" style={{ marginRight: 5 }} />
                      Sample Values (required by Meta for review)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
                      {Array.from({ length: varCount }, (_, i) => (
                        <div key={i}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{`{{${i + 1}}}`} example:</div>
                          <input
                            className="form-input" style={{ padding: '5px 8px', fontSize: 12 }}
                            value={examples[i] ?? ''} placeholder={`Sample for {{${i + 1}}}`}
                            onChange={e => {
                              const ex = [...examples]
                              ex[i] = e.target.value
                              upd('body_examples', ex)
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div>
                <div className="form-label">Footer <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>(optional, no variables, max 60 chars)</span></div>
                <input className="form-input" value={form.footer_text} onChange={e => upd('footer_text', e.target.value)} placeholder="Not interested? Reply STOP" maxLength={60} />
              </div>

              {/* Buttons */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="form-label" style={{ marginBottom: 0 }}>Buttons <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>(max 10 mixed)</span></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, height: 26 }} onClick={() => addBtn('QUICK_REPLY')}>
                      ↩ Quick Reply
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, height: 26 }} onClick={() => addBtn('URL')}>
                      🔗 URL
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, height: 26 }} onClick={() => addBtn('PHONE_NUMBER')}>
                      📞 Phone
                    </button>
                  </div>
                </div>
                {form.buttons.map((btn, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, minWidth: 72 }}>
                      {btn.type === 'QUICK_REPLY' ? '↩ Quick Reply' : btn.type === 'URL' ? '🔗 URL Button' : '📞 Call Button'}
                    </span>
                    <input className="form-input" style={{ flex: 1 }} value={btn.text} onChange={e => updBtn(i, { text: e.target.value })} placeholder="Button label (max 25 chars)" maxLength={25} />
                    {btn.type === 'URL' && (
                      <input className="form-input" style={{ flex: 2 }} value={btn.url ?? ''} onChange={e => updBtn(i, { url: e.target.value })} placeholder="https://example.com/order/{{1}}" />
                    )}
                    {btn.type === 'PHONE_NUMBER' && (
                      <input className="form-input" style={{ flex: 1 }} value={btn.phone ?? ''} onChange={e => updBtn(i, { phone: e.target.value })} placeholder="+919354231262" />
                    )}
                    <button className="icon-btn" onClick={() => upd('buttons', form.buttons.filter((_, j) => j !== i))}>
                      <i className="fa-solid fa-xmark" style={{ fontSize: 11, color: '#e84040' }} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Live Preview */}
              <div>
                <div className="form-label">Live Preview</div>
                <div style={{ background: 'var(--bg-chat)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                  <div style={{ maxWidth: 300, marginLeft: 'auto' }}>
                    <div style={{ background: '#1a3a2a', borderRadius: '12px 12px 4px 12px', padding: '8px 12px', border: '1px solid rgba(37,211,102,0.15)' }}>
                      {form.header_type === 'TEXT' && form.header_text && (
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{form.header_text}</div>
                      )}
                      {form.header_type !== 'NONE' && form.header_type !== 'TEXT' && (
                        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 6, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 6 }}>
                          {form.header_type === 'IMAGE' ? '🖼' : form.header_type === 'VIDEO' ? '🎬' : '📄'}
                        </div>
                      )}
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: '#e8edf5', whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: hlVars(
                          form.body_text
                            ? form.body_text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
                                const ex = examples[parseInt(n) - 1]
                                return ex ? `<span style="color:#25d366;font-weight:600">${ex}</span>` : `<span style="color:rgba(245,158,11,0.8)">{{${n}}}</span>`
                              })
                            : '<span style="opacity:0.3">Your message body…</span>'
                        ) }} />
                      {form.footer_text && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontStyle: 'italic' }}>{form.footer_text}</div>
                      )}
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'right', marginTop: 4 }}>✓ sent</div>
                    </div>
                    {form.buttons.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                        {form.buttons.map((b, i) => (
                          <div key={i} style={{ background: '#1e2535', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--accent2)', textAlign: 'center', border: '1px solid rgba(0,168,232,0.2)' }}>
                            {b.text || `Button ${i + 1}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving
                  ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Submitting…</>
                  : <><i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} />Submit to WhatsApp</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
