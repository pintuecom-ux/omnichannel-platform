'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, MessageSquare, ExternalLink } from 'lucide-react'
import { Contact } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/Table'
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

  return (
    <div className="rounded-md border border-border bg-surface shadow-sm overflow-auto flex-1 min-h-0">
      <Table>
        <TableHeader className="bg-panel">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selectedIds.size === contacts.length && contacts.length > 0} 
                onCheckedChange={handleSelectAll} 
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Channel Status</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-48 text-center text-text-secondary">
                No contacts found.
              </TableCell>
            </TableRow>
          ) : (
            contacts.map((contact) => (
              <TableRow 
                key={contact.id} 
                className="hover:bg-hover transition-colors group cursor-pointer"
                onClick={() => handleRowClick(contact.id)}
              >
                <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={(checked) => handleSelectRow(contact.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center font-medium text-xs">
                      {contact.name?.substring(0, 2).toUpperCase() || 'NA'}
                    </div>
                    <div className="font-medium text-text-primary">{contact.name || 'Unknown Contact'}</div>
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">{contact.phone || '-'}</TableCell>
                <TableCell className="text-text-secondary">{contact.email || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {contact.wa_opt_in_status === 'subscribed' ? (
                      <Badge variant="ghost" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">WhatsApp</Badge>
                    ) : (
                      <Badge variant="ghost" className="text-text-secondary border-border">WhatsApp</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {contact.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="ghost" className="text-xs bg-panel">{tag}</Badge>
                    ))}
                    {contact.tags && contact.tags.length > 2 && (
                      <span className="text-xs text-text-secondary">+{contact.tags.length - 2}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary text-sm">
                  {new Date(contact.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 w-8 text-text-secondary hover:text-text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 text-text-secondary hover:text-text-primary" onClick={() => handleRowClick(contact.id)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
