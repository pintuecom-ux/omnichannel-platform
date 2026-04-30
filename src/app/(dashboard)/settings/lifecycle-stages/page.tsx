'use client'
import { useState } from 'react'
import SettingsShell from '@/components/settings/SettingsShell'
import { useRouter } from 'next/navigation'

type Substatus = { id: number; name: string; color?: string }
type Stage = { id: number; name: string; enabled: boolean; substatuses: Substatus[]; isWon?: boolean; isLost?: boolean }

const INITIAL_STAGES: Stage[] = [
  {
    id: 1, name: 'Lead', enabled: true,
    substatuses: [
      { id: 101, name: 'New' },
      { id: 102, name: 'In Progress' },
      { id: 103, name: 'Not Responded' },
      { id: 104, name: 'Scheduled for later' },
    ],
  },
  {
    id: 2, name: 'Sales Qualified Lead', enabled: true,
    substatuses: [
      { id: 201, name: 'Qualified' },
      { id: 202, name: 'Lost', color: '#e84040' },
    ],
  },
  {
    id: 3, name: 'New Customer', enabled: true,
    substatuses: [
      { id: 301, name: 'Negotiation' },
      { id: 302, name: 'Awaiting Client Input' },
      { id: 303, name: 'Scope Shared' },
      { id: 304, name: 'Decision Pending' },
    ],
  },
  {
    id: 4, name: 'Customer', enabled: true,
    substatuses: [
      { id: 401, name: 'Won', color: '#2fe774' },
      { id: 402, name: 'Churned', color: '#e84040' },
    ],
  },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={e => { e.stopPropagation(); onChange(!value) }} style={{ width: 32, height: 18, borderRadius: 9, background: value ? 'var(--accent)' : 'var(--bg-surface2)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: value ? 16 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function SubstatusCard({ sub, onDelete, onRename }: { sub: Substatus; onDelete: () => void; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(sub.name)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 4, minWidth: 0 }}>
      <i className="fa-solid fa-grip-dots-vertical" style={{ color: 'var(--text-muted)', fontSize: 9, cursor: 'grab', flexShrink: 0 }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sub.color ?? 'var(--text-muted)', flexShrink: 0 }} />
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { onRename(val); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onRename(val); setEditing(false) } if (e.key === 'Escape') { setVal(sub.name); setEditing(false) } }}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', minWidth: 0 }}
        />
      ) : (
        <span onDoubleClick={() => setEditing(true)} style={{ flex: 1, fontSize: 11, color: sub.color ? sub.color : 'var(--text-secondary)', fontWeight: sub.color ? 700 : 500, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
      )}
      <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 9, padding: 0, flexShrink: 0, opacity: 0.5, lineHeight: 1 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  )
}

