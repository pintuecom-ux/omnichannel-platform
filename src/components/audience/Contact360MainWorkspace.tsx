'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact } from '@/types'
import { Settings, Edit2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OmnichannelTimeline } from './OmnichannelTimeline'
import Link from 'next/link'

interface Contact360MainWorkspaceProps {
  contact: Contact
}

export function Contact360MainWorkspace({ contact }: Contact360MainWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('fields')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  
  const [localContact, setLocalContact] = useState<Contact & Record<string, any>>({
    ...contact,
    custom_fields: contact.custom_fields || {}
  })

  const [dbGroups, setDbGroups] = useState<any[]>([])
  const [allFields, setAllFields] = useState<any[]>([])
  const [loadingFields, setLoadingFields] = useState(true)

  useEffect(() => {
    loadDynamicConfig()
  }, [])

  async function loadDynamicConfig() {
    const supabase = createClient()
    const { data: groups } = await supabase.from('field_groups').select('*').eq('entity_type', 'contact').order('order_index')
    const { data: fields } = await supabase.from('custom_field_definitions').select('*').eq('entity_type', 'contact').order('created_at')

    if (groups && fields) {
      setDbGroups(groups)
      setAllFields(fields)
    }
    setLoadingFields(false)
  }

  const handleEditClick = (key: string, value: any) => {
    setEditingField(key)
    setEditValue(value === null || value === undefined ? '' : value)
  }

  const handleSaveField = async (key: string, isSystem = false) => {
    const supabase = createClient()
    let updatedContact = { ...localContact }
    
    if (!isSystem) {
      updatedContact.custom_fields = { ...(localContact.custom_fields || {}), [key]: editValue }
      const { error } = await supabase.from('contacts').update({ custom_fields: updatedContact.custom_fields }).eq('id', contact.id)
      if (error) { alert('Failed to update field'); return }
    } else {
      updatedContact = { ...localContact, [key]: editValue }
      const { error } = await supabase.from('contacts').update({ [key]: editValue }).eq('id', contact.id)
      if (error) { alert('Failed to update field'); return }
    }
    
    setLocalContact(updatedContact)
    setEditingField(null)
  }

  const handleCancelEdit = () => {
    setEditingField(null)
  }

  const renderEditInput = (field: any) => {
    const type = field.field_type || 'text'
    
    if (type === 'dropdown') {
      return (
        <input 
          type="text"
          className="flex-1 bg-panel border border-primary-500 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
      )
    }
    
    if (type === 'boolean') {
      return (
        <select 
          className="flex-1 bg-panel border border-primary-500 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none"
          value={editValue ? 'true' : 'false'}
          onChange={(e) => setEditValue(e.target.value === 'true')}
        >
          <option value="true">Yes / True</option>
          <option value="false">No / False</option>
        </select>
      )
    }
    
    if (type === 'paragraph') {
      return (
        <textarea 
          className="flex-1 bg-panel border border-primary-500 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none min-h-[80px]"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
      )
    }
    
    return (
      <input 
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        className="flex-1 bg-panel border border-primary-500 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
      />
    )
  }

  const renderFieldValue = (field: any, val: any) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-text-muted italic">Empty</span>
    }
    
    if (field.field_type === 'url') {
      return <a href={val} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">{val}</a>
    }
    if (field.field_type === 'boolean') {
      return val ? 'Yes' : 'No'
    }
    
    return <span className="whitespace-pre-wrap break-words">{String(val)}</span>
  }

  const unassignedFields = allFields.filter(f => !f.group_id)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-base border-r border-white/5">
      {/* Header and Tabs */}
      <div className="flex-none px-6 py-5 border-b border-white/10 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            {localContact.name}
            {localContact.wa_opt_in_status === 'subscribed' && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                WhatsApp Opt-in
              </span>
            )}
          </h2>
          <div className="text-sm text-text-muted flex items-center gap-2 mt-1">
            <span className="font-mono bg-surface2 px-1.5 py-0.5 rounded text-xs">{localContact.id}</span>
          </div>
        </div>

        <div className="flex border-b border-border">
          <button 
            onClick={() => setActiveTab('fields')}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'fields' ? "border-primary-500 text-primary-400" : "border-transparent text-text-muted hover:text-white"
            )}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'timeline' ? "border-primary-500 text-primary-400" : "border-transparent text-text-muted hover:text-white"
            )}
          >
            Timeline
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'timeline' && (
          <div className="p-6">
            <OmnichannelTimeline contactId={contact.id} />
          </div>
        )}

        {activeTab === 'fields' && (
          <div className="p-6">
            {loadingFields ? (
              <div className="text-center text-text-muted py-10">Loading dynamic fields...</div>
            ) : (
              <div className="max-w-5xl mx-auto space-y-6 pb-20">
                {dbGroups.map((group) => {
                  const groupFields = allFields.filter(f => f.group_id === group.id)
                  if (groupFields.length === 0) return null

                  return (
                    <div key={group.id} className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                      <div className="bg-panel/50 px-6 py-4 border-b border-border">
                        <h3 className="font-semibold text-white">{group.name}</h3>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        {groupFields.map(field => {
                          const key = field.key
                          const isSystem = field.is_system
                          const val = isSystem ? localContact[key] : localContact.custom_fields?.[key]
                          const isEditing = editingField === key

                          return (
                            <div key={key} className="flex flex-col gap-1.5 group/field">
                              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">{field.label}</label>
                              
                              {isEditing ? (
                                <div className="flex items-start gap-2">
                                  {renderEditInput(field)}
                                  <button onClick={() => handleSaveField(key, isSystem)} className="p-1.5 mt-0.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={handleCancelEdit} className="p-1.5 mt-0.5 bg-surface2 text-text-muted rounded-md hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between px-3 py-2 -ml-3 rounded-md border border-transparent hover:border-border hover:bg-white/5 transition-colors">
                                  <div className="text-sm text-white">
                                    {renderFieldValue(field, val)}
                                  </div>
                                  <button 
                                    onClick={() => handleEditClick(key, val)}
                                    className="opacity-0 group-hover/field:opacity-100 p-1 mt-0.5 text-text-muted hover:text-primary-400 transition-all flex-none"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Unassigned Custom Fields */}
                {unassignedFields.length > 0 && (
                  <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-panel/50 px-6 py-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold text-white">Other Fields</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                      {unassignedFields.map(field => {
                        const key = field.key
                        const isSystem = field.is_system
                        const val = isSystem ? localContact[key] : localContact.custom_fields?.[key]
                        const isEditing = editingField === key

                        return (
                          <div key={key} className="flex flex-col gap-1.5 group/field">
                            <label className="text-xs font-medium text-text-muted uppercase tracking-wide">{field.label}</label>
                            
                            {isEditing ? (
                              <div className="flex items-start gap-2">
                                {renderEditInput(field)}
                                <button onClick={() => handleSaveField(key, isSystem)} className="p-1.5 mt-0.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={handleCancelEdit} className="p-1.5 mt-0.5 bg-surface2 text-text-muted rounded-md hover:text-white transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between px-3 py-2 -ml-3 rounded-md border border-transparent hover:border-border hover:bg-white/5 transition-colors">
                                <div className="text-sm text-white">
                                  {renderFieldValue(field, val)}
                                </div>
                                <button 
                                  onClick={() => handleEditClick(key, val)}
                                  className="opacity-0 group-hover/field:opacity-100 p-1 mt-0.5 text-text-muted hover:text-primary-400 transition-all flex-none"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Fallback to configure fields */}
                <div className="flex justify-center pt-4">
                  <Link href="/contacts/form-settings" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-2 px-4 py-2 bg-primary-500/10 rounded-lg transition-colors">
                    <Settings className="w-4 h-4" /> Manage Form Fields
                  </Link>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
