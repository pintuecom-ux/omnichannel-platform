'use client'
import { useState, useEffect } from 'react'
import SettingsShell from '@/components/settings/SettingsShell'
import { createClient } from '@/lib/supabase/client'

type FieldGroup = {
  id: string
  name: string
  order_index: number
  parent_group_id: string | null
}

export default function FieldGroupsPage() {
  const supabase = createClient()
  const [groups, setGroups] = useState<FieldGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [newGroupName, setNewGroupName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    setLoading(true)
    const { data, error } = await supabase
      .from('field_groups')
      .select('*')
      .order('order_index', { ascending: true })
    
    if (data) setGroups(data)
    setLoading(false)
  }

  async function handleAddGroup() {
    if (!newGroupName.trim()) return
    setSaving(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', session.user.id)
      .single()

    if (!profile) return

    const { error } = await supabase
      .from('field_groups')
      .insert({
        workspace_id: profile.workspace_id,
        name: newGroupName,
        order_index: groups.length
      })

    if (!error) {
      setNewGroupName('')
      loadGroups()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this group?')) return
    await supabase.from('field_groups').delete().eq('id', id)
    loadGroups()
  }

  return (
    <SettingsShell>
      <div style={{ maxWidth: 640 }}>
        
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add New Group</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              type="text" 
              className="form-input" 
              value={newGroupName} 
              onChange={e => setNewGroupName(e.target.value)} 
              placeholder="e.g. Marketing Information" 
              style={{ flex: 1 }} 
            />
            <button className="btn btn-primary" onClick={handleAddGroup} disabled={saving || !newGroupName.trim()}>
              {saving ? 'Adding...' : 'Add Group'}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Existing Groups</div>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-panel)', borderRadius: 12, border: '1px dashed var(--border)' }}>
            No groups created yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groups.map(group => (
              <div key={group.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <i className="fa-solid fa-grip-vertical" style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{group.name}</span>
                </div>
                <button className="btn btn-secondary" style={{ color: '#e84040', borderColor: 'transparent' }} onClick={() => handleDelete(group.id)}>
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsShell>
  )
}
