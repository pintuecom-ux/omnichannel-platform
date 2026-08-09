'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { List } from '@/types'
import Button from '@/components/ui/Button'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'
import { List as ListIcon, Search, Filter, Plus, Edit2, Trash2, Users } from 'lucide-react'

export default function ListsPage() {
  const supabase = createClient()
  const [lists, setLists] = useState<List[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [modal, setModal] = useState<{ open: boolean; mode: 'new' | 'edit'; list: Partial<List> }>({ open: false, mode: 'new', list: {} })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

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
        ? { workspace_id: workspaceId, name, description, type: 'static', visibility: 'shared', active_count: 0 } 
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

  const filteredLists = lists.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Decorative Background Glow */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 -z-10"></div>

      <header className="h-20 px-6 flex items-center justify-between flex-none z-10 border-b border-border/50 glass-panel">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm flex items-center gap-3">
            <ListIcon className="text-purple-400 w-6 h-6" /> Static Lists
          </h1>
          <p className="text-sm text-text-secondary mt-1">Manage static audiences and imported contact lists</p>
        </div>
        <button 
          onClick={() => setModal({ open: true, mode: 'new', list: {} })}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] border border-purple-400/50"
        >
          <Plus className="w-4 h-4" /> Create List
        </button>
      </header>

      <div className="flex-1 p-6 flex flex-col gap-6 z-10 overflow-hidden">
        <div className="flex items-center justify-between flex-none">
          <div className="relative w-[380px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search lists..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
            />
          </div>
          <button className="bg-surface border border-border hover:border-text-secondary text-text-secondary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="flex-1 glass-panel rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border relative min-h-0">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-panel/80 sticky top-0 z-20 backdrop-blur-md shadow-sm border-b border-border">
                <tr>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border w-[300px]">List Name</th>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Description</th>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Subscribers</th>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Created</th>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border/50">
                {filteredLists.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-secondary">
                      {search ? 'No lists found matching your search.' : 'No lists created yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredLists.map(list => (
                    <tr key={list.id} className="table-row-hover group cursor-pointer border-b border-white/5">
                      <td className="py-4 px-5 font-semibold text-white">{list.name}</td>
                      <td className="py-4 px-5 text-text-secondary">{list.description || '—'}</td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <Users className="w-3 h-3" /> {list.contact_count || 0}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-text-secondary">{new Date(list.created_at).toLocaleDateString()}</td>
                      <td className="py-4 px-5 text-right">
                        <div className="row-actions flex justify-end gap-1">
                          <button onClick={() => setModal({ open: true, mode: 'edit', list })} className="p-1.5 text-text-secondary hover:text-white hover:bg-white/10 rounded-md transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => del(list.id)} className="p-1.5 text-text-secondary hover:text-danger-500 hover:bg-danger-500/10 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modal.open} onOpenChange={(open) => !open && setModal(m => ({ ...m, open: false }))}>
        <ModalContent className="sm:max-w-[425px]">
          <ModalHeader>
            <ModalTitle>{modal.mode === 'new' ? 'Create New List' : 'Edit List'}</ModalTitle>
          </ModalHeader>
          <div className="flex flex-col gap-4 py-4 px-[15px]">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">List Name</label>
              <input 
                type="text" 
                className="w-full bg-surface border border-border focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-text-muted outline-none transition-all shadow-inner"
                placeholder="e.g. Newsletter Subscribers"
                value={modal.list.name ?? ''} 
                onChange={e => upd('name', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Description (Optional)</label>
              <textarea 
                className="flex min-h-[80px] w-full bg-surface border border-border focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 text-sm text-white shadow-inner transition-all outline-none"
                rows={3} 
                placeholder="What is this list for?"
                value={modal.list.description ?? ''} 
                onChange={e => upd('description', e.target.value)} 
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <button 
              onClick={save}
              disabled={saving}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-purple-400/50 transition-all disabled:opacity-50"
            >
              {modal.mode === 'new' ? 'Create List' : 'Save Changes'}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
