'use client'

import React, { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

interface CreateContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateContactModal({ open, onOpenChange, onSuccess }: CreateContactModalProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'manual'
  })

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const { data: p } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
      if (!p) throw new Error('No workspace found')

      const { error } = await supabase.from('contacts').insert({
        workspace_id: p.workspace_id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        source: formData.source,
        wa_opt_in_status: 'none'
      })

      if (error) throw error

      onSuccess?.()
      onOpenChange(false)
      setFormData({ name: '', phone: '', email: '', source: 'manual' })
    } catch (err: any) {
      alert(err.message || 'Failed to create contact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Create New Contact</ModalTitle>
        </ModalHeader>
        <div className="flex flex-col gap-4 py-4">
          <Input 
            label="Full Name" 
            placeholder="e.g. Jane Doe" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input 
            label="Phone Number" 
            placeholder="e.g. +1234567890" 
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input 
            label="Email Address" 
            placeholder="e.g. jane@example.com" 
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Select
            label="Lead Source"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            options={[
              { value: 'manual', label: 'Manual Entry' },
              { value: 'inbound', label: 'Inbound Message' },
              { value: 'import', label: 'CSV Import' },
              { value: 'api', label: 'API Integration' }
            ]}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Create Contact
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
