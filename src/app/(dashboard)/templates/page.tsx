'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Template } from '@/types'

const WA_LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'bn', label: 'Bengali' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'ur', label: 'Urdu' },
  { code: 'ar', label: 'Arabic' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (Brazil)' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'id', label: 'Indonesian' },
]

const CHANNEL_META = {
  whatsapp:  { label: 'WA API',    cls: 'tpl-ch-wa',  icon: 'fa-brands fa-whatsapp' },
  instagram: { label: 'Instagram', cls: 'tpl-ch-ig',  icon: 'fa-brands fa-instagram' },
  facebook:  { label: 'Facebook',  cls: 'tpl-ch-fb',  icon: 'fa-brands fa-facebook' },
}

type ButtonType = { type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'; text: string; url?: string; phone?: string }

interface FormState {
  name: string
  platform: string
  category: string
  language: string
  // Header
  headerType: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  headerText: string
  // Body
  body: string
  // Footer
  footer: string
  // Buttons
  buttons: ButtonType[]
}

const EMPTY_FORM: FormState = {
  name: '', platform: 'whatsapp', category: 'Marketing', language: 'en_US',
  headerType: 'NONE', headerText: '', body: '', footer: '', buttons: [],
}

function highlightVars(text: string) {
  return text.replace(/\{\{([^}]+)\}\}/g, '<span class="tpl-var">{{$1}}</span>')
}

function buildPreview(form: FormState): string {
  const parts: string[] = []
  if (form.headerType === 'TEXT' && form.headerText) parts.push(`**${form.headerText}**`)
  if (form.headerType !== 'NONE' && form.headerType !== 'TEXT') parts.push(`[${form.headerType} attachment]`)
  if (form.body) parts.push(form.body)
  if (form.footer) parts.push(`_${form.footer}_`)
  if (form.buttons.length) parts.push(form.buttons.map(b => `[${b.text}]`).join(' '))
  return parts.join('\n\n')
}

