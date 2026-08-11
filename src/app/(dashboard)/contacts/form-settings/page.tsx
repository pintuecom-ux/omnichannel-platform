'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Settings2, Trash2, GripVertical, ChevronUp, ChevronDown, FolderPlus } from 'lucide-react'

type FieldGroup = {
  id: string
  name: string
  order_index?: number
}

type CustomField = {
  id: string
  key: string
  label: string
  field_type: string
  group_id: string | null
  is_required: boolean
  is_quick_add: boolean
  is_unique: boolean
  is_system: boolean
  order_index: number
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
    is_quick_add: false,
    is_unique: false
  })

  // Drag and Drop state
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [fieldsRes, groupsRes] = await Promise.all([
      supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('entity_type', 'contact')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('field_groups')
        .select('id, name, order_index')
        .order('order_index', { ascending: true })
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
        is_unique: newField.is_unique,
        is_system: false,
        order_index: fields.length
      })

    if (!error) {
      setNewField({ label: '', key: '', field_type: 'text', group_id: '', is_required: false, is_quick_add: false, is_unique: false })
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
      setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
    }
    setUpdatingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this custom field? Associated data might be lost.')) return
    await supabase.from('custom_field_definitions').delete().eq('id', id)
    loadData()
  }

  // Update global sequential order indices
  async function updateGlobalOrders(newFieldsList: CustomField[]) {
    // Flatten list according to group order
    const orderedAll: CustomField[] = []
    groups.forEach(g => {
      const gFields = newFieldsList.filter(f => f.group_id === g.id)
      orderedAll.push(...gFields)
    })
    const unassigned = newFieldsList.filter(f => !f.group_id || !groups.some(g => g.id === f.group_id))
    orderedAll.push(...unassigned)

    const updatesToDB: { id: string; order_index: number }[] = []
    const updatedState = newFieldsList.map(f => {
      const globalIdx = orderedAll.findIndex(item => item.id === f.id)
      if (globalIdx !== -1 && f.order_index !== globalIdx) {
        updatesToDB.push({ id: f.id, order_index: globalIdx })
        return { ...f, order_index: globalIdx }
      }
      return f
    })

    setFields(updatedState)

    if (updatesToDB.length > 0) {
      await Promise.all(
        updatesToDB.map(u => 
          supabase.from('custom_field_definitions').update({ order_index: u.order_index }).eq('id', u.id)
        )
      )
    }
  }

  // Move field up/down within group
  async function moveField(field: CustomField, groupFields: CustomField[], direction: 'up' | 'down') {
    const currentIndex = groupFields.findIndex(f => f.id === field.id)
    if (currentIndex === -1) return
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= groupFields.length) return

    const targetField = groupFields[targetIndex]
    
    const newFieldsList = [...fields]
    const idxA = newFieldsList.findIndex(f => f.id === field.id)
    const idxB = newFieldsList.findIndex(f => f.id === targetField.id)
    
    if (idxA !== -1 && idxB !== -1) {
      const tempOrder = newFieldsList[idxA].order_index
      newFieldsList[idxA] = { ...newFieldsList[idxA], order_index: newFieldsList[idxB].order_index }
      newFieldsList[idxB] = { ...newFieldsList[idxB], order_index: tempOrder }
      
      if (newFieldsList[idxA].order_index === newFieldsList[idxB].order_index) {
        newFieldsList[idxA] = { ...newFieldsList[idxA], order_index: targetIndex }
        newFieldsList[idxB] = { ...newFieldsList[idxB], order_index: currentIndex }
      }
      
      await updateGlobalOrders(newFieldsList)
    }
  }

  // Drag and drop handler
  async function handleDrop(targetField: CustomField, groupFields: CustomField[]) {
    if (!draggedFieldId || draggedFieldId === targetField.id) return

    const draggedField = fields.find(f => f.id === draggedFieldId)
    if (!draggedField) return

    const filteredGroup = groupFields.filter(f => f.id !== draggedFieldId)
    const targetIdx = filteredGroup.findIndex(f => f.id === targetField.id)
    filteredGroup.splice(targetIdx, 0, draggedField)

    const newFieldsList = fields.map(f => {
      const gMatch = filteredGroup.find(gItem => gItem.id === f.id)
      return gMatch || f
    })

    setDraggedFieldId(null)
    await updateGlobalOrders(newFieldsList)
  }

  // Group fields
  const groupedFields: { group: FieldGroup | null; fields: CustomField[] }[] = []

  groups.forEach(g => {
    const gFields = fields
      .filter(f => f.group_id === g.id)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    groupedFields.push({ group: g, fields: gFields })
  })

  const unassigned = fields
    .filter(f => !f.group_id || !groups.some(g => g.id === f.group_id))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  if (unassigned.length > 0) {
    groupedFields.push({ group: null, fields: unassigned })
  }

  return (
    <div className="flex flex-col h-full bg-base overflow-hidden w-full">
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
            <p className="text-sm text-text-muted mt-1">Manage, group, and re-order fields for contact creation and details view</p>
          </div>
        </div>
      </div>

      {/* Content - Full Page Width */}
      <div className="flex-1 overflow-y-auto p-8 w-full">
        <div className="w-full space-y-8">
          
          {/* Create Field Section */}
          <div className="bg-surface rounded-xl border border-white/10 p-6 w-full">
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

            <div className="flex flex-wrap items-center gap-8 mb-6 bg-panel p-4 rounded-lg border border-white/5">
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

          {/* Fields List Section - Grouped Full Width */}
          <div className="space-y-6 w-full">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-lg font-bold text-white">Configured Fields ({fields.length})</h2>
              <span className="text-xs text-text-muted">Drag ≡ handle or use ↑ ↓ buttons to re-order fields. Changes take effect on Quick Add & Contact Details views.</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-text-muted bg-surface rounded-xl border border-white/10">Loading fields...</div>
            ) : fields.length === 0 ? (
              <div className="p-12 text-center text-text-muted bg-surface rounded-xl border border-white/10 flex flex-col items-center gap-2">
                <Settings2 className="w-8 h-8 opacity-20" />
                <p>No fields configured yet.</p>
              </div>
            ) : (
              groupedFields.map(({ group, fields: groupFields }) => {
                if (groupFields.length === 0) return null

                const groupName = group ? group.name : 'Other / Unassigned Fields'

                return (
                  <div key={group ? group.id : 'unassigned'} className="bg-surface rounded-xl border border-white/10 overflow-hidden shadow-sm w-full">
                    {/* Group Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-panel/70">
                      <div className="flex items-center gap-2">
                        <FolderPlus className="w-4 h-4 text-primary-400" />
                        <h3 className="font-semibold text-white">{groupName}</h3>
                        <span className="text-xs text-text-muted font-normal">({groupFields.length} fields)</span>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-white/10 bg-base/50 text-text-muted">
                            <th className="w-10 px-3 py-3"></th>
                            <th className="px-6 py-3 font-semibold uppercase text-xs tracking-wider">Field Label</th>
                            <th className="px-6 py-3 font-semibold uppercase text-xs tracking-wider">Type / Key</th>
                            <th className="px-4 py-3 font-semibold uppercase text-xs tracking-wider text-center">Group</th>
                            <th className="px-4 py-3 font-semibold uppercase text-xs tracking-wider text-center">Unique Field</th>
                            <th className="px-4 py-3 font-semibold uppercase text-xs tracking-wider text-center">Mandatory</th>
                            <th className="px-4 py-3 font-semibold uppercase text-xs tracking-wider text-center">Quick Add</th>
                            <th className="px-6 py-3 font-semibold uppercase text-xs tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {groupFields.map((field, idx) => {
                            const isUniqueAllowed = field.key === 'phone' || field.key === 'email'

                            return (
                              <tr 
                                key={field.id} 
                                draggable
                                onDragStart={() => setDraggedFieldId(field.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(field, groupFields)}
                                className={`hover:bg-white/[0.03] transition-colors group ${draggedFieldId === field.id ? 'opacity-40' : ''}`}
                              >
                                {/* 3 vertical line / Grip Icon */}
                                <td className="px-3 py-4 text-text-muted hover:text-white cursor-grab active:cursor-grabbing text-center">
                                  <GripVertical className="w-4 h-4 mx-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                                </td>

                                {/* Field Label */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{field.label}</span>
                                    {field.is_system && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">System</span>
                                    )}
                                  </div>
                                </td>

                                {/* Type / Key */}
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-text-secondary capitalize">{field.field_type}</span>
                                    <span className="text-xs text-text-muted font-mono">{field.key}</span>
                                  </div>
                                </td>

                                {/* Group Selector */}
                                <td className="px-4 py-4 text-center">
                                  <select 
                                    className="bg-panel border border-white/10 text-xs text-text-secondary rounded px-2 py-1 focus:outline-none focus:border-primary-500"
                                    value={field.group_id || ''}
                                    onChange={(e) => handleUpdateToggle(field.id, { group_id: e.target.value || null })}
                                  >
                                    <option value="">None</option>
                                    {groups.map(g => (
                                      <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                  </select>
                                </td>

                                {/* UNIQUE (Mobile Number & Email ID only) */}
                                <td className="px-4 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    title={isUniqueAllowed ? "Set as Unique Identifier" : "Unique check only supported for Mobile Number & Email ID"}
                                    className="w-4 h-4 rounded border-gray-600 bg-surface focus:ring-primary-500 text-primary-500 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                                    checked={!!field.is_unique}
                                    disabled={!isUniqueAllowed || updatingId === field.id}
                                    onChange={(e) => handleUpdateToggle(field.id, { is_unique: e.target.checked })}
                                  />
                                </td>

                                {/* MANDATORY */}
                                <td className="px-4 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-600 bg-surface focus:ring-primary-500 text-primary-500 cursor-pointer disabled:opacity-50"
                                    checked={field.is_required}
                                    disabled={updatingId === field.id}
                                    onChange={(e) => handleUpdateToggle(field.id, { is_required: e.target.checked })}
                                  />
                                </td>

                                {/* QUICK ADD */}
                                <td className="px-4 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-600 bg-surface focus:ring-primary-500 text-primary-500 cursor-pointer disabled:opacity-50"
                                    checked={field.is_quick_add}
                                    disabled={updatingId === field.id}
                                    onChange={(e) => handleUpdateToggle(field.id, { is_quick_add: e.target.checked })}
                                  />
                                </td>

                                {/* ACTIONS (Up, Down, Delete) */}
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => moveField(field, groupFields, 'up')}
                                      disabled={idx === 0}
                                      className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-20"
                                      title="Move Up"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => moveField(field, groupFields, 'down')}
                                      disabled={idx === groupFields.length - 1}
                                      className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-20"
                                      title="Move Down"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                    <button 
                                      className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-30 disabled:hover:text-text-muted disabled:hover:bg-transparent"
                                      onClick={() => handleDelete(field.id)}
                                      disabled={field.is_system}
                                      title={field.is_system ? "System fields cannot be deleted" : "Delete field"}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
