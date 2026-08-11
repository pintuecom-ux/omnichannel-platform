'use client'
import React, { useState, useEffect } from 'react'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, X, Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

interface CreateContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateContactModal({ open, onOpenChange, onSuccess }: CreateContactModalProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [fieldDefs, setFieldDefs] = useState<any[]>([])
  const [showAllFields, setShowAllFields] = useState(false)
  const [fieldData, setFieldData] = useState<Record<string, any>>({})

  useEffect(() => {
    if (open) {
      loadFields()
    }
  }, [open])

  async function loadFields() {
    // Fetch ALL definitions (both system and custom)
    const { data } = await supabase.from('custom_field_definitions').select('*').eq('entity_type', 'contact').order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setFieldDefs(data)
      
      // Initialize defaults
      const initData: Record<string, any> = {}
      data.forEach(f => {
        if (f.field_type === 'boolean') {
          initData[f.key] = false
        } else {
          initData[f.key] = ''
        }
      })
      // Specific default for WA Opt-in
      if ('wa_opt_in_status' in initData) initData['wa_opt_in_status'] = true
      
      setFieldData(initData)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const { data: p } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
      if (!p) throw new Error('No workspace found')

      const sysFields = fieldDefs.filter(f => f.is_system).map(f => f.key)
      const contactRow: any = {
        workspace_id: p.workspace_id,
        source: 'manual',
        custom_fields: {}
      }
      
      for (const [k, v] of Object.entries(fieldData)) {
        if (sysFields.includes(k)) {
          contactRow[k] = v
        } else {
          contactRow.custom_fields[k] = v
        }
      }

      contactRow.name = [contactRow.first_name, contactRow.last_name].filter(Boolean).join(' ') || 'Unknown Contact'
      
      if (contactRow.wa_opt_in_status === true) {
         contactRow.wa_opt_in_status = 'subscribed'
      } else if (contactRow.wa_opt_in_status === false) {
         contactRow.wa_opt_in_status = 'none'
      }

      if (!contactRow.phone) contactRow.phone = null
      if (!contactRow.email) contactRow.email = null

      const { error } = await supabase.from('contacts').insert(contactRow)

      if (error) throw error

      onSuccess?.()
      onOpenChange(false)
      setFieldData({})
    } catch (err: any) {
      alert(err.message || 'Failed to create contact')
    } finally {
      setSaving(false)
    }
  }

  // Determine which fields to show
  const visibleFields = fieldDefs.filter(f => showAllFields || f.is_quick_add)

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
          <div className="flex items-center gap-2">
            <Link 
              href="/contacts/form-settings"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary-400 bg-primary-500/10 rounded-md hover:bg-primary-500/20 transition-colors mr-2"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Manage Fields
            </Link>
            <button 
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </ModalHeader>

        <div className="p-6 flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
          {fieldDefs.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-8">
              Loading form configuration...
            </div>
          ) : (
            <>
              {visibleFields.filter(f => f.field_type !== 'boolean').map(field => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {field.label} {field.is_required && <span className="text-red-400">*</span>}
                  </label>
                  <input 
                    type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : field.key === 'phone' ? 'tel' : field.key === 'email' ? 'email' : 'text'}
                    className="form-input"
                    value={fieldData[field.key] || ''}
                    onChange={(e) => setFieldData({ ...fieldData, [field.key]: e.target.value })}
                  />
                </div>
              ))}

              {visibleFields.filter(f => f.field_type === 'boolean').map(field => (
                <label key={field.key} className="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg cursor-pointer hover:bg-surface2 transition-colors mt-2">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-600 bg-panel focus:ring-primary-500 focus:ring-offset-panel text-primary-500" 
                    checked={!!fieldData[field.key]}
                    onChange={(e) => setFieldData({ ...fieldData, [field.key]: e.target.checked })}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{field.label}</span>
                  </div>
                </label>
              ))}

              <div className="flex justify-center mt-2 mb-2">
                <button 
                  onClick={() => setShowAllFields(!showAllFields)}
                  className="text-xs font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/5 hover:bg-primary-500/10 rounded-full transition-colors"
                >
                  {showAllFields ? (
                    <><ChevronUp className="w-3.5 h-3.5" /> Show Quick Add only</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" /> Show all fields</>
                  )}
                </button>
              </div>
            </>
          )}
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
            disabled={saving || (!fieldData.phone && !fieldData.email && !fieldData.first_name)}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_20px_rgba(14,165,233,0.5)] flex items-center gap-2"
          >
            {saving ? 'Creating...' : 'Create Contact'}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
