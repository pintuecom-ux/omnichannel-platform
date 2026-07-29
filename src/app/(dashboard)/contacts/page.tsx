'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact } from '@/types'

const TAG_OPTIONS = ['VIP', 'Lead', 'Hot Lead', 'B2B', 'Repeat Buyer', 'Wholesale', 'Delhi NCR', 'Mumbai', 'Bangalore', 'Enterprise', 'SMB']
const CHANNEL_STATUSES = ['subscribed', 'unsubscribed', 'pending', 'never_opted_in', 'suppressed']

export default function ContactsPage() {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Modal State
  const [modal, setModal] = useState<{ open: boolean; mode: 'new' | 'edit'; contact: Partial<Contact> }>({ open: false, mode: 'new', contact: {} })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { init() }, [])

  // Refetch when search or filterTag changes (with debounce in a real app)
  useEffect(() => {
    if (workspaceId) {
      const timer = setTimeout(() => load(workspaceId), 300)
      return () => clearTimeout(timer)
    }
  }, [search, filterTag, workspaceId])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!p) return
    setWorkspaceId(p.workspace_id)
  }

  async function load(wsId: string) {
    let url = `/api/contacts?workspace_id=${wsId}&limit=100`
    if (search) url += `&search=${encodeURIComponent(search)}`
    if (filterTag) url += `&tags=${encodeURIComponent(filterTag)}`

    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.contacts) {
        setContacts(data.contacts)
        setTotalContacts(data.total)
      }
    } catch (e) {
      console.error(e)
    }
  }

  function upd(field: keyof Contact, val: any) {
    setModal(m => ({ ...m, contact: { ...m.contact, [field]: val } }))
  }

  async function save() {
    if (!workspaceId) return
    setSaving(true)
    const c = modal.contact
    const row = {
      workspace_id: workspaceId,
      name: c.name || null,
      first_name: c.first_name || null,
      last_name: c.last_name || null,
      company_name: c.company_name || null,
      country: c.country || null,
      city: c.city || null,
      phone: c.phone ? c.phone.replace(/[\s\-\+\(\)]/g, '') : null,
      email: c.email || null,
      instagram_username: c.instagram_username ? c.instagram_username.replace('@', '') : null,
      facebook_id: c.facebook_id || null,
      tags: c.tags || [],
      wa_opt_in_status: c.wa_opt_in_status || 'pending',
      email_opt_in_status: c.email_opt_in_status || 'pending',
      sms_opt_in_status: c.sms_opt_in_status || 'pending',
      notes: c.notes || null,
    }

    try {
      const url = '/api/contacts'
      const method = modal.mode === 'new' ? 'POST' : 'PUT'
      const body = modal.mode === 'new' ? row : { id: c.id, ...row }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setModal({ open: false, mode: 'new', contact: {} })
      load(workspaceId)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(c: Contact) {
    setModal({ open: true, mode: 'edit', contact: { ...c } })
  }

  async function del(id: string) {
    if (!confirm('Delete this contact?')) return
    try {
      await fetch(`/api/contacts?id=${id}&workspace_id=${workspaceId}`, { method: 'DELETE' })
      load(workspaceId)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="generic-page">
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} />
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-user-group" style={{ color: 'var(--accent)', marginRight: 8 }} />
          Contacts
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}><i className="fa-solid fa-file-import" /> Import CSV</button>
          <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'new', contact: { tags: [], wa_opt_in_status: 'pending', email_opt_in_status: 'pending', sms_opt_in_status: 'pending' } })}>
            <i className="fa-solid fa-plus" /> New Contact
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="contacts-toolbar" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="search-input-wrap" style={{ width: 320 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ width: 180 }} value={filterTag} onChange={e => setFilterTag(e.target.value)}>
            <option value="">Filter by Tag (All)</option>
            {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="data-table">
          <div className="table-header">
            <span className="table-title">Audience Database</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalContacts} contacts found</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Channels & Consent</th>
                <th>Location</th>
                <th>Tags</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name || c.first_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.company_name || ''}</div>
                  </td>
                  <td>
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <i className="fa-brands fa-whatsapp" style={{ color: c.wa_opt_in_status === 'subscribed' ? '#25d366' : 'var(--text-muted)', width: 14 }} />
                        <span>{c.phone}</span>
                        {c.wa_opt_in_status === 'subscribed' && <span className="pill green" style={{ fontSize: 9 }}>Subscribed</span>}
                        {c.wa_opt_in_status === 'unsubscribed' && <span className="pill red" style={{ fontSize: 9 }}>Unsub</span>}
                      </div>
                    )}
                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
                        <i className="fa-solid fa-envelope" style={{ color: c.email_opt_in_status === 'subscribed' ? 'var(--accent)' : 'var(--text-muted)', width: 14 }} />
                        <span>Email</span>
                        {c.email_opt_in_status === 'subscribed' && <span className="pill green" style={{ fontSize: 9 }}>Subscribed</span>}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {c.city || c.country ? `${c.city || ''}${c.city && c.country ? ', ' : ''}${c.country || ''}` : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(c.tags || []).map((t: string) => <span key={t} className="pill green">{t}</span>)}
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" onClick={() => openEdit(c)}><i className="fa-solid fa-pen" style={{ fontSize: 11 }} /></button>
                      <button className="icon-btn" onClick={() => del(c.id)}><i className="fa-solid fa-trash" style={{ fontSize: 11, color: '#e84040' }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No contacts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="tpl-modal-overlay open" onClick={() => setModal(m => ({ ...m, open: false }))}>
          <div className="tpl-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                {modal.mode === 'new' ? 'Create Contact' : 'Edit Contact'}
              </div>
              <button className="icon-btn" onClick={() => setModal(m => ({ ...m, open: false }))}><i className="fa-solid fa-xmark" /></button>
            </div>
            
            <div className="tpl-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Profile Info</div>
              <div className="form-row">
                <div>
                  <div className="form-label">Full Name</div>
                  <input className="form-input" value={modal.contact.name ?? ''} onChange={e => upd('name', e.target.value)} />
                </div>
                <div>
                  <div className="form-label">Company</div>
                  <input className="form-input" value={modal.contact.company_name ?? ''} onChange={e => upd('company_name', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <div className="form-label">Country</div>
                  <input className="form-input" value={modal.contact.country ?? ''} onChange={e => upd('country', e.target.value)} />
                </div>
                <div>
                  <div className="form-label">City</div>
                  <input className="form-input" value={modal.contact.city ?? ''} onChange={e => upd('city', e.target.value)} />
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, marginTop: 24 }}>Channels & Consent</div>
              
              {/* WhatsApp */}
              <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}><i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: 6 }}/>WhatsApp</div>
                </div>
                <div className="form-row">
                  <div>
                    <div className="form-label">Phone Number</div>
                    <input className="form-input" value={modal.contact.phone ?? ''} onChange={e => upd('phone', e.target.value)} placeholder="919354231262" />
                  </div>
                  <div>
                    <div className="form-label">Opt-in Status</div>
                    <select className="form-input" value={modal.contact.wa_opt_in_status || 'pending'} onChange={e => upd('wa_opt_in_status', e.target.value)}>
                      {CHANNEL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}><i className="fa-solid fa-envelope" style={{ color: 'var(--accent)', marginRight: 6 }}/>Email</div>
                </div>
                <div className="form-row">
                  <div>
                    <div className="form-label">Email Address</div>
                    <input className="form-input" type="email" value={modal.contact.email ?? ''} onChange={e => upd('email', e.target.value)} />
                  </div>
                  <div>
                    <div className="form-label">Opt-in Status</div>
                    <select className="form-input" value={modal.contact.email_opt_in_status || 'pending'} onChange={e => upd('email_opt_in_status', e.target.value)}>
                      {CHANNEL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, marginTop: 24 }}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TAG_OPTIONS.map(tag => {
                  const tags = modal.contact.tags || []
                  const active = tags.includes(tag)
                  return (
                    <div key={tag} onClick={() => upd('tags', active ? tags.filter(t => t !== tag) : [...tags, tag])}
                      style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, cursor: 'pointer', border: '1px solid', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent-glow)' : 'var(--bg-surface)', color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {active && <i className="fa-solid fa-check" style={{ marginRight: 4 }} />}{tag}
                    </div>
                  )
                })}
              </div>

            </div>
            
            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Contact'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
