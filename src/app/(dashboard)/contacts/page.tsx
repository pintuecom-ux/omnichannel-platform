'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact } from '@/types'

interface ModalState {
  open: boolean
  mode: 'new' | 'edit'
  contact: Partial<Contact>
}

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
    const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!profile) return
    setWorkspaceId(profile.workspace_id)
    loadContacts(profile.workspace_id)
  }

  async function loadContacts(wsId?: string) {
    const id = wsId || workspaceId
    if (!id) return
    const { data } = await supabase.from('contacts').select('*').eq('workspace_id', id).order('created_at', { ascending: false })
    if (data) setContacts(data as Contact[])
  }

  function openNew() {
    setModal({ open: true, mode: 'new', contact: { tags: [] } })
  }

  function openEdit(c: Contact) {
    setModal({ open: true, mode: 'edit', contact: { ...c } })
  }

  function closeModal() {
    setModal({ open: false, mode: 'new', contact: {} })
  }

  function updateField(field: keyof Contact, value: any) {
    setModal(m => ({ ...m, contact: { ...m.contact, [field]: value } }))
  }

  async function saveContact() {
    if (!workspaceId) return
    setSaving(true)
    const c = modal.contact

    if (modal.mode === 'new') {
      const { error } = await supabase.from('contacts').insert({
        workspace_id: workspaceId,
        name: c.name || null,
        phone: c.phone ? c.phone.replace(/[\s\-\+\(\)]/g, '') : null,
        email: c.email || null,
        instagram_username: c.instagram_username || null,
        tags: c.tags || [],
        notes: c.notes || null,
      })
      if (error) { alert(`Error: ${error.message}`); setSaving(false); return }
    } else {
      const { error } = await supabase.from('contacts').update({
        name: c.name,
        phone: c.phone ? c.phone.replace(/[\s\-\+\(\)]/g, '') : null,
        email: c.email,
        instagram_username: c.instagram_username,
        tags: c.tags || [],
        notes: c.notes,
        updated_at: new Date().toISOString(),
      }).eq('id', c.id!)
      if (error) { alert(`Error: ${error.message}`); setSaving(false); return }
    }

    setSaving(false)
    closeModal()
    loadContacts()
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return

    const text = await file.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) { alert('CSV must have a header row and at least one data row'); return }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''))
    const nameIdx  = headers.findIndex(h => h.includes('name'))
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'))
    const emailIdx = headers.findIndex(h => h.includes('email'))
    const igIdx    = headers.findIndex(h => h.includes('instagram') || h.includes('ig'))
    const tagsIdx  = headers.findIndex(h => h.includes('tag'))

    if (phoneIdx === -1 && nameIdx === -1) {
      alert('CSV must have at least a "name" or "phone" column')
      return
    }

    const rows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      return {
        workspace_id: workspaceId,
        name:   nameIdx  >= 0 ? cols[nameIdx]  || null : null,
        phone:  phoneIdx >= 0 ? cols[phoneIdx]?.replace(/[\s\-\+\(\)]/g, '') || null : null,
        email:  emailIdx >= 0 ? cols[emailIdx] || null : null,
        instagram_username: igIdx >= 0 ? cols[igIdx] || null : null,
        tags:   tagsIdx  >= 0 ? (cols[tagsIdx] ? cols[tagsIdx].split(';').map(t => t.trim()) : []) : [],
      }
    }).filter(r => r.name || r.phone)

    if (rows.length === 0) { alert('No valid rows found'); return }

    const { error } = await supabase.from('contacts').upsert(rows, {
      onConflict: 'workspace_id,phone',
      ignoreDuplicates: false,
    })

    if (error) { alert(`Import error: ${error.message}`); return }
    alert(`✅ Imported ${rows.length} contacts`)
    loadContacts()

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filtered = contacts.filter(c =>
    !search ||
    (c.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const tagInput = (modal.contact.tags ?? []).join(', ')

  return (
    <div className="generic-page">
      {/* Hidden file input for CSV */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleCSVImport}
      />

      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-user-group" style={{ color: 'var(--accent)', marginRight: 8 }} />
          Contacts
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <i className="fa-solid fa-file-import" /> Import CSV
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <i className="fa-solid fa-plus" /> New Contact
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total Contacts</div><div className="stat-val">{contacts.length}</div></div>
          <div className="stat-card"><div className="stat-label">WhatsApp</div><div className="stat-val">{contacts.filter(c => c.phone).length}</div></div>
          <div className="stat-card"><div className="stat-label">Instagram</div><div className="stat-val">{contacts.filter(c => c.instagram_username).length}</div></div>
          <div className="stat-card"><div className="stat-label">Tagged</div><div className="stat-val">{contacts.filter(c => (c.tags ?? []).length > 0).length}</div></div>
        </div>

        <div className="contacts-toolbar">
          <div className="search-input-wrap" style={{ width: 280 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            CSV format: name, phone, email, instagram, tags (semicolon-separated)
          </span>
        </div>

        <div className="data-table">
          <div className="table-header">
            <span className="table-title">All Contacts</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} contacts</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Email</th><th>Instagram</th><th>Tags</th><th>Added</th><th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
                  <td className="primary">{c.name || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.instagram_username ? `@${c.instagram_username}` : '—'}</td>
                  <td>
                    {(c.tags || []).map(t => (
                      <span key={t} className="pill green" style={{ marginRight: 4 }}>{t}</span>
                    ))}
                  </td>
                  <td>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(c)}>
                        <i className="fa-solid fa-pen" style={{ fontSize: 12 }} />
                      </button>
                      <button className="icon-btn" title="Delete" onClick={() => deleteContact(c.id)}>
                        <i className="fa-solid fa-trash" style={{ fontSize: 12, color: '#e84040' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                    {contacts.length === 0
                      ? 'No contacts yet. They are added automatically when someone messages you, or click New Contact.'
                      : 'No contacts match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Modal */}
      {modal.open && (
        <div
          className="tpl-modal-overlay open"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="tpl-modal">
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className={`fa-solid ${modal.mode === 'new' ? 'fa-plus' : 'fa-pen'}`}
                   style={{ color: 'var(--accent)', marginRight: 6, fontSize: 12 }} />
                {modal.mode === 'new' ? 'New Contact' : 'Edit Contact'}
              </div>
              <button className="icon-btn" onClick={closeModal}><i className="fa-solid fa-xmark" /></button>
            </div>

            <div className="tpl-modal-body">
              <div className="form-row">
                <div>
                  <div className="form-label">Name</div>
                  <input
                    className="form-input"
                    placeholder="Full name"
                    value={modal.contact.name ?? ''}
                    onChange={e => updateField('name', e.target.value)}
                  />
                </div>
                <div>
                  <div className="form-label">Phone (WhatsApp)</div>
                  <input
                    className="form-input"
                    placeholder="919354231262"
                    value={modal.contact.phone ?? ''}
                    onChange={e => updateField('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <div className="form-label">Email</div>
                  <input
                    className="form-input"
                    placeholder="email@example.com"
                    value={modal.contact.email ?? ''}
                    onChange={e => updateField('email', e.target.value)}
                  />
                </div>
                <div>
                  <div className="form-label">Instagram Username</div>
                  <input
                    className="form-input"
                    placeholder="username (no @)"
                    value={modal.contact.instagram_username ?? ''}
                    onChange={e => updateField('instagram_username', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="form-label">Tags (comma-separated)</div>
                <input
                  className="form-input"
                  placeholder="VIP, Lead, B2B"
                  value={tagInput}
                  onChange={e => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                />
              </div>

              <div className="form-group">
                <div className="form-label">Notes</div>
                <textarea
                  className="form-input"
                  placeholder="Internal notes about this contact…"
                  rows={3}
                  value={modal.contact.notes ?? ''}
                  onChange={e => updateField('notes', e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={saveContact} disabled={saving}>
                {saving ? <><i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : (modal.mode === 'new' ? 'Create Contact' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}
