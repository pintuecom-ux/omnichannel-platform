'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Settings2, Trash2 } from 'lucide-react'

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
  is_quick_add: boolean
  is_system: boolean
}

export default function FormSettingsPage() {
  const supabase = createClient()
  const [fields, setFields] = useState<CustomField[]>([])
  const [groups, setGroups] = useState<FieldGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  const [newField, setNewField] = useState({
    label: '',
    key: '',
    field_type: 'text',
    group_id: '',
    is_required: false,
    is_quick_add: false
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [fieldsRes, groupsRes] = await Promise.all([
      supabase.from('custom_field_definitions').select('*').eq('entity_type', 'contact').order('created_at', { ascending: true }),
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
        is_required: newField.is_required,
        is_quick_add: newField.is_quick_add,
        is_system: false
      })

    if (!error) {
      setNewField({ label: '', key: '', field_type: 'text', group_id: '', is_required: false, is_quick_add: false })
      loadData()
    } else {
      alert(`Error creating field: ${error.message}`)
    }
    setSaving(false)
  }

  async function handleUpdateToggle(id: string, updates: Partial<CustomField>) {
    setUpdatingId(id)
    const { error } = await supabase
      .from('custom_field_definitions')
      .update(updates)
      .eq('id', id)
      
    if (error) {
      alert(`Failed to update field: ${error.message}`)
    } else {
      // Optimistic update
      setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
    }
    setUpdatingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this custom field? Associated data might be lost.')) return
    await supabase.from('custom_field_definitions').delete().eq('id', id)
    loadData()
  }

  return (
    <div className="flex flex-col h-full bg-base overflow-hidden">
      {/* Header */}
      <div className="flex-none px-8 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/contacts" 
            className="p-2 rounded-lg bg-surface hover:bg-surface2 text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary-400" />
              Contact Form Configuration
            </h1>
            <p className="text-sm text-text-muted mt-1">Manage which fields appear when creating or editing a contact</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Create Field Section */}
          <div className="bg-surface rounded-xl border border-white/10 p-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-6">
              <Plus className="w-4 h-4 text-primary-400" />
              Create Custom Field
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase">Field Label</label>
                <input 
                  type="text" 
                  className="form-input bg-panel border-white/10 text-white rounded-lg px-4 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none w-full" 
                  value={newField.label} 
                  onChange={e => setNewField({ ...newField, label: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') })} 
                  placeholder="e.g. Lead Source" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase">Internal Key</label>
                <input 
                  type="text" 
                  className="form-input bg-panel border-white/10 text-white rounded-lg px-4 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none w-full" 
                  value={newField.key} 
                  onChange={e => setNewField({ ...newField, key: e.target.value })} 
                  placeholder="e.g. lead_source" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase">Field Type</label>
                <select 
                  className="form-input bg-panel border-white/10 text-white rounded-lg px-4 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none w-full" 
                  value={newField.field_type} 
                  onChange={e => setNewField({ ...newField, field_type: e.target.value })}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="boolean">Checkbox / Boolean</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase">Field Group</label>
                <select 
                  className="form-input bg-panel border-white/10 text-white rounded-lg px-4 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none w-full" 
                  value={newField.group_id} 
                  onChange={e => setNewField({ ...newField, group_id: e.target.value })}
                >
                  <option value="">No Group (Uncategorized)</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-8 mb-6 bg-panel p-4 rounded-lg border border-white/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-600 bg-surface focus:ring-primary-500 text-primary-500"
                  checked={newField.is_required} 
                  onChange={e => setNewField({ ...newField, is_required: e.target.checked })} 
                />
                <span className="text-sm font-medium text-white">Make mandatory</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-600 bg-surface focus:ring-primary-500 text-primary-500"
                  checked={newField.is_quick_add} 
                  onChange={e => setNewField({ ...newField, is_quick_add: e.target.checked })} 
                />
                <span className="text-sm font-medium text-white">Show in Quick Add</span>
              </label>
            </div>

            <button 
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-primary-500/20" 
              onClick={handleAddField} 
              disabled={saving || !newField.label || !newField.key}
            >
              {saving ? 'Creating...' : 'Create Field'}
            </button>
          </div>

          {/* Fields List Section */}
          <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-panel">
              <h2 className="text-base font-semibold text-white">Configured Fields</h2>
              <span className="text-xs text-text-muted">{fields.length} total fields</span>
            </div>
            
            {loading ? (
              <div className="p-12 text-center text-text-muted">Loading fields...</div>
            ) : fields.length === 0 ? (
              <div className="p-12 text-center text-text-muted flex flex-col items-center gap-2">
                <Settings2 className="w-8 h-8 opacity-20" />
                <p>No fields configured yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/10 bg-base/50 text-text-muted">
                      <th className="px-6 py-3 font-semibold uppercase text-xs tracking-wider">Field Label</th>
                      <th className="px-6 py-3 font-semibold uppercase text-xs tracking-wider">Type / Key</th>
                      <th className="px-6 py-3 font-semibold uppercase text-xs tracking-wider text-center">Mandatory</th>
                      <th className="px-6 py-3 font-semibold uppercase text-xs tracking-wider text-center">Quick Add</th>
                      <th className="px-6 py-3 font-semibold uppercase text-xs tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {fields.map(field => (
                      <tr key={field.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{field.label}</span>
                            {field.is_system && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 rounded">System</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-text-secondary capitalize">{field.field_type}</span>
                            <span className="text-xs text-text-muted font-mono">{field.key}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-600 bg-surface focus:ring-primary-500 text-primary-500 cursor-pointer disabled:opacity-50"
                            checked={field.is_required}
                            disabled={updatingId === field.id}
                            onChange={(e) => handleUpdateToggle(field.id, { is_required: e.target.checked })}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-600 bg-surface focus:ring-primary-500 text-primary-500 cursor-pointer disabled:opacity-50"
                            checked={field.is_quick_add}
                            disabled={updatingId === field.id}
                            onChange={(e) => handleUpdateToggle(field.id, { is_quick_add: e.target.checked })}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors disabled:opacity-30 disabled:hover:text-text-muted disabled:hover:bg-transparent"
                            onClick={() => handleDelete(field.id)}
                            disabled={field.is_system}
                            title={field.is_system ? "System fields cannot be deleted" : "Delete field"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
