'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Segment, ConditionSet } from '@/types'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Filter } from 'lucide-react'

const FIELD_OPTIONS = [
  { value: 'tags', label: 'Tags' },
  { value: 'country', label: 'Country' },
  { value: 'city', label: 'City' },
  { value: 'wa_opt_in_status', label: 'WhatsApp Opt-in' },
  { value: 'email_opt_in_status', label: 'Email Opt-in' },
]

const OPERATOR_OPTIONS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Does Not Equal' },
  { value: 'contains', label: 'Contains' },
]

export default function SegmentsPage() {
  const supabase = createClient()
  const [segments, setSegments] = useState<Segment[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [modal, setModal] = useState<{ open: boolean; mode: 'new' | 'edit'; segment: Partial<Segment> }>({ open: false, mode: 'new', segment: {} })
  const [saving, setSaving] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  // Segment Builder State
  const [conditions, setConditions] = useState<any[]>([])
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND')

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
      const res = await fetch(`/api/segments?workspace_id=${wsId}`)
      const data = await res.json()
      if (data.segments) {
        setSegments(data.segments)
      }
    } catch (e) {
      console.error(e)
    }
  }

  function openModal(mode: 'new' | 'edit', seg?: Segment) {
    if (mode === 'new') {
      setModal({ open: true, mode, segment: { condition_set: { operator: 'AND', conditions: [] } } })
      setConditions([])
      setLogic('AND')
      setEstimatedCount(null)
    } else if (seg) {
      setModal({ open: true, mode, segment: seg })
      setConditions(seg.condition_set?.conditions || [])
      setLogic(seg.condition_set?.operator || 'AND')
      setEstimatedCount(seg.cached_count || null)
    }
  }

  function addRule() {
    setConditions(prev => [...prev, { field: 'tags', operator: 'contains', value: '' }])
  }

  function updateRule(index: number, field: string, val: any) {
    setConditions(prev => {
      const newConds = [...prev]
      newConds[index] = { ...newConds[index], [field]: val }
      return newConds
    })
  }

  function removeRule(index: number) {
    setConditions(prev => prev.filter((_, i) => i !== index))
  }

  async function save() {
    if (!workspaceId) return
    setSaving(true)
    const { id, name, description } = modal.segment
    const condition_set: ConditionSet = { operator: logic, conditions }
    
    try {
      const url = '/api/segments'
      const method = modal.mode === 'new' ? 'POST' : 'PUT'
      const body = modal.mode === 'new' 
        ? { workspace_id: workspaceId, name, description, condition_set, type: 'live', visibility: 'shared', cached_count: 0 } 
        : { id, workspace_id: workspaceId, name, description, condition_set }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      if (modal.mode === 'new' && data.segment?.id) {
         await fetch(`/api/segments/${data.segment.id}/evaluate?workspace_id=${workspaceId}`)
      }

      setModal({ open: false, mode: 'new', segment: {} })
      load(workspaceId)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    if (!confirm('Are you sure you want to delete this segment?')) return
    try {
      await fetch(`/api/segments?id=${id}&workspace_id=${workspaceId}`, { method: 'DELETE' })
      load(workspaceId)
    } catch (e) {
      console.error(e)
    }
  }

  async function refreshCount(id: string) {
    try {
      await fetch(`/api/segments/${id}/evaluate?workspace_id=${workspaceId}`)
      load(workspaceId)
    } catch (e) {
      console.error(e)
    }
  }

  const filteredSegments = segments.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-full w-full flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Dynamic Segments</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Rule-based audiences that update in real-time.</p>
        </div>
        <Button icon="fa-solid fa-plus" variant="primary" onClick={() => openModal('new')}>
          Create Segment
        </Button>
      </div>

      <div className="flex items-center justify-between pb-4">
        <div className="w-[320px]">
          <Input 
            placeholder="Search segments..." 
            icon="fa-solid fa-magnifying-glass"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Segment Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Matching Contacts</TableHead>
              <TableHead>Last Evaluated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSegments.map(seg => (
              <TableRow key={seg.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{seg.name}</span>
                    <Badge variant="ghost" size="xs">{seg.condition_set?.conditions?.length || 0} rules</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-[var(--text-secondary)]">{seg.description || '—'}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="info" icon="fa-solid fa-users">
                    {seg.cached_count || 0}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {seg.last_calculated_at ? new Date(seg.last_calculated_at).toLocaleString() : 'Never'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" icon="fa-solid fa-rotate-right" onClick={() => refreshCount(seg.id)} title="Refresh Count" />
                    <Button variant="ghost" size="icon" icon="fa-solid fa-pen" onClick={() => openModal('edit', seg)} />
                    <Button variant="ghost" size="icon" icon="fa-solid fa-trash" className="text-danger-500 hover:text-danger-600 hover:bg-danger-500/10" onClick={() => del(seg.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredSegments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <EmptyState 
                    title={search ? 'No segments found' : 'No segments yet'} 
                    description={search ? 'Adjust your search query.' : 'Create your first dynamic segment to organize contacts.'}
                    icon={<Filter />}
                    action={!search ? <Button variant="primary" onClick={() => openModal('new')}>Create Segment</Button> : undefined}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Modal open={modal.open} onOpenChange={(open) => !open && setModal(m => ({ ...m, open: false }))}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>{modal.mode === 'new' ? 'Create New Segment' : 'Edit Segment'}</ModalTitle>
          </ModalHeader>
          <div className="flex flex-col gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <Input 
              label="Segment Name" 
              placeholder="e.g. Active VIP Customers" 
              value={modal.segment.name ?? ''} 
              onChange={e => setModal(m => ({ ...m, segment: { ...m.segment, name: e.target.value } }))} 
            />
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-[var(--text-primary)]">Description (Optional)</label>
              <textarea 
                className="flex min-h-[60px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                rows={2} 
                value={modal.segment.description ?? ''} 
                onChange={e => setModal(m => ({ ...m, segment: { ...m.segment, description: e.target.value } }))} 
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-b border-[var(--border)] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Filter Rules</span>
                <Select 
                  className="h-7 py-0 px-2 text-xs w-24"
                  value={logic} 
                  onChange={e => setLogic(e.target.value as 'AND' | 'OR')}
                  options={[
                    { value: 'AND', label: 'Match ALL' },
                    { value: 'OR', label: 'Match ANY' }
                  ]}
                />
              </div>
              <Button variant="secondary" size="sm" icon="fa-solid fa-plus" onClick={addRule}>
                Add Rule
              </Button>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
              {conditions.length === 0 ? (
                <div className="text-center text-sm text-[var(--text-muted)] py-4">
                  No rules defined. This segment will include ALL contacts.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {conditions.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text-muted)] w-12 text-center">
                        {idx === 0 ? 'Where' : logic}
                      </span>
                      
                      <Select 
                        className="flex-1"
                        value={rule.field} 
                        onChange={e => updateRule(idx, 'field', e.target.value)}
                        options={FIELD_OPTIONS}
                      />
                      
                      <Select 
                        className="flex-1"
                        value={rule.operator} 
                        onChange={e => updateRule(idx, 'operator', e.target.value)}
                        options={OPERATOR_OPTIONS}
                      />

                      <Input 
                        className="flex-[1.5]"
                        value={rule.value} 
                        onChange={e => updateRule(idx, 'value', e.target.value)} 
                        placeholder="Value..." 
                      />
                      
                      <Button variant="ghost" size="icon" icon="fa-solid fa-xmark" onClick={() => removeRule(idx)} className="text-[var(--text-muted)] hover:text-danger-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <ModalFooter className="flex justify-between items-center w-full">
            <div>
              {estimatedCount !== null && (
                <span className="text-sm text-neutral-500">
                  Estimated matches: <strong className="text-neutral-900">{estimatedCount}</strong>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</Button>
              <Button variant="primary" onClick={save} loading={saving}>
                {modal.mode === 'new' ? 'Create Segment' : 'Save Changes'}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
