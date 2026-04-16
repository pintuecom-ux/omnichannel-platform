'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Channel {
  id: string
  platform: string
  name: string
  external_id: string
  is_active: boolean
  access_token: string
}

interface ProfileData {
  id: string
  full_name: string
  email: string
  role: string
  workspace_id: string
}

export default function SettingsPage() {
  const supabase = createClient()
  const [channels, setChannels] = useState<Channel[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editProfile, setEditProfile] = useState({ full_name: '', email: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!p) return
    setProfile(p)
    setEditProfile({ full_name: p.full_name, email: p.email })

    const { data: w } = await supabase.from('workspaces').select('name').eq('id', p.workspace_id).single()
    if (w) setWorkspaceName(w.name)

    const { data: ch } = await supabase.from('channels').select('id, platform, name, external_id, is_active, access_token').eq('workspace_id', p.workspace_id)
    if (ch) setChannels(ch)
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: editProfile.full_name,
    }).eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, full_name: editProfile.full_name } : null)
    setSaving(false)
    alert('Profile saved ✓')
  }

  const PLATFORM_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    whatsapp:  { icon: 'fa-brands fa-whatsapp',  color: '#25d366', label: 'WhatsApp Business' },
    instagram: { icon: 'fa-brands fa-instagram', color: '#e1306c', label: 'Instagram' },
    facebook:  { icon: 'fa-brands fa-facebook',  color: '#1877f2', label: 'Facebook Page' },
  }

  const CONNECTED = channels.filter(c => c.is_active)
  const SOON = [
    { platform: 'twitter',  icon: 'fa-brands fa-x-twitter', color: '#000', label: 'X (Twitter)' },
    { platform: 'linkedin', icon: 'fa-brands fa-linkedin',   color: '#0A66C2', label: 'LinkedIn' },
    { platform: 'email',    icon: 'fa-solid fa-envelope',    color: '#f59e0b', label: 'Email' },
    { platform: 'sms',      icon: 'fa-solid fa-comment-sms', color: '#534AB7', label: 'SMS' },
  ]

  return (
    <div className="generic-page">
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-gear" style={{ color: 'var(--accent)', marginRight: 8 }} />
          Settings
        </span>
      </div>

      <div className="page-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Connected channels */}
        <div className="form-section" style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-plug" style={{ color: 'var(--accent)' }} />
            Connected Channels
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONNECTED.map(ch => {
              const cfg = PLATFORM_CONFIG[ch.platform] ?? { icon: 'fa-solid fa-circle', color: '#888', label: ch.platform }
              return (
                <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <i className={cfg.icon} style={{ fontSize: 20, color: cfg.color, width: 24 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{cfg.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {ch.external_id}</div>
                  </div>
                  <span className="pill green">Active</span>
                </div>
              )
            })}

            {CONNECTED.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
                No channels connected. See the setup guide to add WhatsApp.
              </div>
            )}

            {/* Soon */}
            {SOON.map(s => (
              <div key={s.platform} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, opacity: 0.5 }}>
                <i className={s.icon} style={{ fontSize: 20, color: s.color, width: 24 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not connected</div>
                </div>
                <span className="pill amber">Coming Soon</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile */}
        <div className="form-section">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-user" style={{ color: 'var(--accent)' }} />
            Your Profile
          </div>
          <div className="form-group">
            <div className="form-label">Full Name</div>
            <input
              className="form-input"
              value={editProfile.full_name}
              onChange={e => setEditProfile(p => ({ ...p, full_name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <div className="form-label">Email</div>
            <input className="form-input" value={editProfile.email} disabled style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed here</div>
          </div>
          <div className="form-group">
            <div className="form-label">Role</div>
            <input className="form-input" value={profile?.role ?? ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>

        {/* Workspace */}
        <div className="form-section">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-building" style={{ color: 'var(--accent)' }} />
            Workspace
          </div>
          <div className="form-group">
            <div className="form-label">Workspace Name</div>
            <input className="form-input" value={workspaceName} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="form-group">
            <div className="form-label">Workspace ID</div>
            <input className="form-input" value={profile?.workspace_id ?? ''} disabled style={{ opacity: 0.6, fontSize: 11 }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.7 }}>
            WhatsApp Webhook URL:
            <br />
            <code style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4, display: 'block', marginTop: 4, wordBreak: 'break-all' }}>
              {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/webhooks/whatsapp
            </code>
          </div>
        </div>

      </div>
    </div>
  )
}