function StageCard({ stage, onToggle, onRename, onDelete, onAddStatus, onDeleteStatus, onRenameStatus, isLast }:
  { stage: Stage; onToggle: () => void; onRename: (name: string) => void; onDelete: () => void; onAddStatus: (name: string) => void; onDeleteStatus: (id: number) => void; onRenameStatus: (id: number, name: string) => void; isLast: boolean }) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(stage.name)
  const [newStatus, setNewStatus] = useState('')
  const [addingStatus, setAddingStatus] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
      <div style={{ background: 'var(--bg-panel)', border: `1px solid ${stage.enabled ? 'var(--border)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, width: 200, minWidth: 200, padding: '12px 12px 10px', opacity: stage.enabled ? 1 : 0.5, transition: 'all 0.2s', flexShrink: 0 }}>
        {/* Stage header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fa-solid fa-grip-dots-vertical" style={{ color: 'var(--text-muted)', fontSize: 10, cursor: 'grab' }} />
            {editingName ? (
              <input
                autoFocus
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onBlur={() => { onRename(nameVal); setEditingName(false) }}
                onKeyDown={e => { if (e.key === 'Enter') { onRename(nameVal); setEditingName(false) } }}
                style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-active)', borderRadius: 6, padding: '2px 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', outline: 'none', fontFamily: 'DM Sans, sans-serif', width: 110 }}
              />
            ) : (
              <span onDoubleClick={() => setEditingName(true)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', cursor: 'text', flex: 1 }}>{stage.name}</span>
            )}
          </div>
          <Toggle value={stage.enabled} onChange={onToggle} />
        </div>

        {/* Substatuses */}
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {stage.substatuses.map(sub => (
            <SubstatusCard
              key={sub.id}
              sub={sub}
              onDelete={() => onDeleteStatus(sub.id)}
              onRename={name => onRenameStatus(sub.id, name)}
            />
          ))}
        </div>

        {/* Add status */}
        {addingStatus ? (
          <div style={{ marginTop: 6 }}>
            <input
              autoFocus
              className="form-input"
              placeholder="Status name"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newStatus) { onAddStatus(newStatus); setNewStatus(''); setAddingStatus(false) } if (e.key === 'Escape') { setNewStatus(''); setAddingStatus(false) } }}
              style={{ fontSize: 11, padding: '5px 8px', marginBottom: 4 }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => { if (newStatus) { onAddStatus(newStatus); setNewStatus('') }; setAddingStatus(false) }} style={{ flex: 1, padding: '4px', background: 'var(--accent)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#000', fontFamily: 'DM Sans, sans-serif' }}>Add</button>
              <button onClick={() => { setNewStatus(''); setAddingStatus(false) }} style={{ padding: '4px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>✕</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingStatus(true)} style={{ width: '100%', marginTop: 6, padding: '5px', background: 'none', border: '1px dashed var(--border)', borderRadius: 7, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            + Add status
          </button>
        )}

        {/* Delete stage */}
        <button onClick={onDelete} style={{ width: '100%', marginTop: 6, padding: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', opacity: 0.5, transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
          <i className="fa-solid fa-trash" style={{ marginRight: 4, color: '#e84040' }} />Remove stage
        </button>
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', alignSelf: 'center', flexShrink: 0 }}>
          <div style={{ width: 20, height: 2, background: 'var(--border)' }} />
          <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-muted)', fontSize: 10 }} />
        </div>
      )}
    </div>
  )
}

export default function LifecycleStagesPage() {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES)
  const [showAddStage, setShowAddStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [saving, setSaving] = useState(false)
  const [rules, setRules] = useState([
    { id: 1, enabled: true, trigger: 'a deal is added', targetStage: 'Lead' },
    { id: 2, enabled: true, trigger: 'a deal is won', targetStage: 'Customer' },
  ])

  function updateStage(id: number, patch: Partial<Stage>) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function addStatus(stageId: number, name: string) {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, substatuses: [...s.substatuses, { id: Date.now(), name }] } : s))
  }

  function deleteStatus(stageId: number, subId: number) {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, substatuses: s.substatuses.filter(x => x.id !== subId) } : s))
  }

  function renameStatus(stageId: number, subId: number, name: string) {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, substatuses: s.substatuses.map(x => x.id === subId ? { ...x, name } : x) } : s))
  }

  return (
    <SettingsShell>
      <div style={{ padding: 28 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => router.push('/settings/admin')}>Admin Settings</span>
          <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
          <span style={{ color: 'var(--text-primary)' }}>Contact Lifecycle Stages</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-glow)', border: '1px solid var(--border-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-arrow-right-arrow-left" style={{ color: 'var(--accent)', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Contact Lifecycle Stages</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 600 }}>
                Customize lifecycle stages: rename, reorder or disable them. Add new stages that reflect your business process. All statuses within a stage are customizable.
              </div>
            </div>
          </div>
          <a style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10 }} />Learn more
          </a>
        </div>

        {/* Active stages heading */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Active stages</div>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowAddStage(true)}>
            <i className="fa-solid fa-plus" /> Add lifecycle stage
          </button>
        </div>

        {/* Add stage modal */}
        {showAddStage && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 16, width: 420, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 16 }}>Add Lifecycle Stage</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Stage Name</div>
              <input className="form-input" placeholder="e.g. Evangelist, MQL" value={newStageName} onChange={e => setNewStageName(e.target.value)} style={{ marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowAddStage(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => {
                  if (newStageName) {
                    setStages(prev => [...prev, { id: Date.now(), name: newStageName, enabled: true, substatuses: [{ id: Date.now() + 1, name: 'New' }] }])
                    setNewStageName(''); setShowAddStage(false)
                  }
                }}>Add Stage</button>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline canvas */}
        <div style={{ overflowX: 'auto', paddingBottom: 20 }}>
          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', minWidth: 'max-content', padding: '4px 2px 12px' }}>
            {stages.map((stage, i) => (
              <StageCard
                key={stage.id}
                stage={stage}
                isLast={i === stages.length - 1}
                onToggle={() => updateStage(stage.id, { enabled: !stage.enabled })}
                onRename={name => updateStage(stage.id, { name })}
                onDelete={() => setStages(prev => prev.filter(s => s.id !== stage.id))}
                onAddStatus={name => addStatus(stage.id, name)}
                onDeleteStatus={subId => deleteStatus(stage.id, subId)}
                onRenameStatus={(subId, name) => renameStatus(stage.id, subId, name)}
              />
            ))}
          </div>
        </div>

        {/* Rules section */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 16 }}>Rules for changing stages</div>
          <div className="form-section" style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rules.map(rule => (
                <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Whenever <strong style={{ color: 'var(--text-primary)' }}>{rule.trigger}</strong>, change contact's stage to
                  </span>
                  <select
                    value={rule.targetStage}
                    onChange={e => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, targetStage: e.target.value } : r))}
                    style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {stages.map(s => <option key={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => setRules(prev => prev.filter(r => r.id !== rule.id))} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0 }}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              ))}

              <button onClick={() => setRules(prev => [...prev, { id: Date.now(), enabled: true, trigger: 'a form is submitted', targetStage: stages[0]?.name ?? '' }])}
                style={{ padding: '8px 14px', background: 'none', border: '1px dashed var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', textAlign: 'left', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 7 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                <i className="fa-solid fa-plus" /> Add rule
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary" onClick={() => { setSaving(true); setTimeout(() => setSaving(false), 1200) }}>
                {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : 'Save'}
              </button>
              <button className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  )
}
