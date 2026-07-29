'use client'

import React, { useState } from 'react'
import { Contact } from '@/types'
import { ContactsGrid } from './ContactsGrid'
import { ContactsToolbar } from './ContactsToolbar'
import { CreateContactModal } from './CreateContactModal'

interface Props {
  initialContacts: Contact[]
}

export function ContactsClientWrapper({ initialContacts }: Props) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const handleSearch = (query: string) => {
    // Basic local filter for demo purposes. 
    // In production, this would hit the API and trigger Supabase search.
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

  return (
    <>
      <ContactsToolbar 
        selectedCount={selectedIds.length} 
        onSearch={handleSearch}
        onAction={handleAction}
      />
      <ContactsGrid 
        contacts={contacts} 
        onSelectionChange={setSelectedIds} 
      />
      <CreateContactModal 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          // Ideally refresh contacts list here
          console.log("Contact created successfully")
        }}
      />
    </>
  )
}
