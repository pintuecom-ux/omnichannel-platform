'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { List } from '@/types'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'

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
    <div className="flex h-full w-full flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Static Lists</h1>
          <p className="text-sm text-text-secondary mt-1">Manage static audiences and imported contact lists.</p>
        </div>
        <Button icon="fa-solid fa-plus" variant="primary" onClick={() => setModal({ open: true, mode: 'new', list: {} })}>
          Create List
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between pb-4">
        <div className="w-[320px]">
          <Input 
            placeholder="Search lists..." 
            icon="fa-solid fa-magnifying-glass"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon="fa-solid fa-filter">Filters</Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">List Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Subscribers</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLists.map(list => (
              <TableRow key={list.id}>
                <TableCell>
                  <div className="font-medium text-text-primary">{list.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-text-secondary">{list.description || '—'}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="success" icon="fa-solid fa-user">
                    {list.contact_count || 0}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-text-secondary">{new Date(list.created_at).toLocaleDateString()}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" icon="fa-solid fa-pen" onClick={() => setModal({ open: true, mode: 'edit', list })} />
                    <Button variant="ghost" size="icon" icon="fa-solid fa-trash" className="text-danger-500 hover:text-danger-600 hover:bg-danger-500/10" onClick={() => del(list.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredLists.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-text-secondary">
                  {search ? 'No lists found matching your search.' : 'No lists created yet.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Modal open={modal.open} onOpenChange={(open) => !open && setModal(m => ({ ...m, open: false }))}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{modal.mode === 'new' ? 'Create New List' : 'Edit List'}</ModalTitle>
          </ModalHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input 
              label="List Name" 
              placeholder="e.g. Newsletter Subscribers" 
              value={modal.list.name ?? ''} 
              onChange={e => upd('name', e.target.value)} 
            />
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-text-primary">Description (Optional)</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                rows={3} 
                value={modal.list.description ?? ''} 
                onChange={e => upd('description', e.target.value)} 
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>
              {modal.mode === 'new' ? 'Create List' : 'Save Changes'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
