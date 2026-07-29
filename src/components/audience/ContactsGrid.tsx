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
    router.push(`/audience/contacts/${id}`)
  }

  return (
    <div className="rounded-md border border-border/50 bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
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
              <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                No contacts found.
              </TableCell>
            </TableRow>
          ) : (
            contacts.map((contact) => (
              <TableRow 
                key={contact.id} 
                className="hover:bg-muted/20 transition-colors group cursor-pointer"
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
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-xs">
                      {contact.name?.substring(0, 2).toUpperCase() || 'NA'}
                    </div>
                    <div className="font-medium text-foreground">{contact.name || 'Unknown Contact'}</div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{contact.phone || '-'}</TableCell>
                <TableCell className="text-muted-foreground">{contact.email || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {contact.wa_opt_in_status === 'subscribed' ? (
                      <Badge variant="ghost" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">WhatsApp</Badge>
                    ) : (
                      <Badge variant="ghost" className="text-muted-foreground border-border/50">WhatsApp</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {contact.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="ghost" className="text-xs bg-muted/50">{tag}</Badge>
                    ))}
                    {contact.tags && contact.tags.length > 2 && (
                      <span className="text-xs text-muted-foreground">+{contact.tags.length - 2}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(contact.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleRowClick(contact.id)}>
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
