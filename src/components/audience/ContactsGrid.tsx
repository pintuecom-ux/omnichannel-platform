'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, ExternalLink } from 'lucide-react'
import { Contact } from '@/types'
import { Checkbox } from '@/components/ui/Checkbox'

interface ContactsGridProps {
  contacts: Contact[]
  onSelectionChange: (selectedIds: string[]) => void
}

export function ContactsGrid({ contacts, onSelectionChange }: ContactsGridProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
    onSelectionChange(Array.from(newSet))
  }

  const handleRowClick = (id: string) => {
    router.push(`/contacts/${id}`)
  }

  // Helper to assign consistent avatar gradient based on string length
  const getAvatarGradient = (id: string) => {
    const hash = id.length % 4 + 1
    return `avatar-gradient-${hash}`
  }

  return (
    <div className="flex-1 glass-panel rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border relative z-10 min-h-0">
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
              <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Contact Name</th>
              <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Phone Number</th>
              <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Email Address</th>
              <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Channels</th>
              <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Tags</th>
              <th className="py-3 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-border/50">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-48 text-center text-text-secondary">
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
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${getAvatarGradient(contact.id)} flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20`}>
                        {contact.name?.substring(0, 2).toUpperCase() || 'NA'}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{contact.name || 'Unknown Contact'}</div>
                        <div className="text-xs text-text-muted">Added {new Date(contact.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-gray-300 font-medium">{contact.phone || '-'}</td>
                  <td className="py-3 px-5 text-text-secondary">{contact.email || '-'}</td>
                  <td className="py-3 px-5">
                    {contact.wa_opt_in_status === 'subscribed' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        WhatsApp
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface text-text-secondary border border-border">
                        WhatsApp
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex gap-1.5">
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded text-xs bg-surface border border-border text-gray-300">{tag}</span>
                        ))
                      ) : (
                        <span className="text-text-muted italic text-xs">No tags</span>
                      )}
                      {contact.tags && contact.tags.length > 2 && (
                        <span className="px-2 py-0.5 rounded text-xs bg-surface border border-border text-text-muted">+{contact.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5 text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <div className="row-actions flex items-center justify-end gap-1">
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
