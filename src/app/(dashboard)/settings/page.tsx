'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Channel { id: string; platform: string; name: string; external_id: string; is_active: boolean }
interface TeamMember { id: string; full_name: string; email: string; role: string; is_online: boolean }

export default function SettingsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'channels' | 'profile' | 'team' | 'workspace'>('channels')
  const [channels, setChannels] = useState<Channel[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [team, setTeam] = useState<TeamMember[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('agent')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!p) return
    setProfile(p); setWorkspaceId(p.workspace_id); setEditName(p.full_name)
    const { data: w } = await supabase.from('workspaces').select('name').eq('id', p.workspace_id).single()
    if (w) setWorkspaceName(w.name)
    const { data: ch } = await supabase.from('channels').select('id, platform, name, external_id, is_active').eq('workspace_id', p.workspace_id)
    if (ch) setChannels(ch)
    const { data: members } = await supabase.from('profiles').select('id, full_name, email, role, is_online').eq('workspace_id', p.workspace_id)
    if (members) setTeam(members)
  }

  async function saveProfile() {
    if (!profile) return; setSaving(true)
    await supabase.from('profiles').update({ full_name: editName }).eq('id', profile.id)
    setSaving(false); alert('Saved ✓')
  }

  async function changeRole(id: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setTeam(prev => prev.map(m => m.id === id ? { ...m, role } : m))
  }

  const PCFG: Record<string, { icon: string; color: string; label: string }> = {
    whatsapp:  { icon: 'fa-brands fa-whatsapp',  color: '#25d366', label: 'WhatsApp Business' },
    instagram: { icon: 'fa-brands fa-instagram', color: '#e1306c', label: 'Instagram' },
    facebook:  { icon: 'fa-brands fa-facebook',  color: '#1877f2', label: 'Facebook Page' },
  }

  return (
    <div className="generic-page">
      <div className="page-header">
        <span className="page-title"><i className="fa-solid fa-gear" style={{ color: 'var(--accent)', marginRight: 8 }} />Settings</span>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', background: 'var(--bg-panel)', flexShrink: 0 }}>
        {(['channels','team','profile','workspace'] as const).map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: tab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, marginBottom: -1 }}>
            {t === 'channels' && <><i className="fa-solid fa-plug" style={{ marginRight: 5 }} />Channels</>}
            {t === 'team'     && <><i className="fa-solid fa-users" style={{ marginRight: 5 }} />Team</>}
            {t === 'profile'  && <><i className="fa-solid fa-user" style={{ marginRight: 5 }} />Profile</>}
            {t === 'workspace' && <><i className="fa-solid fa-building" style={{ marginRight: 5 }} />Workspace</>}
          </div>
        ))}
      </div>

      <div className="page-body">
        {tab === 'channels' && (
          <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {channels.filter(c => c.is_active).map(ch => {
              const cfg = PCFG[ch.platform] ?? { icon: 'fa-solid fa-circle', color: '#888', label: ch.platform }
              return (
                <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <i className={cfg.icon} style={{ fontSize: 22, color: cfg.color, width: 28 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{cfg.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {ch.external_id}</div>
                  </div>
                  <span className="pill green">Active</span>
                </div>
              )
            })}
            {channels.filter(c => c.is_active).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active channels.</div>}
            <div className="form-section" style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}><i className="fa-solid fa-webhook" style={{ color: 'var(--accent)', marginRight: 6 }} />Webhook URL</div>
              <code style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6, display: 'block', wordBreak: 'break-all' }}>
                {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/webhooks/whatsapp
              </code>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Verify token: <code>omnichannel_verify_2024</code></div>
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div style={{ maxWidth: 720 }}>
            <div className="data-table" style={{ marginBottom: 20 }}>
              <div className="table-header"><span className="table-title">Team Members</span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{team.length} members</span></div>
              <table className="tbl">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>
                  {team.map(m => (
                    <tr key={m.id}>
                      <td className="primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                          {m.full_name?.slice(0, 2).toUpperCase()}
                        </div>
                        {m.full_name}{m.id === profile?.id && <span style={{ fontSize: 10, color: 'var(--accent)' }}>(you)</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>{m.email}</td>
                      <td>
                        {m.id === profile?.id || profile?.role !== 'admin' ? (
                          <span className={`pill ${m.role === 'admin' ? 'green' : m.role === 'manager' ? 'amber' : 'blue'}`} style={{ textTransform: 'capitalize' }}>{m.role}</span>
                        ) : (
                          <select value={m.role} onChange={e => changeRole(m.id, e.target.value)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 8px', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' }}>
                            <option value="agent">Agent</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td><span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: m.is_online ? 'var(--accent)' : 'var(--text-muted)' }} />{m.is_online ? 'Online' : 'Offline'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {profile?.role === 'admin' && (
              <div className="form-section">
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}><i className="fa-solid fa-user-plus" style={{ color: 'var(--accent)', marginRight: 6 }} />Add Team Member</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.7 }}>
                  New member must first sign up at your app. Then run the SQL below to add them to your workspace.
                </div>
                <div className="form-row">
                  <div>
                    <div className="form-label">Email</div>
                    <input className="form-input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
                  </div>
                  <div>
                    <div className="form-label">Role</div>
                    <select className="form-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                      <option value="agent">Agent</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                {inviteEmail && (
                  <div>
                    <div className="form-label">Run in Supabase SQL Editor:</div>
                    <pre style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, lineHeight: 1.7, overflowX: 'auto', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
{`UPDATE profiles
SET workspace_id = '${workspaceId}',
    role = '${inviteRole}'
WHERE email = '${inviteEmail}';`}
                    </pre>
                    <button className="btn btn-secondary" style={{ marginTop: 6, fontSize: 12 }}
                      onClick={() => { navigator.clipboard.writeText(`UPDATE profiles SET workspace_id = '${workspaceId}', role = '${inviteRole}' WHERE email = '${inviteEmail}';`); alert('Copied!') }}>
                      <i className="fa-solid fa-copy" /> Copy SQL
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div style={{ maxWidth: 440 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}><i className="fa-solid fa-user" style={{ color: 'var(--accent)', marginRight: 6 }} />Your Profile</div>
              <div className="form-group"><div className="form-label">Full Name</div><input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div className="form-group"><div className="form-label">Email</div><input className="form-input" value={profile?.email ?? ''} disabled style={{ opacity: 0.6 }} /></div>
              <div className="form-group"><div className="form-label">Role</div><input className="form-input" value={profile?.role ?? ''} disabled style={{ opacity: 0.6 }} /></div>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}

        {tab === 'workspace' && (
          <div style={{ maxWidth: 480 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}><i className="fa-solid fa-building" style={{ color: 'var(--accent)', marginRight: 6 }} />Workspace</div>
              <div className="form-group"><div className="form-label">Name</div><input className="form-input" value={workspaceName} disabled style={{ opacity: 0.6 }} /></div>
              <div className="form-group"><div className="form-label">ID</div><input className="form-input" value={workspaceId} disabled style={{ opacity: 0.6, fontSize: 11 }} /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
