'use client'

import React, { useState } from 'react'
import { Download, Plus, Filter, Columns, Search, Tags, Users, GitMerge, Trash } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ContactsToolbarProps {
  selectedCount: number
  onSearch: (query: string) => void
  onAction: (action: string) => void
}

export function ContactsToolbar({ selectedCount, onSearch, onAction }: ContactsToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    onSearch(e.target.value)
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
              <button className="bg-surface border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                <Filter className="w-4 h-4" />
                Filter Attributes
              </button>
              <button className="bg-surface border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                <Columns className="w-4 h-4" />
                View
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
