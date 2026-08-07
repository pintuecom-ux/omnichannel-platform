'use client'
import React, { useState, useEffect } from 'react'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, X } from 'lucide-react'

interface CreateContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateContactModal({ open, onOpenChange, onSuccess }: CreateContactModalProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    waOptIn: true
  })

  const [customData, setCustomData] = useState<Record<string, any>>({})

  useEffect(() => {
    if (open) {
      loadCustomFields()
    }
  }, [open])

  async function loadCustomFields() {
    const { data } = await supabase.from('custom_field_definitions').select('*').eq('entity_type', 'contact')
    if (data) {
      setCustomFieldDefs(data)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const { data: p } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
      if (!p) throw new Error('No workspace found')

      const name = [formData.firstName, formData.lastName].filter(Boolean).join(' ') || 'Unknown Contact'

      // Validation for mandatory custom fields could go here

      const { error } = await supabase.from('contacts').insert({
        workspace_id: p.workspace_id,
        name: name,
        phone: formData.phone || null, // Null if empty for unique constraints
        email: formData.email || null, // Null if empty for unique constraints
        source: 'manual',
        wa_opt_in_status: formData.waOptIn ? 'subscribed' : 'none',
        custom_fields: customData
      })

      if (error) throw error

      onSuccess?.()
      onOpenChange(false)
      setFormData({ firstName: '', lastName: '', phone: '', email: '', waOptIn: true })
      setCustomData({})
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

        <div className="p-6 flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">First Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Jane"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Last Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Phone (Mobile Number)</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="+1234567890"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="jane@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {customFieldDefs.length > 0 && (
            <>
              <hr className="border-border my-2" />
              <h4 className="text-sm font-semibold text-white">Custom Fields</h4>
              {customFieldDefs.map(field => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {field.label} {field.is_required && <span className="text-red-400">*</span>}
                  </label>
                  <input 
                    type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                    className="form-input"
                    value={customData[field.key] || ''}
                    onChange={(e) => setCustomData({ ...customData, [field.key]: e.target.value })}
                  />
                </div>
              ))}
            </>
          )}

          <label className="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg cursor-pointer hover:bg-surface2 transition-colors mt-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-gray-600 bg-panel focus:ring-primary-500 focus:ring-offset-panel text-primary-500" 
              checked={formData.waOptIn}
              onChange={(e) => setFormData({ ...formData, waOptIn: e.target.checked })}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">WhatsApp Opt-in</span>
              <span className="text-xs text-text-muted">Contact has agreed to receive WhatsApp messages</span>
            </div>
          </label>
        </div>

        <ModalFooter className="px-6 py-4 border-t border-border bg-panel/50 flex justify-end gap-3 rounded-b-lg">
          <button 
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || (!formData.phone && !formData.email && !formData.firstName)}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_20px_rgba(14,165,233,0.5)] flex items-center gap-2"
          >
            {saving ? 'Creating...' : 'Create Contact'}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
