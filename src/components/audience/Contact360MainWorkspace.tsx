'use client'

import React, { useState } from 'react'
import { Contact } from '@/types'
import { Activity, Clock, MessageCircle, BarChart3, Settings, Edit2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Contact360MainWorkspaceProps {
  contact: Contact
}

// Field Group Configuration
const FIELD_GROUPS = [
  {
    id: 'personal',
    label: 'Personal Information',
    fields: [
      { key: 'name', label: 'Full Name' },
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'gender', label: 'Gender' },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
    ]
  },
  {
    id: 'communication',
    label: 'Communication',
    fields: [
      { key: 'phone', label: 'Primary Phone' },
      { key: 'secondary_phone', label: 'Secondary Phone' },
      { key: 'email', label: 'Primary Email' },
      { key: 'secondary_email', label: 'Secondary Email' },
      { key: 'preferred_channel', label: 'Preferred Channel' },
    ]
  },
  {
    id: 'business',
    label: 'Business',
    fields: [
      { key: 'company_name', label: 'Company Name' },
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'job_title', label: 'Job Title' },
    ]
  },
  {
    id: 'location',
    label: 'Location',
    fields: [
      { key: 'country', label: 'Country' },
      { key: 'state', label: 'State' },
      { key: 'city', label: 'City' },
      { key: 'area', label: 'Area' },
      { key: 'landmark', label: 'Landmark' },
      { key: 'pin_code', label: 'PIN Code' },
    ]
  },
  {
    id: 'social',
    label: 'Social Profiles',
    fields: [
      { key: 'facebook_url', label: 'Facebook URL' },
      { key: 'instagram_url', label: 'Instagram URL' },
      { key: 'linkedin_url', label: 'LinkedIn URL' },
      { key: 'instagram_username', label: 'Instagram Username' },
    ]
  },
  {
    id: 'system',
    label: 'System & CRM',
    fields: [
      { key: 'lifecycle_stage', label: 'Lifecycle Stage' },
      { key: 'status', label: 'Status' },
      { key: 'owner_id', label: 'Owner ID' },
      { key: 'source', label: 'Source' },
      { key: 'campaign', label: 'Campaign' },
      { key: 'referrer', label: 'Referrer' },
    ]
  }
]

export function Contact360MainWorkspace({ contact }: Contact360MainWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  
  // Local state to simulate updates
  const [localContact, setLocalContact] = useState<Contact>(contact)

  const handleEditClick = (key: string, value: any) => {
    setEditingField(key)
    setEditValue(value === null || value === undefined ? '' : String(value))
  }

  const handleSaveField = (key: string) => {
    setLocalContact(prev => ({ ...prev, [key]: editValue }))
    setEditingField(null)
  }

  const handleCancelEdit = () => {
    setEditingField(null)
  }

  return (
    <div className="h-full flex flex-col bg-base relative z-10">
      
      {/* Sticky Tab Header */}
      <div className="flex-none border-b border-border bg-base px-6 pt-6 sticky top-0 z-10 shrink-0">
        <div className="flex space-x-8 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'overview' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('fields')}
            className={cn(
              "pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'fields' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            All Fields & Properties
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={cn(
              "pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'timeline' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            Timeline
          </button>
          <button 
            onClick={() => setActiveTab('conversations')}
            className={cn(
              "pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'conversations' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white"
            )}
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
            
            {/* Recent Activity Mini */}
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
                <div className="relative flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-surface shadow shrink-0 z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 p-4 rounded-lg border border-border bg-panel shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white text-sm">Message Read</div>
                      <time className="text-xs font-medium text-text-secondary">3 hours ago</time>
                    </div>
                    <div className="text-text-secondary text-xs">User read the pricing update broadcast.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CRM Insights */}
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
                <div className="bg-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Last Contacted</div>
                  <div className="text-sm font-semibold text-white truncate">
                    {localContact.last_contacted_at ? new Date(localContact.last_contacted_at).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div className="bg-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Active Since</div>
                  <div className="text-sm font-semibold text-white truncate">
                    {localContact.created_at ? new Date(localContact.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* FIELDS TAB (The enormous list of all fields) */}
        {activeTab === 'fields' && (
          <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {FIELD_GROUPS.map(group => (
              <div key={group.id} className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="bg-panel/50 px-6 py-4 border-b border-border">
                  <h3 className="font-semibold text-white">{group.label}</h3>
                </div>
                <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-6">
                  {group.fields.map(field => {
                    const value = localContact[field.key as keyof Contact]
                    const isEditing = editingField === field.key

                    return (
                      <div key={field.key} className="flex flex-col gap-1.5 group/field">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wide">{field.label}</label>
                        
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type={field.type === 'date' ? 'date' : 'text'}
                              className="flex-1 bg-panel border border-primary-500 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveField(field.key)}
                            />
                            <button onClick={() => handleSaveField(field.key)} className="p-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={handleCancelEdit} className="p-1.5 bg-surface2 text-text-muted rounded-md hover:text-white transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between px-3 py-1.5 -ml-3 rounded-md border border-transparent hover:border-border hover:bg-white/5 transition-colors">
                            <span className={cn("text-sm", !value && "text-text-muted italic")}>
                              {value ? (field.type === 'date' ? new Date(value as string).toLocaleDateString() : String(value)) : 'Empty'}
                            </span>
                            <button 
                              onClick={() => handleEditClick(field.key, value)}
                              className="opacity-0 group-hover/field:opacity-100 p-1 text-text-muted hover:text-primary-400 transition-all"
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
            ))}

            {/* Custom Fields section could be dynamically generated here by iterating over custom_fields jsonb */}
            <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-panel/50 px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-white">Custom Fields</h3>
              </div>
              <div className="p-6">
                {localContact.custom_fields && Object.keys(localContact.custom_fields).length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    {Object.entries(localContact.custom_fields).map(([key, val]) => (
                      <div key={key} className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wide">{key}</label>
                        <div className="px-3 py-1.5 -ml-3">
                          <span className="text-sm text-white">{String(val)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-text-secondary italic">
                    No custom fields found for this contact.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="h-full flex items-center justify-center text-text-secondary bg-surface border border-border rounded-lg min-h-[300px]">
            <div className="text-center flex flex-col items-center gap-3">
              <Clock className="h-10 w-10 text-text-secondary opacity-50" />
              <p>Full Unified Event Timeline goes here.</p>
            </div>
          </div>
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
