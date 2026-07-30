'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, ArrowUp, ArrowDown, ArrowUpDown, Edit2, Check, X, Search } from 'lucide-react'
import { Contact } from '@/types'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/utils'

interface ContactsGridProps {
  contacts: Contact[]
  onSelectionChange: (selectedIds: string[]) => void
  selectedIds: string[]
  allColumns: { key: string; label: string; type: string }[]
  visibleColumns: string[]
  onUpdateContact: (id: string, key: string, value: any, isCustom: boolean) => void
  sortConfig: { key: string, direction: 'asc' | 'desc' } | null
  onSort: (colKey: string) => void
  filterConfig: Record<string, string>
  onFilter: (colKey: string, val: string) => void
}

export function ContactsGrid({ 
  contacts, 
  onSelectionChange, 
  selectedIds, 
  allColumns, 
  visibleColumns, 
  onUpdateContact,
  sortConfig,
  onSort,
  filterConfig,
  onFilter
}: ContactsGridProps) {
  const router = useRouter()
  const selectedSet = new Set(selectedIds)
  
  // Inline Edit State
  const [editingCell, setEditingCell] = useState<{ id: string; key: string; isCustom: boolean } | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  
  // Inline Filter Popover State
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null)
  const filterInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeFilterCol && filterInputRef.current) {
      filterInputRef.current.focus()
    }
  }, [activeFilterCol])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(contacts.map(c => c.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSet = new Set(selectedSet)
    if (checked) newSet.add(id)
    else newSet.delete(id)
    onSelectionChange(Array.from(newSet))
  }

  const handleRowClick = (id: string) => {
    router.push(`/contacts/${id}`)
  }

  const getAvatarGradient = (id: string) => {
    const hash = (id.length || 0) % 4 + 1
    return `avatar-gradient-${hash}`
  }

  const startEditing = (contact: Contact, colKey: string, isCustom: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCell({ id: contact.id, key: colKey, isCustom })
    if (isCustom) {
      setEditValue(contact.custom_fields?.[colKey] || '')
    } else {
      setEditValue(contact[colKey as keyof Contact] || '')
    }
  }

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCell(null)
  }

  const saveEditing = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (editingCell) {
      onUpdateContact(editingCell.id, editingCell.key, editValue, editingCell.isCustom)
      setEditingCell(null)
    }
  }

  const renderEditInput = (col: { key: string; label: string; type: string }) => {
    const type = col.type || 'string'
    let inputType = 'text'
    if (type === 'number') inputType = 'number'
    if (type === 'date' || type === 'datetime') inputType = 'date'
    if (type === 'url' || type === 'image') inputType = 'url'

    return (
      <div className="flex items-center gap-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
        <input 
          type={inputType}
          autoFocus
          className="w-full bg-slate-950 border border-primary-500 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-inner"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEditing(e)
            if (e.key === 'Escape') {
              e.stopPropagation()
              setEditingCell(null)
            }
          }}
        />
        <button onClick={saveEditing} className="p-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors flex-none shadow">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancelEditing} className="p-1 bg-slate-800 text-slate-400 rounded hover:text-white transition-colors flex-none">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  const renderCellValue = (contact: any, col: { key: string; label: string; type: string }) => {
    const isCustom = col.type === 'custom'
    const isEditing = editingCell?.id === contact.id && editingCell?.key === col.key

    if (isEditing) {
      return renderEditInput(col)
    }

    let val = isCustom ? contact.custom_fields?.[col.key] : contact[col.key]

    // Special formatting based on column
    let displayContent = null

    if (col.key === 'name') {
      displayContent = (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${getAvatarGradient(contact.id)} flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-500/20 flex-none`}>
            {contact.name?.substring(0, 2).toUpperCase() || 'NA'}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white truncate text-xs">{contact.name || 'Unknown Contact'}</div>
            <div className="text-[10px] text-slate-400 truncate">Added {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : 'Recently'}</div>
          </div>
        </div>
      )
    } else if (col.key === 'wa_opt_in_status') {
      const isSubbed = val === 'subscribed' || (contact.phone && val !== 'unsubscribed')
      displayContent = isSubbed ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          WhatsApp
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          WhatsApp
        </span>
      )
    } else if (col.type === 'multiselect' || col.key === 'tags') {
      const tags = val || []
      displayContent = (
        <div className="flex gap-1.5 items-center">
          {tags.length > 0 ? (
            tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-medium">{tag}</span>
            ))
          ) : (
            <span className="text-slate-500 italic text-[10px]">None</span>
          )}
          {tags.length > 2 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-400">+{tags.length - 2}</span>
          )}
        </div>
      )
    } else if (col.type === 'date' || col.type === 'datetime') {
      displayContent = val ? new Date(val).toLocaleDateString() : '-'
    } else {
      displayContent = val ? String(val) : <span className="text-slate-600 opacity-60">-</span>
    }

    return (
      <div className="flex items-center justify-between group/cell relative min-h-[26px]">
        <div className={cn("truncate pr-6 text-xs", typeof val === 'number' ? 'text-primary-300 font-medium' : 'text-slate-300')}>
          {displayContent}
        </div>
        <button 
          onClick={(e) => startEditing(contact, col.key, isCustom, e)}
          className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-400 hover:text-primary-400 hover:bg-slate-800/80 rounded transition-all absolute right-0"
          title="Edit Cell"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>
    )
  }

  const isFrozen = (key: string) => key === 'name'

  return (
    <div className="flex-1 bg-slate-900/90 rounded-xl shadow-2xl flex flex-col border border-slate-800/80 relative z-10 min-h-0 overflow-hidden backdrop-blur-md">
      <div className="overflow-auto flex-1 w-full relative">
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
          <thead className="bg-slate-950/90 sticky top-0 z-30 backdrop-blur-md border-b border-slate-800">
            <tr>
              {/* Checkbox Column - Frozen Left 0 */}
              <th className="py-3 px-4 w-12 border-b border-slate-800 sticky left-0 z-40 bg-slate-950 border-r border-slate-800/60 shadow-[2px_0_8px_rgba(0,0,0,0.5)]">
                <Checkbox 
                  checked={selectedSet.size === contacts.length && contacts.length > 0} 
                  onCheckedChange={handleSelectAll} 
                />
              </th>

              {visibleColumns.map(colKey => {
                const colDef = allColumns.find(c => c.key === colKey)
                if (!colDef) return null
                const frozen = isFrozen(colKey)
                const isSortedHere = sortConfig?.key === colKey
                const isFilteredHere = filterConfig[colKey] !== undefined
                
                return (
                  <th 
                    key={colKey} 
                    className={cn(
                      "py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 group relative select-none",
                      frozen ? "sticky left-[48px] z-40 bg-slate-950 shadow-[4px_0_12px_rgba(0,0,0,0.6)] border-r border-slate-800" : ""
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="cursor-pointer hover:text-white transition-colors" onClick={() => onSort(colKey)}>
                        {colDef.label}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {/* Active Sorting Icon */}
                        {isSortedHere ? (
                          <button onClick={() => onSort(colKey)} className="text-primary-400 p-0.5 bg-primary-500/10 rounded border border-primary-500/20">
                            {sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          </button>
                        ) : (
                          <button onClick={() => onSort(colKey)} className="text-slate-500 hover:text-slate-200 transition-colors">
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        )}

                        {/* Filter Icon & Popover */}
                        <div className="relative flex items-center">
                          <button 
                            onClick={() => setActiveFilterCol(activeFilterCol === colKey ? null : colKey)} 
                            className={cn("p-0.5 rounded transition-colors", isFilteredHere ? "text-primary-400 bg-primary-500/10 border border-primary-500/20" : "text-slate-500 hover:text-slate-200")}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                          
                          {activeFilterCol === colKey && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 z-50 flex items-center gap-1 text-xs">
                              <Search className="w-3.5 h-3.5 text-slate-400 flex-none ml-1" />
                              <input 
                                ref={filterInputRef}
                                type="text" 
                                placeholder={`Filter ${colDef.label}...`}
                                value={filterConfig[colKey] || ''}
                                onChange={e => onFilter(colKey, e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && setActiveFilterCol(null)}
                                className="flex-1 bg-transparent text-xs text-white border-none focus:outline-none focus:ring-0 placeholder:text-slate-500"
                              />
                              <button onClick={() => setActiveFilterCol(null)} className="p-1 text-slate-400 hover:text-white flex-none">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-800/60">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="h-48 text-center text-slate-400 italic">
                  No contacts found matching your view/filters.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr 
                  key={contact.id} 
                  className={`group cursor-pointer hover:bg-slate-800/50 transition-colors ${selectedSet.has(contact.id) ? 'bg-primary-500/10' : ''}`}
                  onClick={() => handleRowClick(contact.id)}
                >
                  {/* Frozen Checkbox Column */}
                  <td 
                    className="py-3 px-4 sticky left-0 z-20 bg-slate-900 group-hover:bg-slate-850 transition-colors border-r border-slate-800/60 shadow-[2px_0_8px_rgba(0,0,0,0.4)]" 
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <Checkbox 
                      checked={selectedSet.has(contact.id)}
                      onCheckedChange={(checked) => handleSelectRow(contact.id, checked as boolean)}
                    />
                  </td>

                  {/* Columns */}
                  {visibleColumns.map(colKey => {
                    const colDef = allColumns.find(c => c.key === colKey)
                    if (!colDef) return null
                    const frozen = isFrozen(colKey)
                    return (
                      <td 
                        key={colKey} 
                        className={cn(
                          "py-3 px-4 transition-colors",
                          frozen ? "sticky left-[48px] z-20 bg-slate-900 shadow-[4px_0_12px_rgba(0,0,0,0.5)] border-r border-slate-800 group-hover:bg-slate-850" : ""
                        )}
                      >
                        {renderCellValue(contact, colDef)}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="flex-none border-t border-slate-800 bg-slate-950 px-6 py-3 flex items-center justify-between text-xs z-10">
        <span className="text-slate-400">Showing 1 to {contacts.length} of {contacts.length} contacts</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-md bg-primary-500/20 text-primary-400 font-semibold border border-primary-500/30">1</button>
        </div>
      </div>
    </div>
  )
}
