'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Segment, ConditionSet } from '@/types'

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

  async function evaluateSegment() {
    if (!workspaceId) return
    setEvaluating(true)
    try {
      alert('Estimation requires saving the segment first in this implementation.')
    } catch (e) {
      console.error(e)
    } finally {
      setEvaluating(false)
    }
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
      
      // If it's a new segment, we should evaluate it now to get the count
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

  return (
    <div className="generic-page">
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-filter" style={{ color: 'var(--accent)', marginRight: 8 }} />
          Dynamic Segments
        </span>
        <button className="btn btn-primary" onClick={() => openModal('new')}>
          <i className="fa-solid fa-plus" /> Create Segment
        </button>
      </div>

      <div className="page-body">
        <div className="data-table">
          <div className="table-header">
            <span className="table-title">Your Segments</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Segment Name</th>
                <th>Description</th>
                <th>Matching Contacts</th>
                <th>Last Evaluated</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {segments.map(seg => (
                <tr key={seg.id}>
                  <td><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{seg.name} <span className="pill" style={{ marginLeft: 6 }}>{seg.condition_set?.conditions?.length || 0} conditions</span></div></td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{seg.description || '—'}</td>
                  <td>
                    <div className="pill blue" style={{ padding: '4px 10px' }}>
                      <i className="fa-solid fa-users" style={{ marginRight: 6 }} />{seg.cached_count || 0}
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {seg.last_calculated_at ? new Date(seg.last_calculated_at).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" onClick={() => refreshCount(seg.id)} title="Refresh Count"><i className="fa-solid fa-rotate-right" style={{ fontSize: 11 }} /></button>
                      <button className="icon-btn" onClick={() => openModal('edit', seg)}><i className="fa-solid fa-pen" style={{ fontSize: 11 }} /></button>
                      <button className="icon-btn" onClick={() => del(seg.id)}><i className="fa-solid fa-trash" style={{ fontSize: 11, color: '#e84040' }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {segments.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No segments created yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="tpl-modal-overlay open" onClick={() => setModal(m => ({ ...m, open: false }))}>
          <div className="tpl-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">{modal.mode === 'new' ? 'Create New Segment' : 'Edit Segment'}</div>
              <button className="icon-btn" onClick={() => setModal(m => ({ ...m, open: false }))}><i className="fa-solid fa-xmark" /></button>
            </div>
            
            <div className="tpl-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="form-group">
                <div className="form-label">Segment Name</div>
                <input className="form-input" value={modal.segment.name ?? ''} onChange={e => setModal(m => ({ ...m, segment: { ...m.segment, name: e.target.value } }))} placeholder="e.g. Active VIP Customers in Delhi" />
              </div>
              <div className="form-group">
                <div className="form-label">Description (Optional)</div>
                <textarea className="form-input" rows={2} value={modal.segment.description ?? ''} onChange={e => setModal(m => ({ ...m, segment: { ...m.segment, description: e.target.value } }))} />
              </div>

              <div style={{ marginTop: 24, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Filter Rules (
                  <select value={logic} onChange={e => setLogic(e.target.value as 'AND' | 'OR')} className="form-input" style={{ padding: '0 4px', height: 24, fontSize: 11 }}>
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select> Logic)
                </div>
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={addRule}>
                  <i className="fa-solid fa-plus" style={{ marginRight: 4 }}/> Add Rule
                </button>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                {conditions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>
                    No rules defined. This segment will include ALL contacts.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {conditions.map((rule, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', minWidth: 40 }}>
                          {idx === 0 ? 'Where' : logic}
                        </span>
                        
                        <select className="form-input" style={{ flex: 1 }} value={rule.field} onChange={e => updateRule(idx, 'field', e.target.value)}>
                          {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        
                        <select className="form-input" style={{ flex: 1 }} value={rule.operator} onChange={e => updateRule(idx, 'operator', e.target.value)}>
                          {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        <input className="form-input" style={{ flex: 1.5 }} value={rule.value} onChange={e => updateRule(idx, 'value', e.target.value)} placeholder="Value..." />
                        
                        <button className="icon-btn" onClick={() => removeRule(idx)}>
                          <i className="fa-solid fa-xmark" style={{ color: 'var(--text-muted)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="tpl-modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                 {estimatedCount !== null && (
                   <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                     Estimated matches: <strong style={{ color: 'var(--text-primary)' }}>{estimatedCount}</strong>
                   </span>
                 )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Segment'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
