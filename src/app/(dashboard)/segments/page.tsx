'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Segment, ConditionSet } from '@/types'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'
import { Filter, Search, Plus, Play, Edit2, Trash2, Users, X } from 'lucide-react'

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
    <div className="flex-1 flex flex-col h-full relative">
      {/* Decorative Background Glow */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-warning-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 -z-10"></div>

      <header className="h-20 px-6 flex items-center justify-between flex-none z-10 border-b border-border/50 glass-panel">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm flex items-center gap-3">
            <Filter className="text-warning-400 w-6 h-6" /> Dynamic Segments
          </h1>
          <p className="text-sm text-text-secondary mt-1">Rule-based audiences that update in real-time</p>
        </div>
        <button 
          onClick={() => openModal('new')}
          className="bg-gradient-to-r from-warning-500 to-orange-500 hover:from-warning-400 hover:to-warning-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] border border-warning-400/50"
        >
          <Plus className="w-4 h-4" /> Create Segment
        </button>
      </header>

      <div className="flex-1 p-6 flex flex-col gap-6 z-10 overflow-hidden">
        <div className="flex items-center justify-between flex-none">
          <div className="relative w-[380px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search segments..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-warning-500 focus:ring-1 focus:ring-warning-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 glass-panel rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border relative min-h-0">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-panel/80 sticky top-0 z-20 backdrop-blur-md shadow-sm border-b border-border">
                <tr>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border w-[300px]">Segment Name</th>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Rules</th>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Matching Contacts</th>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Created</th>
                  <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border/50">
                {filteredSegments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-secondary">
                      {search ? 'No segments found matching your search.' : 'No segments created yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredSegments.map(seg => (
                    <tr key={seg.id} className="table-row-hover group cursor-pointer border-b border-white/5">
                      <td className="py-4 px-5 font-semibold text-white">{seg.name}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          {seg.condition_set?.conditions?.map((cond: any, idx: number) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-text-muted font-medium">{seg.condition_set.operator}</span>}
                              <span className="px-2 py-1 bg-surface border border-border rounded text-gray-300">
                                {cond.field} {cond.operator} '{cond.value}'
                              </span>
                            </React.Fragment>
                          ))}
                          {!seg.condition_set?.conditions?.length && <span className="text-text-muted italic">No rules defined</span>}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <Users className="w-3 h-3" /> {seg.cached_count || 0}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-text-secondary">
                        {seg.created_at ? new Date(seg.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="row-actions flex justify-end gap-1">
                          <button onClick={() => refreshCount(seg.id)} className="p-1.5 text-text-secondary hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Refresh Count">
                            <Play className="w-4 h-4" />
                          </button>
                          <button onClick={() => openModal('edit', seg)} className="p-1.5 text-text-secondary hover:text-white hover:bg-white/10 rounded-md transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => del(seg.id)} className="p-1.5 text-text-secondary hover:text-danger-500 hover:bg-danger-500/10 rounded-md transition-colors">
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
        <ModalContent className="sm:max-w-2xl">
          <ModalHeader>
            <ModalTitle>{modal.mode === 'new' ? 'Create New Segment' : 'Edit Segment'}</ModalTitle>
          </ModalHeader>
          <div className="flex flex-col gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Segment Name</label>
              <input 
                type="text" 
                className="w-full bg-surface border border-border focus:border-warning-500 focus:ring-1 focus:ring-warning-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-text-muted outline-none transition-all shadow-inner"
                placeholder="e.g. Active VIP Customers"
                value={modal.segment.name ?? ''} 
                onChange={e => setModal(m => ({ ...m, segment: { ...m.segment, name: e.target.value } }))}
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Description (Optional)</label>
              <textarea 
                className="flex min-h-[60px] w-full bg-surface border border-border focus:border-warning-500 focus:ring-1 focus:ring-warning-500 rounded-lg px-3 py-2 text-sm text-white shadow-inner transition-all outline-none"
                rows={2} 
                placeholder="What is this segment for?"
                value={modal.segment.description ?? ''} 
                onChange={e => setModal(m => ({ ...m, segment: { ...m.segment, description: e.target.value } }))} 
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Filter Rules</span>
                <select 
                  className="bg-surface border border-border rounded px-2 py-1 text-xs text-white outline-none focus:border-warning-500"
                  value={logic} 
                  onChange={e => setLogic(e.target.value as 'AND' | 'OR')}
                >
                  <option value="AND">Match ALL</option>
                  <option value="OR">Match ANY</option>
                </select>
              </div>
              <button 
                onClick={addRule}
                className="bg-surface border border-border hover:border-text-secondary text-text-secondary hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-xs font-medium"
              >
                <Plus className="w-3 h-3" /> Add Rule
              </button>
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-4 shadow-inner">
              {conditions.length === 0 ? (
                <div className="text-center text-sm text-text-muted py-4">
                  No rules defined. This segment will include ALL contacts.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {conditions.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-text-muted w-12 text-center uppercase tracking-wider">
                        {idx === 0 ? 'Where' : logic}
                      </span>
                      
                      <select 
                        className="flex-1 bg-panel border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-warning-500"
                        value={rule.field} 
                        onChange={e => updateRule(idx, 'field', e.target.value)}
                      >
                        {FIELD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      
                      <select 
                        className="flex-1 bg-panel border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-warning-500"
                        value={rule.operator} 
                        onChange={e => updateRule(idx, 'operator', e.target.value)}
                      >
                        {OPERATOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>

                      <input 
                        className="flex-[1.5] bg-panel border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted outline-none focus:border-warning-500 shadow-inner"
                        value={rule.value} 
                        onChange={e => updateRule(idx, 'value', e.target.value)} 
                        placeholder="Value..." 
                      />
                      
                      <button onClick={() => removeRule(idx)} className="p-2 text-text-muted hover:text-danger-500 hover:bg-danger-500/10 rounded-lg transition-colors shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <ModalFooter className="flex justify-between items-center w-full bg-surface/30 border-t border-white/5 py-4">
            <div>
              {estimatedCount !== null && (
                <span className="text-sm text-text-secondary">
                  Estimated matches: <strong className="text-white bg-white/10 px-2 py-0.5 rounded-md ml-1">{estimatedCount}</strong>
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</Button>
              <button 
                onClick={save}
                disabled={saving}
                className="bg-gradient-to-r from-warning-500 to-orange-500 hover:from-warning-400 hover:to-warning-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-warning-400/50 transition-all disabled:opacity-50"
              >
                {modal.mode === 'new' ? 'Create Segment' : 'Save Changes'}
              </button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
