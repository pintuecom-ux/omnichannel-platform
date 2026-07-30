'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Download, Plus, Filter, Columns, Search, Tags, Users, GitMerge, Trash, Settings, ChevronDown, Check, Save, X } from 'lucide-react'
import { SavedView } from '@/types'
import { cn } from '@/lib/utils'

interface ContactsToolbarProps {
  selectedCount: number
  onSearch: (query: string) => void
  onAction: (action: string) => void
  allColumns: { key: string; label: string; type: string }[]
  visibleColumns: string[]
  setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>
  savedViews: SavedView[]
  onSaveView: (name: string) => void
  onDeleteView: (id: string) => void
  onApplyView: (view: SavedView) => void
}

export function ContactsToolbar({ 
  selectedCount, 
  onSearch, 
  onAction, 
  allColumns, 
  visibleColumns, 
  setVisibleColumns,
  savedViews,
  onSaveView,
  onDeleteView,
  onApplyView
}: ContactsToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [showSavedViews, setShowSavedViews] = useState(false)
  
  // Save view state
  const [isSavingView, setIsSavingView] = useState(false)
  const [newViewName, setNewViewName] = useState('')

  const colRef = useRef<HTMLDivElement>(null)
  const viewsRef = useRef<HTMLDivElement>(null)

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colRef.current && !colRef.current.contains(event.target as Node)) {
        setShowColumnConfig(false)
      }
      if (viewsRef.current && !viewsRef.current.contains(event.target as Node)) {
        setShowSavedViews(false)
        setIsSavingView(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    onSearch(e.target.value)
  }

  const toggleColumn = (colKey: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(colKey)) return prev.filter(k => k !== colKey)
      if (prev.length >= 50) return prev
      return [...prev, colKey]
    })
  }

  const handleSaveSubmit = async () => {
    if (!newViewName.trim()) return
    await onSaveView(newViewName)
    setNewViewName('')
    setIsSavingView(false)
  }

  return (
    <div className="flex flex-col mb-6 relative">
      
      {/* Decorative Background Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 -z-10"></div>

      {/* Top Header */}
      <header className="h-20 flex items-center justify-between flex-none z-10 border-b border-border/50 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary drop-shadow-sm">Contacts</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your centralized audience</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onAction('import')}
            className="bg-surface border border-border hover:border-text-secondary text-text-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Import
          </button>
          <button 
            onClick={() => onAction('new')}
            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] border border-primary-400/50"
          >
            <Plus className="w-4 h-4" />
            New Contact
          </button>
        </div>
      </header>

      {/* Workspace Toolbar */}
      <div className="flex items-center justify-between z-10">
        
        {/* Search */}
        <div className="relative w-[380px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search by name, phone, or email..." 
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
          />
        </div>
        
        {/* Filters and Actions */}
        <div className="flex gap-3">
          {selectedCount > 0 ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <span className="text-sm text-text-secondary font-medium px-2 bg-primary/10 rounded-md py-1 border border-primary/20">
                {selectedCount} selected
              </span>
              <button onClick={() => onAction('bulk-tag')} className="bg-surface border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                <Tags className="w-4 h-4" /> Tag
              </button>
              <button onClick={() => onAction('bulk-list')} className="bg-surface border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                <Users className="w-4 h-4" /> List
              </button>
              {selectedCount === 2 && (
                <button onClick={() => onAction('merge')} className="bg-surface border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                  <GitMerge className="w-4 h-4" /> Merge
                </button>
              )}
              <button onClick={() => onAction('bulk-delete')} className="bg-surface border border-danger-500/30 hover:border-danger-500 text-danger-500 hover:bg-danger-500/10 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                <Trash className="w-4 h-4" /> Delete
              </button>
            </div>
          ) : (
            <>
              {/* Filter Attributes Button */}
              <button className="bg-surface border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                <Filter className="w-4 h-4" />
                Filter Attributes
              </button>
              
              {/* Saved Views Dropdown */}
              <div className="relative" ref={viewsRef}>
                <button 
                  onClick={() => setShowSavedViews(!showSavedViews)}
                  className="bg-surface border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                >
                  <Columns className="w-4 h-4" />
                  View
                </button>
                {showSavedViews && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-border bg-surface/50 text-xs font-semibold text-white flex justify-between items-center">
                      <span>Saved Views</span>
                      {!isSavingView && (
                        <button onClick={() => setIsSavingView(true)} className="flex items-center gap-1 text-primary-400 hover:text-primary-300">
                          <Plus className="w-3.5 h-3.5" /> Save Current
                        </button>
                      )}
                    </div>
                    
                    {isSavingView && (
                      <div className="p-3 border-b border-border bg-surface flex items-center gap-2">
                        <input 
                          type="text" 
                          autoFocus
                          placeholder="Name this view..."
                          value={newViewName}
                          onChange={e => setNewViewName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSubmit()}
                          className="flex-1 bg-panel border border-primary-500 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                        />
                        <button onClick={handleSaveSubmit} className="p-1.5 bg-primary-500 text-white rounded hover:bg-primary-600">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setIsSavingView(false)} className="p-1.5 text-text-muted hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="p-1 flex flex-col max-h-60 overflow-y-auto">
                      {savedViews.length === 0 ? (
                        <div className="p-4 text-center text-xs text-text-muted italic">No saved views yet.</div>
                      ) : (
                        savedViews.map(view => {
                          const isActive = JSON.stringify(visibleColumns) === JSON.stringify(view.columns)
                          return (
                            <div key={view.id} className="flex items-center justify-between group/view hover:bg-white/5 rounded-md px-2 py-1">
                              <button 
                                onClick={() => {
                                  onApplyView(view)
                                  setShowSavedViews(false)
                                }}
                                className="flex-1 flex items-center gap-2 py-1 text-left text-sm text-gray-300 truncate"
                              >
                                <Check className={cn("w-4 h-4 flex-none text-primary-500", isActive ? "opacity-100" : "opacity-0")} />
                                <span className="truncate">{view.name}</span>
                              </button>
                              <button 
                                onClick={() => onDeleteView(view.id)}
                                className="opacity-0 group-hover/view:opacity-100 p-1 text-text-muted hover:text-danger-400 transition-opacity flex-none"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Columns Config Dropdown */}
              <div className="relative" ref={colRef}>
                <button 
                  onClick={() => setShowColumnConfig(!showColumnConfig)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Columns ({visibleColumns.length}/50)
                </button>
                {showColumnConfig && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
                    <div className="p-3 border-b border-border bg-surface/50 text-xs font-semibold text-white">Configure Columns</div>
                    <div className="p-2 overflow-y-auto flex-1 flex flex-col gap-1">
                      {allColumns.map(col => (
                        <label key={col.key} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-md cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-600 bg-surface accent-primary-500"
                            checked={visibleColumns.includes(col.key)}
                            onChange={() => toggleColumn(col.key)}
                            disabled={visibleColumns.length >= 50 && !visibleColumns.includes(col.key)}
                          />
                          <span className="text-sm text-gray-300">
                            {col.label} {col.type === 'custom' && <span className="text-xs text-primary-500/70 ml-1">(Custom)</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="p-3 border-t border-border bg-surface/50">
                      <button 
                        onClick={() => setShowColumnConfig(false)}
                        className="w-full py-1.5 bg-primary-500/20 text-primary-400 rounded-md text-xs font-medium hover:bg-primary-500/30 transition-colors"
                      >
                        Apply View
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
