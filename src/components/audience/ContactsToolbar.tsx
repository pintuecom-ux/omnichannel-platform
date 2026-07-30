'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Download, Plus, Filter, Columns, Search, Tags, Users, GitMerge, Trash, Settings, Check, Save, X, Layers } from 'lucide-react'
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
    <div className="flex flex-col mb-5 relative z-30">
      
      {/* Top Header & Integrated Actions */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm flex items-center gap-2">
            Contacts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage and organize your centralized audience</p>
        </div>

        {/* Header Control Panel: Import, Filter, View, Columns, New Contact */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button 
            onClick={() => onAction('import')}
            className="bg-slate-800/90 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all text-xs font-medium shadow-sm hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Import
          </button>

          <button 
            onClick={() => onAction('filter')}
            className="bg-slate-800/90 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all text-xs font-medium shadow-sm hover:bg-slate-800"
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter Attributes
          </button>
          
          {/* Saved Views Dropdown */}
          <div className="relative" ref={viewsRef}>
            <button 
              onClick={() => {
                setShowSavedViews(!showSavedViews)
                setShowColumnConfig(false)
              }}
              className="bg-slate-800/90 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all text-xs font-medium shadow-sm hover:bg-slate-800"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              View
            </button>
            {showSavedViews && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden flex flex-col text-xs">
                <div className="p-3 border-b border-slate-800 bg-slate-950/80 text-white font-semibold flex justify-between items-center">
                  <span>Saved Views</span>
                  {!isSavingView && (
                    <button onClick={() => setIsSavingView(true)} className="flex items-center gap-1 text-primary-400 hover:text-primary-300 font-medium">
                      <Plus className="w-3.5 h-3.5" /> Save Current
                    </button>
                  )}
                </div>
                
                {isSavingView && (
                  <div className="p-2.5 border-b border-slate-800 bg-slate-850 flex items-center gap-2">
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Name this view..."
                      value={newViewName}
                      onChange={e => setNewViewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveSubmit()}
                      className="flex-1 bg-slate-950 border border-primary-500/80 rounded px-2.5 py-1 text-xs text-white focus:outline-none placeholder:text-slate-500"
                    />
                    <button onClick={handleSaveSubmit} className="p-1.5 bg-primary-500 text-white rounded hover:bg-primary-600">
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setIsSavingView(false)} className="p-1 text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="p-1.5 flex flex-col max-h-64 overflow-y-auto divide-y divide-slate-800/40">
                  {savedViews.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 italic">No saved views yet.</div>
                  ) : (
                    savedViews.map(view => {
                      const isActive = JSON.stringify(visibleColumns) === JSON.stringify(view.columns)
                      return (
                        <div key={view.id} className="flex items-center justify-between group/view hover:bg-slate-800/60 rounded-md px-2 py-1.5">
                          <button 
                            onClick={() => {
                              onApplyView(view)
                              setShowSavedViews(false)
                            }}
                            className="flex-1 flex items-center gap-2 text-left text-slate-200 hover:text-white truncate"
                          >
                            <Check className={cn("w-3.5 h-3.5 flex-none text-primary-400", isActive ? "opacity-100" : "opacity-0")} />
                            <span className="truncate font-medium">{view.name}</span>
                          </button>
                          <button 
                            onClick={() => onDeleteView(view.id)}
                            className="opacity-0 group-hover/view:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity flex-none"
                            title="Delete View"
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
              onClick={() => {
                setShowColumnConfig(!showColumnConfig)
                setShowSavedViews(false)
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800/90 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white transition-all shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              Columns ({visibleColumns.length}/50)
            </button>
            {showColumnConfig && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden flex flex-col max-h-[480px] text-xs">
                <div className="p-3 border-b border-slate-800 bg-slate-950/80 font-semibold text-white flex justify-between items-center">
                  <span>Configure Columns</span>
                  <span className="text-[10px] text-slate-400">{visibleColumns.length} / 50 selected</span>
                </div>
                <div className="p-2 overflow-y-auto flex-1 flex flex-col gap-0.5">
                  {allColumns.map(col => {
                    const checked = visibleColumns.includes(col.key)
                    return (
                      <label 
                        key={col.key} 
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors",
                          checked ? "bg-primary-500/10 text-white font-medium" : "hover:bg-slate-800/50 text-slate-300"
                        )}
                      >
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 accent-primary-500 cursor-pointer"
                          checked={checked}
                          onChange={() => toggleColumn(col.key)}
                          disabled={visibleColumns.length >= 50 && !checked}
                        />
                        <span className="truncate flex-1">
                          {col.label}
                        </span>
                        {col.type === 'custom' && (
                          <span className="text-[10px] bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded border border-primary-500/30 flex-none">Custom</span>
                        )}
                      </label>
                    )
                  })}
                </div>
                <div className="p-2.5 border-t border-slate-800 bg-slate-950/80">
                  <button 
                    onClick={() => setShowColumnConfig(false)}
                    className="w-full py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors shadow-md"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => onAction('new')}
            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-xs font-semibold shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] border border-primary-400/50 ml-1"
          >
            <Plus className="w-4 h-4" />
            New Contact
          </button>
        </div>
      </header>

      {/* Second Row: Search & Selection Actions */}
      <div className="flex items-center justify-between">
        {/* Search Input */}
        <div className="relative w-[360px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, phone, or email..." 
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
          />
        </div>

        {/* Batch Selection Action Bar */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
            <span className="text-xs text-primary-300 font-semibold px-2.5 py-1 bg-primary-500/10 rounded-md border border-primary-500/30">
              {selectedCount} selected
            </span>
            <button onClick={() => onAction('bulk-tag')} className="bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors">
              <Tags className="w-3.5 h-3.5" /> Tag
            </button>
            <button onClick={() => onAction('bulk-list')} className="bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors">
              <Users className="w-3.5 h-3.5" /> List
            </button>
            {selectedCount === 2 && (
              <button onClick={() => onAction('merge')} className="bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors">
                <GitMerge className="w-3.5 h-3.5" /> Merge
              </button>
            )}
            <button onClick={() => onAction('bulk-delete')} className="bg-rose-500/10 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors">
              <Trash className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
