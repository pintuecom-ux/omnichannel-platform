'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact } from '@/types'

interface ModalState { open: boolean; mode: 'new' | 'edit'; contact: Partial<Contact> }

const TAG_OPTIONS = ['VIP', 'Lead', 'Hot Lead', 'B2B', 'Repeat Buyer', 'Wholesale', 'Delhi NCR', 'Mumbai', 'Bangalore']

export default function ContactsPage() {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'new', contact: {} })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!p) return
    setWorkspaceId(p.workspace_id)
    loadContacts(p.workspace_id)
  }

  async function loadContacts(wsId?: string) {
    const id = wsId || workspaceId
    if (!id) return
    const { data } = await supabase.from('contacts').select('*').eq('workspace_id', id).order('created_at', { ascending: false })
    if (data) setContacts(data as Contact[])
  }

  function upd(field: keyof Contact, val: any) {
    setModal(m => ({ ...m, contact: { ...m.contact, [field]: val } }))
  }

  async function save() {
    if (!workspaceId) return
    setSaving(true)
    const c = modal.contact
    const row = {
      name: c.name || null,
      phone: c.phone ? c.phone.replace(/[\s\-\+\(\)]/g, '') : null,
      email: c.email || null,
      instagram_username: c.instagram_username ? c.instagram_username.replace('@', '') : null,
      facebook_id: c.facebook_id || null,
      tags: c.tags || [],
      notes: c.notes || null,
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
    loadContacts()
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
    loadContacts()
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
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <i className="fa-solid fa-file-import" /> Import CSV
          </button>
          <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'new', contact: { tags: [] } })}>
            <i className="fa-solid fa-plus" /> New Contact
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total</div><div className="stat-val">{contacts.length}</div></div>
          <div className="stat-card"><div className="stat-label"><i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }} /> WhatsApp</div><div className="stat-val">{contacts.filter(c => c.phone).length}</div></div>
          <div className="stat-card"><div className="stat-label"><i className="fa-brands fa-instagram" style={{ color: '#e1306c' }} /> Instagram</div><div className="stat-val">{contacts.filter(c => c.instagram_username).length}</div></div>
          <div className="stat-card"><div className="stat-label"><i className="fa-brands fa-facebook" style={{ color: '#1877f2' }} /> Facebook</div><div className="stat-val">{contacts.filter(c => c.facebook_id).length}</div></div>
        </div>

        <div className="contacts-toolbar">
          <div className="search-input-wrap" style={{ width: 280 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>CSV columns: name, phone, email, instagram, facebook, tags (;-separated)</span>
        </div>

        <div className="data-table">
          <div className="table-header">
            <span className="table-title">All Contacts</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} contacts</span>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Email</th><th>Social</th><th>Tags</th><th>Added</th><th style={{ width: 70 }}></th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setModal({ open: true, mode: 'edit', contact: { ...c } })}>
                  <td className="primary">{c.name || '—'}</td>
                  <td>{c.phone ? <><i className="fa-brands fa-whatsapp" style={{ color: '#25d366', fontSize: 11, marginRight: 4 }} />{c.phone}</> : '—'}</td>
                  <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                  <td style={{ fontSize: 11 }}>
                    {c.instagram_username && <div><i className="fa-brands fa-instagram" style={{ color: '#e1306c', marginRight: 3 }} />@{c.instagram_username}</div>}
                    {c.facebook_id && <div><i className="fa-brands fa-facebook" style={{ color: '#1877f2', marginRight: 3 }} />{c.facebook_id.slice(0, 12)}…</div>}
                    {!c.instagram_username && !c.facebook_id && '—'}
                  </td>
                  <td>{(c.tags || []).map(t => <span key={t} className="pill green" style={{ marginRight: 4, marginBottom: 2 }}>{t}</span>)}</td>
                  <td style={{ fontSize: 11 }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" title="Edit" onClick={() => setModal({ open: true, mode: 'edit', contact: { ...c } })}>
                        <i className="fa-solid fa-pen" style={{ fontSize: 11 }} />
                      </button>
                      <button className="icon-btn" title="Delete" onClick={() => del(c.id)}>
                        <i className="fa-solid fa-trash" style={{ fontSize: 11, color: '#e84040' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                  {contacts.length === 0 ? 'Contacts appear automatically when someone messages you, or click New Contact.' : 'No contacts match your search.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="tpl-modal-overlay open" onClick={() => setModal(m => ({ ...m, open: false }))}>
          <div className="tpl-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className={`fa-solid ${modal.mode === 'new' ? 'fa-plus' : 'fa-pen'}`} style={{ color: 'var(--accent)', marginRight: 6, fontSize: 12 }} />
                {modal.mode === 'new' ? 'New Contact' : 'Edit Contact'}
              </div>
              <button className="icon-btn" onClick={() => setModal(m => ({ ...m, open: false }))}><i className="fa-solid fa-xmark" /></button>
            </div>

            <div className="tpl-modal-body">
              <div className="form-row">
                <div>
                  <div className="form-label">Full Name</div>
                  <input className="form-input" value={modal.contact.name ?? ''} onChange={e => upd('name', e.target.value)} placeholder="Pintu Kumar" />
                </div>
                <div>
                  <div className="form-label">Email</div>
                  <input className="form-input" type="email" value={modal.contact.email ?? ''} onChange={e => upd('email', e.target.value)} placeholder="email@example.com" />
                </div>
              </div>

              <div style={{ padding: '12px 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                <i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: 6 }} />WhatsApp
              </div>
              <div className="form-group">
                <div className="form-label">Phone Number</div>
                <input className="form-input" value={modal.contact.phone ?? ''} onChange={e => upd('phone', e.target.value)} placeholder="919354231262 (no + needed)" />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Include country code, e.g. 91 for India</div>
              </div>

              <div style={{ padding: '12px 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: '1px solid var(--border)' }}>
                <i className="fa-brands fa-instagram" style={{ color: '#e1306c', marginRight: 6 }} />Instagram
              </div>
              <div className="form-group">
                <div className="form-label">Instagram Username</div>
                <input className="form-input" value={modal.contact.instagram_username ?? ''} onChange={e => upd('instagram_username', e.target.value)} placeholder="username (without @)" />
              </div>

              <div style={{ padding: '12px 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: '1px solid var(--border)' }}>
                <i className="fa-brands fa-facebook" style={{ color: '#1877f2', marginRight: 6 }} />Facebook
              </div>
              <div className="form-group">
                <div className="form-label">Facebook User ID</div>
                <input className="form-input" value={modal.contact.facebook_id ?? ''} onChange={e => upd('facebook_id', e.target.value)} placeholder="Facebook Page-Scoped User ID" />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>This is set automatically when the contact messages via Facebook</div>
              </div>

              <div style={{ padding: '12px 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: '1px solid var(--border)' }}>
                Tags & Notes
              </div>
              <div className="form-group">
                <div className="form-label">Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TAG_OPTIONS.map(tag => (
                    <div key={tag}
                      onClick={() => upd('tags', tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag])}
                      style={{
                        padding: '3px 10px', borderRadius: 10, fontSize: 11, cursor: 'pointer',
                        border: '1px solid',
                        borderColor: tags.includes(tag) ? 'var(--accent)' : 'var(--border)',
                        background: tags.includes(tag) ? 'var(--accent-glow)' : 'var(--bg-surface)',
                        color: tags.includes(tag) ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                      {tags.includes(tag) && <i className="fa-solid fa-check" style={{ fontSize: 9, marginRight: 4 }} />}
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">Notes</div>
                <textarea className="form-input" rows={2} value={modal.contact.notes ?? ''} onChange={e => upd('notes', e.target.value)} placeholder="Internal notes…" style={{ resize: 'vertical' }} />
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
