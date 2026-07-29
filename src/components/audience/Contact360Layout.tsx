'use client'

import React from 'react'
import { Contact } from '@/types'
import { ArrowLeft, Edit, MessageSquare, Megaphone, Plus, MoreHorizontal } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useRouter } from 'next/navigation'

interface Contact360LayoutProps {
  contact: Contact
  children: React.ReactNode
}

export function Contact360Layout({ contact, children }: Contact360LayoutProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col h-full bg-base overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-surface border-b border-border p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/audience/contacts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0">
              {contact.name?.substring(0, 2).toUpperCase() || 'NA'}
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 m-0 leading-none">
                {contact.name || 'Unknown Contact'}
                <Badge variant="ghost" className="text-xs font-normal text-text-secondary border-border h-5">
                  {contact.wa_opt_in_status === 'subscribed' ? 'Customer' : 'Lead'}
                </Badge>
              </h1>
              <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${contact.wa_opt_in_status === 'subscribed' ? 'bg-green-500' : 'bg-amber-500'}`} />
                  {contact.wa_opt_in_status === 'subscribed' ? 'Active' : 'Pending'}
                </span>
                <span>•</span>
                <span>Primary: WhatsApp</span>
                <span>•</span>
                <span>Owner: System</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4"/> Edit</Button>
          <Button size="sm"><MessageSquare className="mr-2 h-4 w-4"/> Message</Button>
          <Button variant="outline" size="sm" className="hidden lg:flex"><Megaphone className="mr-2 h-4 w-4"/> Broadcast</Button>
          <Button variant="outline" size="sm"><MoreHorizontal className="h-4 w-4"/></Button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Details */}
        <aside className="w-80 flex-none bg-panel border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
          
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-text-primary">Contact Details</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between items-start gap-4">
                <span className="text-text-secondary shrink-0">Phone</span>
                <span className="font-medium text-right">{contact.phone || '—'}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-text-secondary shrink-0">Email</span>
                <span className="font-medium text-right break-all">{contact.email || '—'}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-text-secondary shrink-0">Company</span>
                <span className="font-medium text-right">{contact.company_name || '—'}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-text-secondary shrink-0">Country</span>
                <span className="font-medium text-right">{contact.country || '—'}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-text-primary">Reachability</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="text-green-500 text-xs">●</span> WhatsApp</span>
                <span className="text-text-secondary">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className={contact.email ? "text-green-500 text-xs" : "text-amber-500 text-xs"}>●</span> Email</span>
                <span className="text-text-secondary">{contact.email ? "Verified" : "Unverified"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="text-red-500 text-xs">●</span> SMS</span>
                <span className="text-text-secondary">Opted Out</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-text-primary">Tags</h3>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2"><Plus className="h-3 w-3 mr-1"/> Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {contact.tags && contact.tags.length > 0 ? (
                contact.tags.map(tag => (
                  <Badge key={tag} variant="ghost" className="bg-primary/5 text-primary border-transparent">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-text-secondary italic">No tags</span>
              )}
            </div>
          </div>

        </aside>

        {/* Center Workspace */}
        <main className="flex-1 bg-base overflow-y-auto relative min-w-0">
          {children}
        </main>

        {/* Right Sidebar: Intelligence */}
        <aside className="w-72 flex-none bg-panel border-l border-border p-4 flex flex-col gap-6 overflow-y-auto hidden xl:flex">
          
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
              ✨ AI Summary
            </h3>
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm text-text-secondary">
              <span className="italic">AI Summary is currently unavailable for this contact.</span>
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-text-primary">Next Best Action</h3>
            <div className="bg-surface border border-border rounded-md p-4 text-center text-sm text-text-secondary italic">
              No actions recommended at this time.
            </div>
          </div>

        </aside>

      </div>
    </div>
  )
}
