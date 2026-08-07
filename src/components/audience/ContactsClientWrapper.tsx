'use client'

import React, { useState, useMemo } from 'react'
import { Contact, SavedView } from '@/types'
import { ContactsGrid } from './ContactsGrid'
import { ContactsToolbar } from './ContactsToolbar'
import { CreateContactModal } from './CreateContactModal'
import { ALL_CONTACT_FIELDS } from '@/lib/audience-constants'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialContacts: Contact[]
  initialSavedViews?: SavedView[]
}

export function ContactsClientWrapper({ initialContacts, initialSavedViews = [] }: Props) {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  
  // Advanced State for Views, Sorting, and Filtering
  const [savedViews, setSavedViews] = useState<SavedView[]>(initialSavedViews)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'phone', 'email', 'wa_opt_in_status', 'tags'])
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
  const [filterConfig, setFilterConfig] = useState<Record<string, string>>({})

  // Determine Workspace ID safely
  const workspaceId = contacts.length > 0 ? contacts[0].workspace_id : undefined

  // Load localStorage saved views on mount if present
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('custom_saved_views_contacts')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedViews(prev => {
            const combined = [...prev]
            parsed.forEach((pv: SavedView) => {
              if (!combined.some(c => c.name === pv.name)) {
                combined.push(pv)
              }
            })
            return combined
          })
        }
      }
    } catch (e) {}
  }, [])

  // Extract all unique custom field keys
  const customFieldKeys = useMemo(() => {
    const keys = new Set<string>()
    initialContacts.forEach(c => {
      if (c.custom_fields) {
        Object.keys(c.custom_fields).forEach(k => keys.add(k))
      }
    })
    return Array.from(keys)
  }, [initialContacts])

  // Combine standard fields and extracted custom fields
  const allAvailableColumns = useMemo(() => {
    const standardCols = ALL_CONTACT_FIELDS.map(f => ({ key: f.key, label: f.label, type: f.type }))
    const customCols = customFieldKeys.map(k => ({ key: k, label: k, type: 'custom' }))
    return [...standardCols, ...customCols]
  }, [customFieldKeys])

  // Processing Engine: Filter -> Sort
  const processedContacts = useMemo(() => {
    let result = [...contacts]

    // 1. Apply Filters (Substring matching)
    if (Object.keys(filterConfig).length > 0) {
      result = result.filter(c => {
        return Object.entries(filterConfig).every(([key, filterVal]) => {
          if (!filterVal) return true
          const val = c.custom_fields?.[key] ?? (c as any)[key]
          if (val == null) return false
          return String(val).toLowerCase().includes(filterVal.toLowerCase())
        })
      })
    }

    // 2. Apply Sorts
    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a.custom_fields?.[sortConfig.key] ?? (a as any)[sortConfig.key]
        const valB = b.custom_fields?.[sortConfig.key] ?? (b as any)[sortConfig.key]
        
        if (valA == null && valB != null) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA != null && valB == null) return sortConfig.direction === 'asc' ? 1 : -1
        if (valA == null && valB == null) return 0
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA
        }
        
        const strA = String(valA).toLowerCase()
        const strB = String(valB).toLowerCase()
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [contacts, filterConfig, sortConfig])


  const handleSearch = (query: string) => {
    const lowerQ = query.toLowerCase()
    const filtered = initialContacts.filter(c => 
      c.name?.toLowerCase().includes(lowerQ) ||
      c.phone?.toLowerCase().includes(lowerQ) ||
      c.email?.toLowerCase().includes(lowerQ)
    )
    setContacts(filtered)
  }

  const handleAction = (action: string) => {
    if (action === 'new') {
      setIsCreateOpen(true)
    } else {
      console.log(`Action triggered: ${action} on ${selectedIds.length} contacts`)
    }
  }

  const handleUpdateContact = async (id: string, key: string, value: any, isCustom: boolean) => {
    setContacts(prev => prev.map(c => {
      if (c.id === id) {
        if (isCustom) {
          const newCustomFields = { ...(c.custom_fields || {}), [key]: value }
          // Fire and forget Supabase update
          supabase.from('contacts').update({ custom_fields: newCustomFields }).eq('id', id).then()
          return { ...c, custom_fields: newCustomFields }
        }
        // Fire and forget Supabase update
        supabase.from('contacts').update({ [key]: value }).eq('id', id).then()
        return { ...c, [key]: value }
      }
      return c
    }))
  }

  // Handle Saving Views to Supabase with LocalStorage fallback
  const handleSaveView = async (name: string) => {
    // Check if view name already exists
    const existing = savedViews.find(v => v.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      alert('A view with this name already exists.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const newViewPayload = {
      id: `local-view-${Date.now()}`,
      workspace_id: workspaceId || '00000000-0000-0000-0000-000000000000',
      user_id: user?.id,
      entity_type: 'contacts',
      name,
      is_default: false,
      is_shared: false,
      columns: visibleColumns,
      filters: filterConfig,
      sorts: sortConfig ? { [sortConfig.key]: sortConfig.direction } : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Try saving to database first
    const { data, error } = await supabase
      .from('saved_views')
      .insert({
        workspace_id: newViewPayload.workspace_id,
        user_id: newViewPayload.user_id,
        entity_type: newViewPayload.entity_type,
        name: newViewPayload.name,
        columns: newViewPayload.columns,
        filters: newViewPayload.filters,
        sorts: newViewPayload.sorts
      })
      .select()
      .single()

    if (!error && data) {
      setSavedViews(prev => [...prev, data as SavedView])
    } else {
      // If DB insert fails (e.g. RLS or schema sync), save locally to local state and localStorage so user is never blocked!
      console.warn('DB Save View fallback to LocalStorage:', error)
      const createdView = newViewPayload as unknown as SavedView
      setSavedViews(prev => {
        const next = [...prev, createdView]
        try { localStorage.setItem('custom_saved_views_contacts', JSON.stringify(next)) } catch(e){}
        return next
      })
    }
  }

  const handleDeleteView = async (id: string) => {
    if (!id.startsWith('local-view-')) {
      await supabase.from('saved_views').delete().eq('id', id)
    }
    setSavedViews(prev => {
      const next = prev.filter(v => v.id !== id)
      try { localStorage.setItem('custom_saved_views_contacts', JSON.stringify(next)) } catch(e){}
      return next
    })
  }

  const handleApplyView = (view: SavedView) => {
    setVisibleColumns(view.columns || [])
    setFilterConfig((view.filters as unknown as Record<string, string>) || {})
    
    // We only support single-column sort locally right now
    if (view.sorts && Object.keys(view.sorts).length > 0) {
      const [key, direction] = Object.entries(view.sorts)[0]
      setSortConfig({ key, direction: direction as 'asc' | 'desc' })
    } else {
      setSortConfig(null)
    }
  }

  const toggleSort = (colKey: string) => {
    setSortConfig(prev => {
      if (prev?.key === colKey) {
        if (prev.direction === 'asc') return { key: colKey, direction: 'desc' }
        return null // turn off sorting
      }
      return { key: colKey, direction: 'asc' }
    })
  }

  const setFilter = (colKey: string, val: string) => {
    setFilterConfig(prev => {
      if (!val) {
        const next = { ...prev }
        delete next[colKey]
        return next
      }
      return { ...prev, [colKey]: val }
    })
  }

  return (
    <>
      <ContactsToolbar 
        selectedCount={selectedIds.length} 
        onSearch={handleSearch}
        onAction={handleAction}
        allColumns={allAvailableColumns}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        savedViews={savedViews}
        onSaveView={handleSaveView}
        onDeleteView={handleDeleteView}
        onApplyView={handleApplyView}
      />
      <ContactsGrid 
        contacts={processedContacts} 
        onSelectionChange={setSelectedIds} 
        selectedIds={selectedIds}
        allColumns={allAvailableColumns}
        visibleColumns={visibleColumns}
        onUpdateContact={handleUpdateContact}
        sortConfig={sortConfig}
        onSort={toggleSort}
        filterConfig={filterConfig}
        onFilter={setFilter}
      />
      <CreateContactModal 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          console.log("Contact created successfully")
        }}
      />
    </>
  )
}
