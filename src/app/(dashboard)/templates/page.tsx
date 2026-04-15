'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Template } from '@/types'

const CHANNEL_META = {
  whatsapp:  { label: 'WA API',    cls: 'tpl-ch-wa',    icon: 'fa-brands fa-whatsapp' },
  instagram: { label: 'Instagram', cls: 'tpl-ch-ig',    icon: 'fa-brands fa-instagram' },
  facebook:  { label: 'Facebook',  cls: 'tpl-ch-fb',    icon: 'fa-brands fa-facebook' },
}

function highlightVars(text: string) {
  return text.replace(/\{\{([^}]+)\}\}/g, '<span class="tpl-var">{{$1}}</span>')
}

export default function TemplatesPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<Template[]>([])
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'instagram' | 'facebook'>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', platform: 'whatsapp', category: 'Marketing', language: 'en', body: '' })

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!profile) return
    const { data } = await supabase.from('templates').select('*').eq('workspace_id', profile.workspace_id).order('created_at', { ascending: false })
    if (data) setTemplates(data as Template[])
  }

  const filtered = templates.filter(t =>
    (filter === 'all' || t.platform === filter) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="generic-page">
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-file-code" style={{ color: 'var(--accent)', marginRight: 8 }} />
          Templates
        </span>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
            return (
              <div className="tpl-card" key={t.id}>
                <div className="tpl-card-header">
                  <div>
                    <div className="tpl-card-category">{t.category}</div>
                    <div className="tpl-card-name">{t.name}</div>
                  </div>
                  <span className={`tpl-card-channel ${ch.cls}`}>
                    <i className={ch.icon} /> {ch.label}
                  </span>
                </div>
                <div className="tpl-card-body" dangerouslySetInnerHTML={{ __html: highlightVars(t.body) }} />
                <div className="tpl-card-footer">
                  <span className={`tpl-status-badge ${t.status}`}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
                  <div className="tpl-card-actions">
                    <button className="icon-btn" title="Use in Broadcast"><i className="fa-solid fa-satellite-dish" style={{ fontSize: 12 }} /></button>
                    <button className="icon-btn" title="Edit"><i className="fa-solid fa-pen" style={{ fontSize: 12 }} /></button>
                    <button className="icon-btn" title="Delete" onClick={async () => {
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
              No templates found. Create your first template.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="tpl-modal-overlay open" onClick={() => setShowModal(false)}>
          <div className="tpl-modal" onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title"><i className="fa-solid fa-plus" style={{ color: 'var(--accent)', marginRight: 6, fontSize: 12 }} />New Template</div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="tpl-modal-body">
              <div className="form-group">
                <div className="form-label">Template Name</div>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Order Confirmation" />
              </div>
              <div className="form-row">
                <div>
                  <div className="form-label">Platform</div>
                  <select className="form-input" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <div className="form-label">Category</div>
                  <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option>Marketing</option>
                    <option>Utility</option>
                    <option>Authentication</option>
                    <option>Transactional</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">Message Body</div>
                <textarea className="form-input" rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Hi {{name}}, your order {{order_id}} has been confirmed!" style={{ resize: 'vertical' }} />
                <div className="tpl-var-chips">
                  {['{{name}}','{{phone}}','{{order_id}}','{{amount}}','{{product}}','{{tracking_link}}'].map(v => (
                    <span key={v} className="tpl-var-chip" onClick={() => setForm(f => ({ ...f, body: f.body + v }))}>{v}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="form-label">Preview</div>
                <div className="tpl-preview-box" dangerouslySetInnerHTML={{ __html: highlightVars(form.body || 'Your preview will appear here as you type…') }} />
                <div className="tpl-char-count">{form.body.length} characters</div>
              </div>
            </div>
            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-secondary" onClick={async () => {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) return
                const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
                if (!profile || !form.name || !form.body) return
                const { data: t } = await supabase.from('templates').insert({ workspace_id: profile.workspace_id, platform: form.platform, name: form.name, category: form.category, language: form.language, body: form.body, status: 'draft' }).select().single()
                if (t) { setTemplates(prev => [t as Template, ...prev]); setShowModal(false); setForm({ name: '', platform: 'whatsapp', category: 'Marketing', language: 'en', body: '' }) }
              }}>Save Draft</button>
              <button className="btn btn-primary" onClick={async () => {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) return
                const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
                if (!profile || !form.name || !form.body) return
                const status = form.platform === 'whatsapp' ? 'pending' : 'approved'
                const { data: t } = await supabase.from('templates').insert({ workspace_id: profile.workspace_id, platform: form.platform, name: form.name, category: form.category, language: form.language, body: form.body, status }).select().single()
                if (t) { setTemplates(prev => [t as Template, ...prev]); setShowModal(false); setForm({ name: '', platform: 'whatsapp', category: 'Marketing', language: 'en', body: '' }) }
              }}>{form.platform === 'whatsapp' ? 'Submit for Review' : 'Save Template'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}