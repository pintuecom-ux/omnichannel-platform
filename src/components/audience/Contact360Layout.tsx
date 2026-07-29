'use client'

import React from 'react'
import { Contact } from '@/types'
import { ArrowLeft, Edit, MessageSquare, Megaphone, UserPlus, GitMerge, Archive, Trash, Download, MoreHorizontal, Plus } from 'lucide-react'
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
    <div className="flex flex-col h-full overflow-hidden bg-base">
      {/* Header */}
      <header className="flex-none border-b border-border/50 bg-surface p-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/audience/contacts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
              {contact.name?.substring(0, 2).toUpperCase() || 'NA'}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                {contact.name || 'Unknown Contact'}
                <Badge variant="ghost" className="text-xs font-normal ml-2 text-text-secondary border-border">
                  {contact.wa_opt_in_status === 'subscribed' ? 'Customer' : 'Lead'}
                </Badge>
              </h1>
              <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
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

      {/* 3-Column Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Profile */}
        <aside className="w-80 flex-none border-r border-border bg-panel overflow-y-auto p-4 flex flex-col gap-6">
          {/* Identity Card */}
          <section className="bg-surface border border-border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Contact Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Phone</span>
                <span className="font-medium">{contact.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Email</span>
                <span className="font-medium truncate max-w-[150px]">{contact.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Company</span>
                <span className="font-medium">{contact.company_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Country</span>
                <span className="font-medium">{contact.country || '-'}</span>
              </div>
            </div>
          </section>

          {/* Reachability */}
          <section className="bg-surface border border-border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Reachability</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="text-green-500">✅</span> WhatsApp</span>
                <span className="text-text-secondary">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className={contact.email ? "text-green-500" : "text-amber-500"}>{contact.email ? "✅" : "⚠"}</span> Email</span>
                <span className="text-text-secondary">{contact.email ? "Verified" : "Unverified"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="text-red-500">❌</span> SMS</span>
                <span className="text-text-secondary">Opted Out</span>
              </div>
            </div>
          </section>

          {/* Tags */}
          <section>
            <h3 className="font-semibold text-sm mb-3 text-text-secondary px-1">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {contact.tags?.map(tag => (
                <Badge key={tag} variant="ghost" className="bg-primary/5 hover:bg-primary/10 text-primary">{tag}</Badge>
              ))}
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-text-secondary"><Plus className="mr-1 h-3 w-3"/> Add</Button>
            </div>
          </section>
        </aside>

        {/* Main Workspace (Center) */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-base">
          {children}
        </main>

        {/* Right Panel: Intelligence */}
        <aside className="w-72 flex-none border-l border-border bg-panel overflow-y-auto p-4 hidden xl:block">
          <section className="bg-primary/5 border border-primary/20 rounded-lg p-4 shadow-sm mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <span className="text-lg">✨</span> AI Summary
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed italic">
              AI Summary is currently unavailable for this contact.
            </p>
          </section>

          <section className="bg-surface border border-border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Next Best Action</h3>
            <div className="text-sm text-text-secondary py-4 text-center">
              No actions recommended at this time.
            </div>
          </section>
        </aside>

      </div>
    </div>
  )
}
