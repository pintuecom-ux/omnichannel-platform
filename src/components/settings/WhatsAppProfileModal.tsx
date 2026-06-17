'use client'

import { useState, useEffect } from 'react'

interface WhatsAppProfile {
  about?: string
  address?: string
  description?: string
  email?: string
  profile_picture_url?: string
  websites?: string[]
  vertical?: string
  messaging_product?: string
}

const VERTICALS = [
  "OTHER", "AUTO", "BEAUTY", "APPAREL", "EDU", "ENTERTAIN", "EVENT_PLAN", 
  "FINANCE", "GROCERY", "GOVT", "HOTEL", "HEALTH", "NONPROFIT", "PROF_SERVICES", 
  "RETAIL", "TRAVEL", "RESTAURANT", "ALCOHOL", "ONLINE_GAMBLING", 
  "PHYSICAL_GAMBLING", "OTC_DRUGS"
]

export default function WhatsAppProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [profile, setProfile] = useState<WhatsAppProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [about, setAbout] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [websites, setWebsites] = useState('')
  const [vertical, setVertical] = useState('OTHER')

  useEffect(() => {
    if (!isOpen) return
    let mounted = true
    const fetchProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/whatsapp/profile')
        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else if (data.profile) {
          const p = data.profile as WhatsAppProfile
          if (mounted) {
            setProfile(p)
            setAbout(p.about || '')
            setAddress(p.address || '')
            setDescription(p.description || '')
            setEmail(p.email || '')
            setWebsites((p.websites || []).join(', '))
            setVertical(p.vertical || 'OTHER')
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch profile')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchProfile()
    return () => { mounted = false }
  }, [isOpen])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload: WhatsAppProfile = {
        about,
        address,
        description,
        email,
        vertical,
        websites: websites.split(',').map(w => w.trim()).filter(Boolean)
      }
      const res = await fetch('/api/whatsapp/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      
      <div style={{ position: 'relative', width: 500, maxHeight: '90vh', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>WhatsApp Business Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-spinner fa-spin fa-2x" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Profile Picture */}
              {profile?.profile_picture_url && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <img src={profile.profile_picture_url} alt="Profile" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>About</label>
                <input className="form-input" value={about} onChange={e => setAbout(e.target.value)} placeholder="Available" />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Description</label>
                <textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Business Description" rows={3} style={{ resize: 'vertical' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Address</label>
                <input className="form-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Business Rd" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Email</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@example.com" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Websites (comma separated)</label>
                <input className="form-input" value={websites} onChange={e => setWebsites(e.target.value)} placeholder="https://example.com" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Vertical / Industry</label>
                <select className="form-input" value={vertical} onChange={e => setVertical(e.target.value)} style={{ width: '100%' }}>
                  {VERTICALS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--bg-surface)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || saving}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
