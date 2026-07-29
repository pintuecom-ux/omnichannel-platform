'use client'

import React, { useState } from 'react'
import { Search, Filter, Tags, Users, Download, Plus, Trash, GitMerge } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onAction('import')}>
            <Download className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button size="sm" onClick={() => onAction('new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Contact
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/50">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-8 bg-background border-muted-foreground/20"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        
        <Button variant="outline" size="sm" className="bg-background text-muted-foreground hover:text-foreground">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 ml-4 animate-in fade-in slide-in-from-left-4">
            <span className="text-sm text-muted-foreground font-medium px-2">
              {selectedCount} selected
            </span>
            <Button variant="secondary" size="sm" onClick={() => onAction('bulk-tag')}>
              <Tags className="mr-2 h-4 w-4" /> Tag
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAction('bulk-list')}>
              <Users className="mr-2 h-4 w-4" /> List
            </Button>
            {selectedCount === 2 && (
              <Button variant="secondary" size="sm" onClick={() => onAction('merge')}>
                <GitMerge className="mr-2 h-4 w-4" /> Merge
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => onAction('bulk-delete')}>
              <Trash className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
