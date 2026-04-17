'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact } from '@/types'

interface CustomField { key: string; label: string; value: string }
interface ContactWithCustom extends Partial<Contact> {
  custom_fields?: CustomField[]
}

const TAG_OPTIONS = ['VIP', 'Lead', 'Hot Lead', 'B2B', 'Repeat Buyer', 'Wholesale', 'Delhi NCR', 'Mumbai', 'Bangalore', 'Enterprise', 'SMB']

const DEFAULT_CUSTOM_FIELD_KEYS = [
  { key: 'company', label: 'Company' },
  { key: 'designation', label: 'Designation' },
  { key: 'gst_number', label: 'GST Number' },
  { key: 'order_count', label: 'Total Orders' },
  { key: 'lifetime_value', label: 'Lifetime Value (₹)' },
  { key: 'city', label: 'City' },
  { key: 'language', label: 'Preferred Language' },
]

export default function ContactsPage() {
  const supabase = createClient()
  const [contacts, setContacts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; mode: 'new' | 'edit'; contact: ContactWithCustom }>({ open: false, mode: 'new', contact: {} })
  const [customFieldDefs, setCustomFieldDefs] = useState(DEFAULT_CUSTOM_FIELD_KEYS)
  const [addingField, setAddingField] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!p) return
    setWorkspaceId(p.workspace_id)
    load(p.workspace_id)
  }

  async function load(wsId?: string) {
    const id = wsId || workspaceId
    if (!id) return
    const { data } = await supabase.from('contacts').select('*').eq('workspace_id', id).order('created_at', { ascending: false })
    if (data) setContacts(data)
  }

  function upd(field: string, val: any) {
    setModal(m => ({ ...m, contact: { ...m.contact, [field]: val } }))
  }

  function updCustom(key: string, val: string) {
    const existing = modal.contact.custom_fields ?? []
    const updated = existing.some(f => f.key === key)
      ? existing.map(f => f.key === key ? { ...f, value: val } : f)
      : [...existing, { key, label: customFieldDefs.find(d => d.key === key)?.label ?? key, value: val }]
    upd('custom_fields', updated)
  }

  function getCustomVal(key: string): string {
    return modal.contact.custom_fields?.find(f => f.key === key)?.value ?? ''
  }

  function addCustomField() {
    if (!newFieldLabel.trim()) return
    const key = newFieldLabel.toLowerCase().replace(/\s+/g, '_')
    if (customFieldDefs.some(f => f.key === key)) { alert('Field already exists'); return }
    setCustomFieldDefs(prev => [...prev, { key, label: newFieldLabel.trim() }])
    setNewFieldLabel(''); setAddingField(false)
  }

  async function save() {
    if (!workspaceId) return
    setSaving(true)
    const c = modal.contact
    const row: any = {
      name: c.name || null,
      phone: c.phone ? c.phone.replace(/[\s\-\+\(\)]/g, '') : null,
      email: c.email || null,
      instagram_username: c.instagram_username ? c.instagram_username.replace('@', '') : null,
      facebook_id: c.facebook_id || null,
      tags: c.tags || [],
      notes: c.notes || null,
      meta: { ...(c as any).meta, custom_fields: c.custom_fields ?? [] },
    }

    if (modal.mode === 'new') {
      const { error } = await supabase.from('contacts').insert({ workspace_id: workspaceId, ...row })
      if (error) { alert(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('contacts').update({ ...row, updated_at: new Date().toISOString() }).eq('id', c.id!)
      if (error) { alert(error.message); setSaving(false); return }
    }
    setSaving(false)
    setModal({ open: false, mode: 'new', contact: {} })
    load()
  }

  function openEdit(c: any) {
    setModal({ open: true, mode: 'edit', contact: { ...c, custom_fields: c.meta?.custom_fields ?? [] } })
  }

  async function del(id: string) {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  async function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return
    const text = await file.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) { alert('CSV must have header + data rows'); return }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''))
    const col = (h: string) => headers.findIndex(x => x.includes(h))
    const ni = col('name'), pi = col('phone'), ei = col('email'), ii = col('insta'), fi = col('facebook'), ti = col('tag')
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      return {
        workspace_id: workspaceId,
        name: ni >= 0 ? cols[ni] || null : null,
        phone: pi >= 0 ? cols[pi]?.replace(/[\s\-\+\(\)]/g, '') || null : null,
        email: ei >= 0 ? cols[ei] || null : null,
        instagram_username: ii >= 0 ? cols[ii]?.replace('@', '') || null : null,
        facebook_id: fi >= 0 ? cols[fi] || null : null,
        tags: ti >= 0 && cols[ti] ? cols[ti].split(';').map(t => t.trim()) : [],
      }
    }).filter(r => r.name || r.phone)
    if (!rows.length) { alert('No valid rows'); return }
    const { error } = await supabase.from('contacts').upsert(rows, { onConflict: 'workspace_id,phone', ignoreDuplicates: false })
    if (error) { alert(error.message); return }
    alert(`✅ Imported ${rows.length} contacts`)
    load()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filtered = contacts.filter(c =>
    !search ||
    (c.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.instagram_username ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const tags = modal.contact.tags ?? []

  return (
    <div className="generic-page">
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={importCSV} />
      <div className="page-header">
        <span className="page-title"><i className="fa-solid fa-user-group" style={{ color: 'var(--accent)', marginRight: 8 }} />Contacts</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}><i className="fa-solid fa-file-import" /> Import CSV</button>
          <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'new', contact: { tags: [], custom_fields: [] } })}><i className="fa-solid fa-plus" /> New Contact</button>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total</div><div className="stat-val">{contacts.length}</div></div>
          <div className="stat-card"><div className="stat-label"><i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }} /> WA</div><div className="stat-val">{contacts.filter(c => c.phone).length}</div></div>
          <div className="stat-card"><div className="stat-label"><i className="fa-brands fa-instagram" style={{ color: '#e1306c' }} /> IG</div><div className="stat-val">{contacts.filter(c => c.instagram_username).length}</div></div>
          <div className="stat-card"><div className="stat-label"><i className="fa-brands fa-facebook" style={{ color: '#1877f2' }} /> FB</div><div className="stat-val">{contacts.filter(c => c.facebook_id).length}</div></div>
        </div>
        <div className="contacts-toolbar">
          <div className="search-input-wrap" style={{ width: 280 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search by name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>CSV: name, phone, email, instagram, facebook, tags</span>
        </div>
        <div className="data-table">
          <div className="table-header"><span className="table-title">All Contacts</span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} contacts</span></div>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Social</th><th>Tags</th><th>Added</th><th style={{ width: 70 }}></th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
                  <td className="primary">{c.name || '—'}</td>
                  <td>{c.phone ? <><i className="fa-brands fa-whatsapp" style={{ color: '#25d366', fontSize: 11, marginRight: 4 }} />{c.phone}</> : '—'}</td>
                  <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                  <td style={{ fontSize: 11 }}>
                    {c.instagram_username && <div><i className="fa-brands fa-instagram" style={{ color: '#e1306c', marginRight: 3 }} />@{c.instagram_username}</div>}
                    {c.facebook_id && <div><i className="fa-brands fa-facebook" style={{ color: '#1877f2', marginRight: 3 }} />{c.facebook_id.slice(0, 12)}…</div>}
                    {!c.instagram_username && !c.facebook_id && '—'}
                  </td>
                  <td>{(c.tags || []).map((t: string) => <span key={t} className="pill green" style={{ marginRight: 3, marginBottom: 2 }}>{t}</span>)}</td>
                  <td style={{ fontSize: 11 }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" onClick={() => openEdit(c)}><i className="fa-solid fa-pen" style={{ fontSize: 11 }} /></button>
                      <button className="icon-btn" onClick={() => del(c.id)}><i className="fa-solid fa-trash" style={{ fontSize: 11, color: '#e84040' }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                  {contacts.length === 0 ? 'Contacts appear when someone messages you, or click New Contact.' : 'No results.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="tpl-modal-overlay open" onClick={() => setModal(m => ({ ...m, open: false }))}>
          <div className="tpl-modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className={`fa-solid ${modal.mode === 'new' ? 'fa-plus' : 'fa-pen'}`} style={{ color: 'var(--accent)', marginRight: 6, fontSize: 12 }} />
                {modal.mode === 'new' ? 'New Contact' : 'Edit Contact'}
              </div>
              <button className="icon-btn" onClick={() => setModal(m => ({ ...m, open: false }))}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="tpl-modal-body" style={{ gap: 0 }}>

              {/* Basic Info */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Basic Info</div>
                <div className="form-row">
                  <div><div className="form-label">Full Name</div><input className="form-input" value={modal.contact.name ?? ''} onChange={e => upd('name', e.target.value)} placeholder="Pintu Kumar" /></div>
                  <div><div className="form-label">Email</div><input className="form-input" type="email" value={modal.contact.email ?? ''} onChange={e => upd('email', e.target.value)} placeholder="email@example.com" /></div>
                </div>
              </div>

              {/* Channels */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>Messaging Channels</div>
                <div className="form-row">
                  <div>
                    <div className="form-label"><i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: 4 }} />WhatsApp Phone</div>
                    <input className="form-input" value={modal.contact.phone ?? ''} onChange={e => upd('phone', e.target.value)} placeholder="919354231262" />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>With country code, no +</div>
                  </div>
                  <div>
                    <div className="form-label"><i className="fa-brands fa-instagram" style={{ color: '#e1306c', marginRight: 4 }} />Instagram Username</div>
                    <input className="form-input" value={modal.contact.instagram_username ?? ''} onChange={e => upd('instagram_username', e.target.value)} placeholder="username (no @)" />
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-label"><i className="fa-brands fa-facebook" style={{ color: '#1877f2', marginRight: 4 }} />Facebook ID</div>
                  <input className="form-input" value={modal.contact.facebook_id ?? ''} onChange={e => upd('facebook_id', e.target.value)} placeholder="Auto-filled when they message via Facebook" />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>This is set automatically when contact messages via Facebook Messenger</div>
                </div>
              </div>

              {/* Tags */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TAG_OPTIONS.map(tag => (
                    <div key={tag} onClick={() => upd('tags', tags.includes(tag) ? tags.filter((t: string) => t !== tag) : [...tags, tag])}
                      style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, cursor: 'pointer', border: '1px solid', borderColor: tags.includes(tag) ? 'var(--accent)' : 'var(--border)', background: tags.includes(tag) ? 'var(--accent-glow)' : 'var(--bg-surface)', color: tags.includes(tag) ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {tags.includes(tag) && <i className="fa-solid fa-check" style={{ fontSize: 9, marginRight: 4 }} />}{tag}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Custom Fields</div>
                  <button onClick={() => setAddingField(v => !v)} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <i className="fa-solid fa-plus" style={{ marginRight: 3 }} />Add Field
                  </button>
                </div>

                {addingField && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input className="form-input" style={{ flex: 1 }} value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="Field name (e.g. Company, GST Number)" onKeyDown={e => { if (e.key === 'Enter') addCustomField() }} />
                    <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={addCustomField}>Add</button>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => { setAddingField(false); setNewFieldLabel('') }}>Cancel</button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {customFieldDefs.map(field => (
                    <div key={field.key}>
                      <div className="form-label" style={{ fontSize: 10 }}>{field.label}</div>
                      <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} value={getCustomVal(field.key)} onChange={e => updCustom(field.key, e.target.value)} placeholder={field.label} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>Notes</div>
                <textarea className="form-input" rows={2} value={modal.contact.notes ?? ''} onChange={e => upd('notes', e.target.value)} placeholder="Internal notes about this contact…" style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : modal.mode === 'new' ? 'Create Contact' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
