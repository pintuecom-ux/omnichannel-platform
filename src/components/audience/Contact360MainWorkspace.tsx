'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact } from '@/types'
import { Activity, Clock, MessageCircle, BarChart3, Settings, Edit2, Check, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONTACT_FIELD_GROUPS as FIELD_GROUPS } from '@/lib/audience-constants'
import { OmnichannelTimeline } from './OmnichannelTimeline'
import { SocialProfilesWidget } from './SocialProfilesWidget'

interface Contact360MainWorkspaceProps {
  contact: Contact
}



export function Contact360MainWorkspace({ contact }: Contact360MainWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('fields') // Defaulting to fields so user sees it right away
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  
  const [localContact, setLocalContact] = useState<Contact & Record<string, any>>({
    ...contact,
    custom_fields: contact.custom_fields || {}
  })

  const [combinedGroups, setCombinedGroups] = useState<any[]>(FIELD_GROUPS)

  useEffect(() => {
    loadDynamicGroups()
  }, [])

  async function loadDynamicGroups() {
    const supabase = createClient()
    const { data: groups } = await supabase.from('field_groups').select('*').eq('entity_type', 'contact').order('order_index')
    const { data: fields } = await supabase.from('custom_field_definitions').select('*').eq('entity_type', 'contact').order('created_at')

    if (groups && fields) {
      const dynamicGroups = groups.map(g => ({
        id: g.id,
        label: g.name,
        fields: fields.filter(f => f.group_id === g.id).map(f => ({
          key: f.key,
          label: f.label,
          type: f.field_type,
          isCustom: true
        }))
      })).filter(g => g.fields.length > 0)

      setCombinedGroups([...FIELD_GROUPS, ...dynamicGroups])
    }
  }

  // Custom Field Creation Modal State
  const [showAddCustomField, setShowAddCustomField] = useState(false)
  const [newCustomField, setNewCustomField] = useState({ name: '', system_name: '', type: 'Text' })

  const handleEditClick = (key: string, value: any, isCustom = false) => {
    setEditingField(key)
    if (isCustom) {
      setEditValue(localContact.custom_fields?.[key] || '')
    } else {
      setEditValue(value === null || value === undefined ? '' : value)
    }
  }

  const handleSaveField = async (key: string, isCustom = false) => {
    const supabase = createClient()
    let updatedContact = { ...localContact }
    
    if (isCustom) {
      updatedContact.custom_fields = { ...(localContact.custom_fields || {}), [key]: editValue }
      const { error } = await supabase.from('contacts').update({ custom_fields: updatedContact.custom_fields }).eq('id', contact.id)
      if (error) { alert('Failed to update custom field'); return }
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

  const handleAddCustomField = () => {
    if (!newCustomField.system_name) return
    setLocalContact(prev => ({
      ...prev,
      custom_fields: {
        ...(prev.custom_fields || {}),
        [newCustomField.system_name]: '' // Initialize empty
      }
    }))
    setShowAddCustomField(false)
    setNewCustomField({ name: '', system_name: '', type: 'Text' })
  }

  const renderEditInput = (field: any, isCustom = false) => {
    const type = field.type || 'string'
    
    if (type === 'dropdown') {
      return (
        <select 
          className="flex-1 bg-panel border border-primary-500 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        >
          <option value="">Select an option...</option>
          {field.options?.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }
    
    if (type === 'multiselect') {
      // Very basic string representation for multiselect in this prototype
      return (
        <input 
          type="text"
          placeholder="Comma separated values"
          className="flex-1 bg-panel border border-primary-500 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
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
    
    let inputType = 'text'
    if (type === 'number') inputType = 'number'
    if (type === 'date') inputType = 'date'
    if (type === 'datetime') inputType = 'datetime-local'
    if (type === 'url') inputType = 'url'
    if (type === 'image') inputType = 'url'

    return (
      <input 
        type={inputType}
        className="flex-1 bg-panel border border-primary-500 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500 w-full"
        value={editValue}
        placeholder={type === 'image' ? 'https://...' : ''}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSaveField(field.key, isCustom)}
      />
    )
  }

  const renderFieldValue = (field: any, val: any) => {
    if (val === null || val === undefined || val === '') return <span className="text-text-muted italic">Empty</span>
    
    if (field.type === 'image') {
      return (
        <div className="flex items-center gap-3">
          <img src={val} alt="Avatar" className="w-12 h-12 rounded-full object-cover bg-surface border border-border shadow-md" />
        </div>
      )
    }
    if (field.type === 'url') {
      return <a href={val} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">{val}</a>
    }
    if (field.type === 'date') return new Date(val).toLocaleDateString()
    if (field.type === 'datetime') return new Date(val).toLocaleString()
    
    return <span className="whitespace-pre-wrap break-words">{String(val)}</span>
  }

  return (
    <div className="h-full flex flex-col bg-base relative z-10">
      
      {/* Sticky Tab Header */}
      <div className="flex-none border-b border-border bg-base px-6 pt-6 sticky top-0 z-10 shrink-0">
        <div className="flex space-x-8 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn("pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", activeTab === 'overview' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white")}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('fields')}
            className={cn("pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", activeTab === 'fields' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white")}
          >
            All Fields & Properties
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={cn("pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", activeTab === 'timeline' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white")}
          >
            Timeline
          </button>
          <button 
            onClick={() => setActiveTab('conversations')}
            className={cn("pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", activeTab === 'conversations' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white")}
          >
            Conversations
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6 h-full items-start">
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white">Recent Activity</h3>
              </div>
              <div className="flex flex-col gap-4 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                <div className="relative flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-surface shadow shrink-0 z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                  </div>
                  <div className="flex-1 p-4 rounded-lg border border-border bg-panel shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white text-sm">Message Sent</div>
                      <time className="text-xs font-medium text-text-secondary">2 hours ago</time>
                    </div>
                    <div className="text-text-secondary text-xs">System sent automated greeting via WhatsApp.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white">Insights</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">AI Score</div>
                  <div className="text-2xl font-semibold text-white">{localContact.ai_score || '-'}</div>
                </div>
                <div className="bg-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Churn Risk</div>
                  <div className="text-2xl font-semibold text-white">{localContact.churn_risk ? `${localContact.churn_risk}%` : '-'}</div>
                </div>
              </div>
              
              <SocialProfilesWidget 
                contact={contact} 
                onUpdate={async (data) => {
                  const { createClient } = await import('@/lib/supabase/client')
                  const supabase = createClient()
                  await supabase.from('contacts').update({ social_profiles: data }).eq('id', contact.id)
                }} 
              />
            </div>
          </div>
        )}

        {/* FIELDS TAB (The exhaustive list of all fields) */}
        {activeTab === 'fields' && (
          <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {combinedGroups.map(group => (
              <div key={group.id} className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="bg-panel/50 px-6 py-4 border-b border-border">
                  <h3 className="font-semibold text-white">{group.label}</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {group.fields.map((field: any) => {
                    const value = field.isCustom ? localContact.custom_fields?.[field.key] : localContact[field.key]
                    const isEditing = editingField === field.key
                    const isReadOnly = field.readOnly

                    return (
                      <div key={field.key} className="flex flex-col gap-1.5 group/field">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wide">{field.label}</label>
                        
                        {isEditing && !isReadOnly ? (
                          <div className="flex items-start gap-2">
                            {renderEditInput(field, field.isCustom)}
                            <button onClick={() => handleSaveField(field.key, field.isCustom)} className="p-1.5 mt-0.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={handleCancelEdit} className="p-1.5 mt-0.5 bg-surface2 text-text-muted rounded-md hover:text-white transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between px-3 py-2 -ml-3 rounded-md border border-transparent hover:border-border hover:bg-white/5 transition-colors">
                            <div className={cn("text-sm text-white")}>
                              {renderFieldValue(field, value)}
                            </div>
                            {!isReadOnly && (
                              <button 
                                onClick={() => handleEditClick(field.key, value, field.isCustom)}
                                className="opacity-0 group-hover/field:opacity-100 p-1 mt-0.5 text-text-muted hover:text-primary-400 transition-all flex-none"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* CUSTOM FIELDS SECTION */}
            <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-panel/50 px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-white">Custom Fields</h3>
                <button 
                  onClick={() => setShowAddCustomField(true)}
                  className="flex items-center gap-1.5 text-xs font-medium bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Field
                </button>
              </div>
              
              <div className="p-6">
                {showAddCustomField && (
                  <div className="mb-8 p-4 bg-panel border border-primary-500/30 rounded-lg shadow-inner">
                    <h4 className="text-sm font-semibold text-white mb-4">Define New Custom Field</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Field Label</label>
                        <input 
                          type="text" 
                          className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-white"
                          value={newCustomField.name}
                          onChange={e => setNewCustomField({...newCustomField, name: e.target.value, system_name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')})}
                          placeholder="e.g. Loyalty Tier"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">System Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-gray-400"
                          value={newCustomField.system_name}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Field Type</label>
                        <select 
                          className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-white"
                          value={newCustomField.type}
                          onChange={e => setNewCustomField({...newCustomField, type: e.target.value})}
                        >
                          <option>Text</option>
                          <option>Paragraph</option>
                          <option>Number</option>
                          <option>Date</option>
                          <option>Dropdown</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddCustomField} className="px-4 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-md hover:bg-primary-600">Create Field</button>
                      <button onClick={() => setShowAddCustomField(false)} className="px-4 py-1.5 bg-surface text-text-secondary text-sm font-medium rounded-md border border-border hover:text-white">Cancel</button>
                    </div>
                  </div>
                )}

                {localContact.custom_fields && Object.keys(localContact.custom_fields).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {Object.entries(localContact.custom_fields).map(([key, val]) => {
                      const isEditing = editingField === key
                      // We don't have the type metadata stored cleanly in this raw JSONB mock, so we guess text/paragraph
                      // A real app would join with `custom_field_definitions`
                      const fieldType = String(val).length > 50 ? 'paragraph' : 'string'

                      return (
                        <div key={key} className="flex flex-col gap-1.5 group/field">
                          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">{key}</label>
                          
                          {isEditing ? (
                            <div className="flex items-start gap-2">
                              {renderEditInput({ key, type: fieldType }, true)}
                              <button onClick={() => handleSaveField(key, true)} className="p-1.5 mt-0.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={handleCancelEdit} className="p-1.5 mt-0.5 bg-surface2 text-text-muted rounded-md hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between px-3 py-2 -ml-3 rounded-md border border-transparent hover:border-border hover:bg-white/5 transition-colors">
                              <div className={cn("text-sm text-white")}>
                                {renderFieldValue({ type: fieldType }, val)}
                              </div>
                              <button 
                                onClick={() => handleEditClick(key, val, true)}
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
                ) : (
                  !showAddCustomField && (
                    <div className="text-center py-10 text-sm text-text-secondary italic bg-panel rounded-lg border border-border">
                      No custom fields found for this contact.
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <OmnichannelTimeline contactId={contact.id} />
        )}

        {/* CONVERSATIONS TAB */}
        {activeTab === 'conversations' && (
          <div className="h-full flex items-center justify-center text-text-secondary bg-surface border border-border rounded-lg min-h-[300px]">
            <div className="text-center flex flex-col items-center gap-3">
              <MessageCircle className="h-10 w-10 text-text-secondary opacity-50" />
              <p>Embedded inbox view goes here.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
