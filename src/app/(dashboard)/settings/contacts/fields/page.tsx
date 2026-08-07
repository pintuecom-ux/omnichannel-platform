'use client'
import { useState, useEffect } from 'react'
import SettingsShell from '@/components/settings/SettingsShell'
import { createClient } from '@/lib/supabase/client'

type FieldGroup = {
  id: string
  name: string
}

type CustomField = {
  id: string
  key: string
  label: string
  field_type: string
  group_id: string | null
  is_required: boolean
}

export default function CustomFieldsPage() {
  const supabase = createClient()
  const [fields, setFields] = useState<CustomField[]>([])
  const [groups, setGroups] = useState<FieldGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [newField, setNewField] = useState({
    label: '',
    key: '',
    field_type: 'text',
    group_id: '',
    is_required: false
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [fieldsRes, groupsRes] = await Promise.all([
      supabase.from('custom_field_definitions').select('*').eq('entity_type', 'contact').order('created_at', { ascending: false }),
      supabase.from('field_groups').select('id, name').order('order_index', { ascending: true })
    ])
    
    if (fieldsRes.data) setFields(fieldsRes.data)
    if (groupsRes.data) setGroups(groupsRes.data)
    setLoading(false)
  }

  async function handleAddField() {
    if (!newField.label.trim() || !newField.key.trim() || !newField.field_type) return
    setSaving(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', session.user.id)
      .single()

    if (!profile) return

    const { error } = await supabase
      .from('custom_field_definitions')
      .insert({
        workspace_id: profile.workspace_id,
        entity_type: 'contact',
        key: newField.key,
        label: newField.label,
        field_type: newField.field_type,
        group_id: newField.group_id || null,
        is_required: newField.is_required
      })

    if (!error) {
      setNewField({ label: '', key: '', field_type: 'text', group_id: '', is_required: false })
      loadData()
    } else {
      alert(`Error creating field: ${error.message}`)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this field? Data associated with it might be lost.')) return
    await supabase.from('custom_field_definitions').delete().eq('id', id)
    loadData()
  }

  return (
    <SettingsShell>
      <div style={{ maxWidth: 800 }}>
        
        <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Create New Field</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div className="form-label">Field Label</div>
              <input 
                type="text" 
                className="form-input" 
                value={newField.label} 
                onChange={e => setNewField({ ...newField, label: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') })} 
                placeholder="e.g. Lead Source" 
              />
            </div>
            <div>
              <div className="form-label">Internal Key</div>
              <input 
                type="text" 
                className="form-input" 
                value={newField.key} 
                onChange={e => setNewField({ ...newField, key: e.target.value })} 
                placeholder="e.g. lead_source" 
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div className="form-label">Field Type</div>
              <select className="form-input" value={newField.field_type} onChange={e => setNewField({ ...newField, field_type: e.target.value })}>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="dropdown">Dropdown</option>
                <option value="boolean">Checkbox / Boolean</option>
              </select>
            </div>
            <div>
              <div className="form-label">Field Group</div>
              <select className="form-input" value={newField.group_id} onChange={e => setNewField({ ...newField, group_id: e.target.value })}>
                <option value="">No Group (Uncategorized)</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input 
              type="checkbox" 
              id="is_required" 
              checked={newField.is_required} 
              onChange={e => setNewField({ ...newField, is_required: e.target.checked })} 
            />
            <label htmlFor="is_required" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Make this field mandatory</label>
          </div>

          <button className="btn btn-primary" onClick={handleAddField} disabled={saving || !newField.label || !newField.key}>
            {saving ? 'Creating...' : 'Create Field'}
          </button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Existing Fields</div>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : fields.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-panel)', borderRadius: 12, border: '1px dashed var(--border)' }}>
            No custom fields created yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Label</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Key</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Type</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Group</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(field => (
                <tr key={field.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{field.label} {field.is_required && <span style={{ color: '#e84040' }}>*</span>}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{field.key}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{field.field_type}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {groups.find(g => g.id === field.group_id)?.name || 'Uncategorized'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button className="icon-btn" onClick={() => handleDelete(field.id)} style={{ color: '#e84040' }}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SettingsShell>
  )
}
