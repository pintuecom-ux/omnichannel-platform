'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, ExternalLink, Settings, Filter, ArrowUpDown } from 'lucide-react'
import { Contact } from '@/types'
import { Checkbox } from '@/components/ui/Checkbox'

interface ContactsGridProps {
  contacts: Contact[]
  onSelectionChange: (selectedIds: string[]) => void
}

export type ColumnDef = {
  key: keyof Contact | string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'custom'
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Contact Name', type: 'string' },
  { key: 'phone', label: 'Primary Phone', type: 'string' },
  { key: 'email', label: 'Email Address', type: 'string' },
  { key: 'gender', label: 'Gender', type: 'string' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { key: 'company_name', label: 'Company', type: 'string' },
  { key: 'job_title', label: 'Job Title', type: 'string' },
  { key: 'country', label: 'Country', type: 'string' },
  { key: 'city', label: 'City', type: 'string' },
  { key: 'wa_opt_in_status', label: 'WhatsApp Status', type: 'string' },
  { key: 'tags', label: 'Tags', type: 'array' },
  { key: 'ai_score', label: 'AI Score', type: 'number' },
  { key: 'churn_risk', label: 'Churn Risk', type: 'number' },
  { key: 'created_at', label: 'Created Date', type: 'date' },
]

export function ContactsGrid({ contacts, onSelectionChange }: ContactsGridProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'phone', 'email', 'wa_opt_in_status', 'tags'])
  const [showColumnConfig, setShowColumnConfig] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = contacts.map(c => c.id)
      setSelectedIds(new Set(allIds))
      onSelectionChange(allIds)
    } else {
      setSelectedIds(new Set())
      onSelectionChange([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) newSet.add(id)
    else newSet.delete(id)
    setSelectedIds(newSet)
    onSelectionChange(Array.from(newSet))
  }

  const toggleColumn = (colKey: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(colKey)) return prev.filter(k => k !== colKey)
      if (prev.length >= 50) return prev
      return [...prev, colKey]
    })
  }

  const handleRowClick = (id: string) => {
    router.push(`/contacts/${id}`)
  }

  const getAvatarGradient = (id: string) => {
    const hash = id.length % 4 + 1
    return `avatar-gradient-${hash}`
  }

  const renderCellValue = (contact: any, col: ColumnDef) => {
    if (col.key === 'name') {
      return (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${getAvatarGradient(contact.id)} flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 flex-none`}>
            {contact.name?.substring(0, 2).toUpperCase() || 'NA'}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">{contact.name || 'Unknown Contact'}</div>
            <div className="text-xs text-text-muted truncate">Added {new Date(contact.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      )
    }
    
    if (col.key === 'wa_opt_in_status') {
      return contact.wa_opt_in_status === 'subscribed' ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          WhatsApp
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface text-text-secondary border border-border">
          WhatsApp
        </span>
      )
    }

    if (col.key === 'tags') {
      return (
        <div className="flex gap-1.5">
          {contact.tags && contact.tags.length > 0 ? (
            contact.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 rounded text-xs bg-surface border border-border text-gray-300">{tag}</span>
            ))
          ) : (
            <span className="text-text-muted italic text-xs">No tags</span>
          )}
          {contact.tags && contact.tags.length > 2 && (
            <span className="px-2 py-0.5 rounded text-xs bg-surface border border-border text-text-muted">+{contact.tags.length - 2}</span>
          )}
        </div>
      )
    }

    if (col.type === 'date' && contact[col.key]) {
      return new Date(contact[col.key]).toLocaleDateString()
    }

    // Default string or number rendering
    const val = contact[col.key] || contact?.custom_fields?.[col.key]
    return <span className={typeof val === 'number' ? 'text-primary-300 font-medium' : 'text-gray-300'}>{val || '-'}</span>
  }

  return (
    <div className="flex-1 glass-panel rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border relative z-10 min-h-0">
      {/* Table Toolbar Area */}
      <div className="p-3 border-b border-border bg-panel flex justify-end">
        <div className="relative">
          <button 
            onClick={() => setShowColumnConfig(!showColumnConfig)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border hover:bg-surface2 text-gray-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Columns ({visibleColumns.length}/50)
          </button>
          
          {showColumnConfig && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-96">
              <div className="p-3 border-b border-border bg-surface/50 text-xs font-semibold text-white">Configure Columns</div>
              <div className="p-2 overflow-y-auto flex-1 flex flex-col gap-1">
                {ALL_COLUMNS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-md cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-600 bg-surface accent-primary-500"
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      disabled={visibleColumns.length >= 50 && !visibleColumns.includes(col.key)}
                    />
                    <span className="text-sm text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
              <div className="p-2 border-t border-border bg-surface/50">
                <button 
                  onClick={() => setShowColumnConfig(false)}
                  className="w-full py-1.5 bg-primary-500/20 text-primary-400 rounded-md text-xs font-medium hover:bg-primary-500/30 transition-colors"
                >
                  Save View
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-panel/80 sticky top-0 z-20 backdrop-blur-md shadow-sm border-b border-border">
            <tr>
              <th className="py-3 px-5 w-12 border-b border-border">
                <Checkbox 
                  checked={selectedIds.size === contacts.length && contacts.length > 0} 
                  onCheckedChange={handleSelectAll} 
                />
              </th>
              {visibleColumns.map(colKey => {
                const colDef = ALL_COLUMNS.find(c => c.key === colKey)
                if (!colDef) return null
                return (
                  <th key={colKey} className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border group relative">
                    <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                      {colDef.label}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <Filter className="w-3.5 h-3.5 hover:text-primary-400" />
                        <ArrowUpDown className="w-3.5 h-3.5 hover:text-primary-400" />
                      </div>
                    </div>
                  </th>
                )
              })}
              <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border text-right sticky right-0 bg-panel/80 backdrop-blur-md">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-border/50">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="h-48 text-center text-text-secondary">
                  No contacts found.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr 
                  key={contact.id} 
                  className={`table-row-hover group cursor-pointer border-b border-white/5 ${selectedIds.has(contact.id) ? 'bg-panel/30' : ''}`}
                  onClick={() => handleRowClick(contact.id)}
                >
                  <td className="py-3 px-5" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.has(contact.id)}
                      onCheckedChange={(checked) => handleSelectRow(contact.id, checked as boolean)}
                    />
                  </td>
                  {visibleColumns.map(colKey => {
                    const colDef = ALL_COLUMNS.find(c => c.key === colKey)
                    if (!colDef) return null
                    return (
                      <td key={colKey} className="py-3 px-5">
                        {renderCellValue(contact, colDef)}
                      </td>
                    )
                  })}
                  <td className="py-3 px-5 text-right sticky right-0 bg-transparent" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    {/* Add gradient backdrop to mask text scrolling under sticky column if needed */}
                    <div className="absolute inset-y-0 left-0 w-8 -ml-8 bg-gradient-to-r from-transparent to-panel/90 pointer-events-none opacity-0 group-hover:opacity-100"></div>
                    <div className="row-actions flex items-center justify-end gap-1 relative z-10">
                      <button className="p-1.5 text-text-secondary hover:text-white hover:bg-white/10 rounded-md transition-colors"><MessageSquare className="w-4 h-4" /></button>
                      <button className="p-1.5 text-text-secondary hover:text-primary-400 hover:bg-primary-500/10 rounded-md transition-colors" onClick={() => handleRowClick(contact.id)}><ExternalLink className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="flex-none border-t border-border bg-surface px-6 py-4 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <span className="text-sm text-text-muted">Showing {contacts.length > 0 ? 1 : 0} to {contacts.length} of {contacts.length} contacts</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-sm rounded-md bg-primary-500/20 text-primary-400 font-medium">1</button>
        </div>
      </div>
    </div>
  )
}
