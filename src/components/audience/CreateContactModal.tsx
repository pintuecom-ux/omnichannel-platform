'use client'

import React, { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Mail, X, Save } from 'lucide-react'

interface CreateContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateContactModal({ open, onOpenChange, onSuccess }: CreateContactModalProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    waOptIn: true
  })

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const { data: p } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
      if (!p) throw new Error('No workspace found')

      const name = [formData.firstName, formData.lastName].filter(Boolean).join(' ') || 'Unknown Contact'

      const { error } = await supabase.from('contacts').insert({
        workspace_id: p.workspace_id,
        name: name,
        phone: formData.phone,
        email: formData.email,
        source: 'manual',
        wa_opt_in_status: formData.waOptIn ? 'subscribed' : 'none'
      })

      if (error) throw error

      onSuccess?.()
      onOpenChange(false)
      setFormData({ firstName: '', lastName: '', phone: '', email: '', waOptIn: true })
    } catch (err: any) {
      alert(err.message || 'Failed to create contact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg p-0">
        <ModalHeader className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <ModalTitle>Add New Contact</ModalTitle>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </ModalHeader>

        <div className="p-6 flex flex-col gap-5">
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">First Name</label>
              <input 
                type="text" 
                className="w-full bg-surface/50 border border-border focus:bg-surface focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-text-muted outline-none transition-all" 
                placeholder="Jane"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Last Name</label>
              <input 
                type="text" 
                className="w-full bg-surface/50 border border-border focus:bg-surface focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-text-muted outline-none transition-all" 
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Phone Number <span className="text-primary-400">*</span></label>
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center gap-1 border-r border-border pr-2">
                <span className="text-sm text-text-muted">US</span>
              </div>
              <input 
                type="tel" 
                className="w-full bg-surface/50 border border-border focus:bg-surface focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 rounded-lg pl-14 pr-3 py-2.5 text-sm text-white placeholder-text-muted outline-none transition-all" 
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="email" 
                className="w-full bg-surface/50 border border-border focus:bg-surface focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-text-muted outline-none transition-all" 
                placeholder="jane@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-3 mt-2 bg-surface/50 p-4 rounded-xl border border-white/5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="pt-0.5">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-600 bg-surface accent-primary-500 cursor-pointer mt-0.5" 
                  checked={formData.waOptIn}
                  onChange={(e) => setFormData({ ...formData, waOptIn: e.target.checked })}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors">WhatsApp Opt-in</span>
                <span className="text-xs text-text-secondary">User has explicitly consented to receive WhatsApp messages.</span>
              </div>
            </label>
          </div>
        </div>

        <ModalFooter className="bg-transparent border-t border-white/5 px-6 py-4 flex items-center justify-end gap-3">
          <button 
            onClick={() => onOpenChange(false)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || !formData.phone}
            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_20px_rgba(14,165,233,0.5)] border border-primary-400/50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Contact'}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