export default function TemplatesPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<Template[]>([])
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'instagram' | 'facebook'>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!profile) return
    const { data } = await supabase.from('templates').select('*').eq('workspace_id', profile.workspace_id).order('created_at', { ascending: false })
    if (data) setTemplates(data as Template[])
  }

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(t: Template) {
    const meta = (t as any).meta ?? {}
    setForm({
      name: t.name,
      platform: t.platform,
      category: t.category,
      language: t.language,
      headerType: meta.header_type ?? 'NONE',
      headerText: t.header_text ?? '',
      body: t.body,
      footer: t.footer_text ?? '',
      buttons: meta.buttons ?? [],
    })
    setEditId(t.id)
    setShowModal(true)
  }

  function updateForm(field: keyof FormState, val: any) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function addButton(type: ButtonType['type']) {
    if (form.buttons.length >= 3) { alert('WhatsApp allows maximum 3 buttons'); return }
    setForm(f => ({ ...f, buttons: [...f.buttons, { type, text: '' }] }))
  }

  function updateButton(i: number, updates: Partial<ButtonType>) {
    setForm(f => {
      const btns = [...f.buttons]
      btns[i] = { ...btns[i], ...updates }
      return { ...f, buttons: btns }
    })
  }

  function removeButton(i: number) {
    setForm(f => ({ ...f, buttons: f.buttons.filter((_, j) => j !== i) }))
  }

  function insertVar(varName: string) {
    const varStr = `{{${varName}}}`
    updateForm('body', form.body + varStr)
  }

  async function saveTemplate(status: 'draft' | 'pending' | 'approved') {
    if (!form.name.trim() || !form.body.trim()) { alert('Template name and body are required'); return }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
      if (!profile) return

      const record = {
        workspace_id: profile.workspace_id,
        platform: form.platform,
        name: form.name.toLowerCase().replace(/\s+/g, '_'),
        category: form.category,
        language: form.language,
        body: form.body,
        header_text: form.headerType === 'TEXT' ? form.headerText : null,
        footer_text: form.footer || null,
        status: form.platform === 'whatsapp' && status === 'pending' ? 'pending' : status,
        meta: {
          header_type: form.headerType,
          buttons: form.buttons,
        },
      }

      if (editId) {
        const { error } = await supabase.from('templates').update(record).eq('id', editId)
        if (error) { alert(error.message); return }
        setTemplates(prev => prev.map(t => t.id === editId ? { ...t, ...record } as any : t))
      } else {
        const { data, error } = await supabase.from('templates').insert(record).select().single()
        if (error) { alert(error.message); return }
        if (data) setTemplates(prev => [data as Template, ...prev])
      }
      setShowModal(false)
    } finally { setSaving(false) }
  }

  const filtered = templates.filter(t =>
    (filter === 'all' || t.platform === filter) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="generic-page">
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-file-code" style={{ color: 'var(--accent)', marginRight: 8 }} />Templates
        </span>
        <button className="btn btn-primary" onClick={openNew}>
          <i className="fa-solid fa-plus" /> New Template
        </button>
      </div>

      <div className="tpl-page-tabs">
        {(['all','whatsapp','instagram','facebook'] as const).map(ch => (
          <div key={ch} className={`tpl-page-tab ${filter === ch ? 'active' : ''}`} onClick={() => setFilter(ch)}>
            {ch === 'all' && 'All Templates'}
            {ch === 'whatsapp'  && <><i className="fa-brands fa-whatsapp tpl-platform-icon" style={{ color: '#25d366' }} /> WhatsApp</>}
            {ch === 'instagram' && <><i className="fa-brands fa-instagram tpl-platform-icon" style={{ color: '#e1306c' }} /> Instagram</>}
            {ch === 'facebook'  && <><i className="fa-brands fa-facebook tpl-platform-icon" style={{ color: '#1877f2' }} /> Facebook</>}
            <span className="tpl-page-badge">{ch === 'all' ? templates.length : templates.filter(t => t.platform === ch).length}</span>
          </div>
        ))}
      </div>

      <div className="page-body">
        <div style={{ marginBottom: 16 }}>
          <div className="search-input-wrap" style={{ width: 300 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="tpl-grid">
          {filtered.map(t => {
            const ch = CHANNEL_META[t.platform as keyof typeof CHANNEL_META]
            const meta = (t as any).meta ?? {}
            return (
              <div className="tpl-card" key={t.id}>
                <div className="tpl-card-header">
                  <div>
                    <div className="tpl-card-category">{t.category}</div>
                    <div className="tpl-card-name">{t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{t.language}</div>
                  </div>
                  <span className={`tpl-card-channel ${ch.cls}`}>
                    <i className={ch.icon} /> {ch.label}
                  </span>
                </div>
                {/* Header indicator */}
                {meta.header_type && meta.header_type !== 'NONE' && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="fa-solid fa-paperclip" style={{ fontSize: 9 }} />
                    {meta.header_type === 'TEXT' ? t.header_text : `${meta.header_type} header`}
                  </div>
                )}
                <div className="tpl-card-body" dangerouslySetInnerHTML={{ __html: highlightVars(t.body) }} />
                {/* Footer */}
                {t.footer_text && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.footer_text}</div>
                )}
                {/* Buttons */}
                {(meta.buttons ?? []).length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(meta.buttons as ButtonType[]).map((b, i) => (
                      <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'var(--bg-surface2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        {b.type === 'URL' ? <><i className="fa-solid fa-link" style={{ marginRight: 3 }} /></> : b.type === 'PHONE_NUMBER' ? <><i className="fa-solid fa-phone" style={{ marginRight: 3 }} /></> : <><i className="fa-solid fa-reply" style={{ marginRight: 3 }} /></>}
                        {b.text}
                      </span>
                    ))}
                  </div>
                )}
                <div className="tpl-card-footer">
                  <span className={`tpl-status-badge ${t.status}`}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
                  <div className="tpl-card-actions">
                    <button className="icon-btn" title="Edit" onClick={() => openEdit(t)}><i className="fa-solid fa-pen" style={{ fontSize: 12 }} /></button>
                    <button className="icon-btn" title="Delete" onClick={async () => {
                      if (!confirm('Delete this template?')) return
                      await supabase.from('templates').delete().eq('id', t.id)
                      setTemplates(prev => prev.filter(x => x.id !== t.id))
                    }}><i className="fa-solid fa-trash" style={{ fontSize: 12 }} /></button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No templates found.
            </div>
          )}
        </div>
      </div>

      {/* Template Builder Modal */}
      {showModal && (
        <div className="tpl-modal-overlay open" onClick={() => setShowModal(false)}>
          <div className="tpl-modal" style={{ width: 640, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className="fa-solid fa-file-code" style={{ color: 'var(--accent)', marginRight: 6, fontSize: 12 }} />
                {editId ? 'Edit Template' : 'New Template'}
                {form.platform === 'whatsapp' && <span style={{ fontSize: 10, color: 'var(--accent3)', marginLeft: 8 }}>WhatsApp templates require Meta review</span>}
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>

            <div className="tpl-modal-body" style={{ gap: 14 }}>
              {/* Name + Platform + Category */}
              <div className="form-row">
                <div>
                  <div className="form-label">Template Name *</div>
                  <input className="form-input" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="order_confirmation" />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>lowercase, underscores only</div>
                </div>
                <div>
                  <div className="form-label">Platform *</div>
                  <select className="form-input" value={form.platform} onChange={e => updateForm('platform', e.target.value)}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div>
                  <div className="form-label">Category</div>
                  <select className="form-input" value={form.category} onChange={e => updateForm('category', e.target.value)}>
                    <option>Marketing</option>
                    <option>Utility</option>
                    <option>Authentication</option>
                  </select>
                </div>
                <div>
                  <div className="form-label">Language</div>
                  <select className="form-input" value={form.language} onChange={e => updateForm('language', e.target.value)}>
                    {WA_LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Header (WA-specific) */}
              {form.platform === 'whatsapp' && (
                <div>
                  <div className="form-label">Header (Optional)</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {(['NONE','TEXT','IMAGE','VIDEO','DOCUMENT'] as const).map(ht => (
                      <button key={ht}
                        onClick={() => updateForm('headerType', ht)}
                        style={{
                          padding: '4px 10px', borderRadius: 8, border: '1px solid',
                          fontSize: 11, cursor: 'pointer', fontWeight: 500,
                          borderColor: form.headerType === ht ? 'var(--accent)' : 'var(--border)',
                          background: form.headerType === ht ? 'var(--accent-glow)' : 'var(--bg-surface)',
                          color: form.headerType === ht ? 'var(--accent)' : 'var(--text-secondary)',
                        }}>
                        {ht === 'NONE' && 'None'}
                        {ht === 'TEXT' && <><i className="fa-solid fa-font" style={{ marginRight: 4 }} />Text</>}
                        {ht === 'IMAGE' && <><i className="fa-solid fa-image" style={{ marginRight: 4 }} />Image</>}
                        {ht === 'VIDEO' && <><i className="fa-solid fa-video" style={{ marginRight: 4 }} />Video</>}
                        {ht === 'DOCUMENT' && <><i className="fa-solid fa-file" style={{ marginRight: 4 }} />Document</>}
                      </button>
                    ))}
                  </div>
                  {form.headerType === 'TEXT' && (
                    <input className="form-input" value={form.headerText} onChange={e => updateForm('headerText', e.target.value)} placeholder="Header text (max 60 chars)" maxLength={60} />
                  )}
                  {form.headerType !== 'NONE' && form.headerType !== 'TEXT' && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 0' }}>
                      <i className="fa-solid fa-info-circle" style={{ marginRight: 4 }} />
                      {form.headerType} URL will be provided when sending via API. Save the template first.
                    </div>
                  )}
                </div>
              )}

              {/* Body */}
              <div>
                <div className="form-label">Message Body * <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>({form.body.length}/1024 chars)</span></div>
                <textarea
                  className="form-input"
                  rows={4}
                  value={form.body}
                  onChange={e => updateForm('body', e.target.value)}
                  placeholder="Hi {{name}}, your order {{order_id}} has been confirmed! Total: ₹{{amount}}"
                  maxLength={1024}
                  style={{ resize: 'vertical' }}
                />
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Quick insert variables:</div>
                  <div className="tpl-var-chips">
                    {['name','phone','order_id','amount','product','date','time','tracking_link','store_name','otp'].map(v => (
                      <span key={v} className="tpl-var-chip" onClick={() => insertVar(v)}>{'{{' + v + '}}'}</span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  Tip: You can also use positional variables like {'{{1}}'}, {'{{2}}'} etc.
                </div>
              </div>

              {/* Footer (WA-specific) */}
              {form.platform === 'whatsapp' && (
                <div>
                  <div className="form-label">Footer (Optional) <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>max 60 chars, no variables</span></div>
                  <input
                    className="form-input"
                    value={form.footer}
                    onChange={e => updateForm('footer', e.target.value)}
                    placeholder="Not interested? Reply STOP"
                    maxLength={60}
                  />
                </div>
              )}

              {/* Buttons (WA-specific) */}
              {form.platform === 'whatsapp' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div className="form-label" style={{ marginBottom: 0 }}>Buttons (max 3)</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, height: 28 }}
                        onClick={() => addButton('QUICK_REPLY')}>
                        <i className="fa-solid fa-reply" /> Quick Reply
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, height: 28 }}
                        onClick={() => addButton('URL')}>
                        <i className="fa-solid fa-link" /> URL
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, height: 28 }}
                        onClick={() => addButton('PHONE_NUMBER')}>
                        <i className="fa-solid fa-phone" /> Phone
                      </button>
                    </div>
                  </div>
                  {form.buttons.map((btn, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 80 }}>
                        {btn.type === 'QUICK_REPLY' ? '↩ Quick Reply' : btn.type === 'URL' ? '🔗 URL' : '📞 Phone'}
                      </span>
                      <input className="form-input" style={{ flex: 1 }} value={btn.text}
                        onChange={e => updateButton(i, { text: e.target.value })}
                        placeholder="Button label (max 25 chars)" maxLength={25} />
                      {btn.type === 'URL' && (
                        <input className="form-input" style={{ flex: 1 }} value={btn.url ?? ''}
                          onChange={e => updateButton(i, { url: e.target.value })}
                          placeholder="https://example.com/{{order_id}}" />
                      )}
                      {btn.type === 'PHONE_NUMBER' && (
                        <input className="form-input" style={{ flex: 1 }} value={btn.phone ?? ''}
                          onChange={e => updateButton(i, { phone: e.target.value })}
                          placeholder="+91XXXXXXXXXX" />
                      )}
                      <button className="icon-btn" onClick={() => removeButton(i)}>
                        <i className="fa-solid fa-xmark" style={{ fontSize: 12, color: '#e84040' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview */}
              <div>
                <div className="form-label">Preview</div>
                <div style={{
                  background: '#0d1117', borderRadius: 12, padding: 16,
                  border: '1px solid rgba(255,255,255,0.06)', minHeight: 80,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <div style={{ maxWidth: 280, background: '#1a3a2a', borderRadius: '12px 12px 4px 12px', padding: '8px 12px', marginLeft: 'auto' }}>
                    {form.headerType === 'TEXT' && form.headerText && (
                      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{form.headerText}</div>
                    )}
                    {form.headerType !== 'NONE' && form.headerType !== 'TEXT' && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        <i className={form.headerType === 'IMAGE' ? 'fa-solid fa-image' : form.headerType === 'VIDEO' ? 'fa-solid fa-video' : 'fa-solid fa-file'} />
                        {' '}{form.headerType}
                      </div>
                    )}
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: '#e8edf5', whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{ __html: highlightVars(form.body || 'Your message body will appear here…') }} />
                    {form.footer && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontStyle: 'italic' }}>{form.footer}</div>
                    )}
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 4 }}>✓ sent</div>
                  </div>
                  {form.buttons.length > 0 && (
                    <div style={{ maxWidth: 280, marginLeft: 'auto', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
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

            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-secondary" onClick={() => saveTemplate('draft')} disabled={saving}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button className="btn btn-primary" onClick={() => saveTemplate(form.platform === 'whatsapp' ? 'pending' : 'approved')} disabled={saving}>
                <i className="fa-solid fa-paper-plane" style={{ marginRight: 5 }} />
                {form.platform === 'whatsapp' ? 'Submit for WA Review' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
