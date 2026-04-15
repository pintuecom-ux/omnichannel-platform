'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact } from '@/types'

export default function ContactsPage() {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadContacts()
  }, [])

  async function loadContacts() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!profile) return
    const { data } = await supabase.from('contacts').select('*').eq('workspace_id', profile.workspace_id).order('created_at', { ascending: false })
    if (data) setContacts(data)
  }

  const filtered = contacts.filter(c =>
    !search || (c.name ?? '').toLowerCase().includes(search.toLowerCase()) || (c.phone ?? '').includes(search)
  )

  return (
    <div className="generic-page">
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-user-group" style={{ color: 'var(--accent)', marginRight: 8 }} />
          Contacts
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><i className="fa-solid fa-file-import" /> Import CSV</button>
          <button className="btn btn-primary"><i className="fa-solid fa-plus" /> New Contact</button>
        </div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total Contacts</div><div className="stat-val">{contacts.length}</div></div>
          <div className="stat-card"><div className="stat-label">WhatsApp</div><div className="stat-val">{contacts.filter(c => c.phone).length}</div></div>
          <div className="stat-card"><div className="stat-label">Instagram</div><div className="stat-val">{contacts.filter(c => c.instagram_username).length}</div></div>
          <div className="stat-card"><div className="stat-label">Facebook</div><div className="stat-val">{contacts.filter(c => c.facebook_id).length}</div></div>
        </div>

        <div className="contacts-toolbar">
          <div className="search-input-wrap" style={{ width: 280 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary"><i className="fa-solid fa-filter" /> Filter</button>
        </div>

        <div className="data-table">
          <div className="table-header"><span className="table-title">All Contacts</span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} contacts</span></div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Instagram</th><th>Tags</th><th>Added</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td className="primary">{c.name || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.instagram_username ? `@${c.instagram_username}` : '—'}</td>
                  <td>{(c.tags || []).map(t => <span key={t} className="pill green" style={{ marginRight: 4 }}>{t}</span>)}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                  <td><button className="icon-btn"><i className="fa-solid fa-message" /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No contacts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}