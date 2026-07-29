'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { List } from '@/types'

export default function ListsPage() {
  const supabase = createClient()
  const [lists, setLists] = useState<List[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [modal, setModal] = useState<{ open: boolean; mode: 'new' | 'edit'; list: Partial<List> }>({ open: false, mode: 'new', list: {} })
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!p) return
    setWorkspaceId(p.workspace_id)
    load(p.workspace_id)
  }

  async function load(wsId: string) {
    try {
      const res = await fetch(`/api/lists?workspace_id=${wsId}`)
      const data = await res.json()
      if (data.lists) {
        setLists(data.lists)
      }
    } catch (e) {
      console.error(e)
    }
  }

  function upd(field: keyof List, val: any) {
    setModal(m => ({ ...m, list: { ...m.list, [field]: val } }))
  }

  async function save() {
    if (!workspaceId) return
    setSaving(true)
    const { id, name, description } = modal.list
    
    try {
      const url = '/api/lists'
      const method = modal.mode === 'new' ? 'POST' : 'PUT'
      const body = modal.mode === 'new' 
        ? { workspace_id: workspaceId, name, description, type: 'static', visibility: 'shared', active_count: 1250 } 
        : { id, workspace_id: workspaceId, name, description }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setModal({ open: false, mode: 'new', list: {} })
      load(workspaceId)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    if (!confirm('Are you sure you want to delete this list?')) return
    try {
      await fetch(`/api/lists?id=${id}&workspace_id=${workspaceId}`, { method: 'DELETE' })
      load(workspaceId)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="generic-page">
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-list-ul" style={{ color: 'var(--accent)', marginRight: 8 }} />
          Static Lists
        </span>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'new', list: {} })}>
          <i className="fa-solid fa-plus" /> Create List
        </button>
      </div>

      <div className="page-body">
        <div className="data-table">
          <div className="table-header">
            <span className="table-title">Your Lists</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Subscribers</th>
                <th>Created</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {lists.map(list => (
                <tr key={list.id}>
                  <td><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{list.name}</div></td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{list.description || '—'}</td>
                  <td>
                    <div className="pill green" style={{ padding: '4px 10px' }}>
                      <i className="fa-solid fa-user" style={{ marginRight: 6 }} />{list.contact_count || 0}
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{new Date(list.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" onClick={() => setModal({ open: true, mode: 'edit', list })}><i className="fa-solid fa-pen" style={{ fontSize: 11 }} /></button>
                      <button className="icon-btn" onClick={() => del(list.id)}><i className="fa-solid fa-trash" style={{ fontSize: 11, color: '#e84040' }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {lists.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No lists created yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="tpl-modal-overlay open" onClick={() => setModal(m => ({ ...m, open: false }))}>
          <div className="tpl-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">{modal.mode === 'new' ? 'Create New List' : 'Edit List'}</div>
              <button className="icon-btn" onClick={() => setModal(m => ({ ...m, open: false }))}><i className="fa-solid fa-xmark" /></button>
            </div>
            
            <div className="tpl-modal-body">
              <div className="form-group">
                <div className="form-label">List Name</div>
                <input className="form-input" value={modal.list.name ?? ''} onChange={e => upd('name', e.target.value)} placeholder="e.g. Newsletter Subscribers" />
              </div>
              <div className="form-group">
                <div className="form-label">Description (Optional)</div>
                <textarea className="form-input" rows={3} value={modal.list.description ?? ''} onChange={e => upd('description', e.target.value)} />
              </div>
            </div>
            
            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save List'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
