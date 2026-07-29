'use client'

import React from 'react'
import { Contact } from '@/types'
import { ArrowLeft, Edit, MessageSquare, Megaphone, Plus, MoreHorizontal, MessageCircle, Mail, Sparkles, Zap, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Contact360LayoutProps {
  contact: Contact
  children: React.ReactNode
}

export function Contact360Layout({ contact, children }: Contact360LayoutProps) {
  const router = useRouter()

  // Helper to assign consistent avatar gradient based on string length
  const getAvatarGradient = (id: string) => {
    if (!id) return 'avatar-gradient-1'
    const hash = id.length % 4 + 1
    return `avatar-gradient-${hash}`
  }

  return (
    <div className="flex flex-col h-full bg-base overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-surface border-b border-border p-4 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/audience/contacts')}
            className="p-2 rounded-md hover:bg-white/5 text-text-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${getAvatarGradient(contact.id)} shadow-[0_0_15px_rgba(56,189,248,0.4)] flex items-center justify-center font-bold text-xl text-white`}>
              {contact.name?.substring(0, 2).toUpperCase() || 'NA'}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
                {contact.name || 'Unknown Contact'}
                <span className="px-2 py-0.5 rounded text-xs bg-surface border border-border text-gray-300 font-normal">
                  {contact.wa_opt_in_status === 'subscribed' ? 'Customer' : 'Lead'}
                </span>
              </h1>
              <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${contact.wa_opt_in_status === 'subscribed' ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}></span>
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
          <button className="bg-surface border border-border hover:border-text-secondary text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-[0_0_15px_rgba(14,165,233,0.3)]">
            <MessageSquare className="w-4 h-4" /> Message
          </button>
          <button className="bg-surface border border-border hover:border-text-secondary text-gray-300 p-2 rounded-lg transition-colors hidden lg:flex">
            <Megaphone className="w-5 h-5" />
          </button>
          <button className="bg-surface border border-border hover:border-text-secondary text-gray-300 p-2 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Details */}
        <aside className="w-[320px] flex-none bg-panel border-r border-border p-6 flex flex-col gap-6 overflow-y-auto">
          
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-sm text-white tracking-wide">CONTACT DETAILS</h3>
            <div className="bg-surface rounded-lg border border-border p-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-start gap-4">
                <span className="text-text-secondary">Phone</span>
                <span className="font-medium text-white text-right">{contact.phone || '—'}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-text-secondary">Email</span>
                <span className="font-medium text-white text-right break-all">{contact.email || '—'}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-text-secondary">Company</span>
                <span className="font-medium text-white text-right">{contact.company_name || '—'}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-text-secondary">Country</span>
                <span className="font-medium text-white text-right">{contact.country || '—'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-sm text-white tracking-wide">REACHABILITY</h3>
            <div className="bg-surface rounded-lg border border-border p-4 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageCircle className={`w-4 h-4 ${contact.wa_opt_in_status === 'subscribed' ? 'text-green-400' : 'text-text-secondary'}`} /> 
                  WhatsApp
                </span>
                <span className={contact.wa_opt_in_status === 'subscribed' ? 'text-green-400 font-medium' : 'text-text-secondary'}>
                  {contact.wa_opt_in_status === 'subscribed' ? 'Connected' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mail className={`w-4 h-4 ${contact.email ? 'text-green-400' : 'text-text-secondary'}`} /> 
                  Email
                </span>
                <span className={contact.email ? 'text-green-400 font-medium' : 'text-text-secondary'}>
                  {contact.email ? 'Verified' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white tracking-wide">TAGS</h3>
              <button className="text-primary-400 text-xs font-medium hover:text-primary-300 transition-colors">+ Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {contact.tags && contact.tags.length > 0 ? (
                contact.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-text-secondary italic">No tags</span>
              )}
            </div>
          </div>

        </aside>

        {/* Center Workspace */}
        <main className="flex-1 bg-base flex flex-col relative overflow-hidden">
          {children}
        </main>

        {/* Right Sidebar: Intelligence */}
        <aside className="w-[320px] flex-none bg-panel border-l border-border p-6 flex flex-col gap-6 overflow-y-auto hidden xl:flex">
          
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-sm sparkle-gradient flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" /> AI Summary
            </h3>
            <div className="bg-gradient-to-b from-purple-900/20 to-pink-900/10 border border-purple-500/20 rounded-xl p-4 text-sm text-gray-300 leading-relaxed relative overflow-hidden shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
              {contact.name || 'This user'} is a potential lead who recently engaged with the Summer Campaign via WhatsApp. They typically respond within 15 minutes during morning hours.
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <h3 className="font-semibold text-sm text-white tracking-wide flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> Next Best Action
            </h3>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-sm text-white font-medium mb-3">Send follow-up catalog</p>
              <p className="text-xs text-text-secondary mb-4">Lead viewed the pricing page 2 hours ago. Sending the latest catalog has a 68% conversion probability.</p>
              <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg text-xs font-medium transition-colors flex justify-center items-center gap-2">
                Execute Action <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </aside>

      </div>
    </div>
  )
}
