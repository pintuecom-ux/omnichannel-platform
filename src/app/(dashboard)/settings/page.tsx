'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Section = 'channels' | 'configuration' | 'team' | 'data' | 'account'
type SubPage = string

export default function SettingsPage() {
  const supabase = createClient()
  const [section, setSection] = useState<Section>('channels')
  const [subPage, setSubPage] = useState<SubPage>('channels-connected')
  const [profile, setProfile] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [channels, setChannels] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('agent')
  const [cannedResponses, setCannedResponses] = useState<any[]>([])
  const [newCanned, setNewCanned] = useState({ shortcut: '', message: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!p) return
    setProfile(p); setWorkspaceId(p.workspace_id); setEditName(p.full_name)
    const { data: w } = await supabase.from('workspaces').select('name').eq('id', p.workspace_id).single()
    if (w) setWorkspaceName(w.name)
    const { data: ch } = await supabase.from('channels').select('*').eq('workspace_id', p.workspace_id)
    if (ch) setChannels(ch)
    const { data: m } = await supabase.from('profiles').select('id, full_name, email, role, is_online').eq('workspace_id', p.workspace_id)
    if (m) setTeam(m)
  }

  async function saveProfile() {
    if (!profile) return; setSaving(true)
    await supabase.from('profiles').update({ full_name: editName }).eq('id', profile.id)
    setSaving(false); alert('Saved ✓')
  }

  function nav(s: Section, sub: SubPage) { setSection(s); setSubPage(sub) }

  const PCFG: Record<string, { icon: string; color: string; label: string }> = {
    whatsapp:  { icon: 'fa-brands fa-whatsapp',  color: '#25d366', label: 'WhatsApp Business API' },
    instagram: { icon: 'fa-brands fa-instagram', color: '#e1306c', label: 'Instagram DM' },
    facebook:  { icon: 'fa-brands fa-facebook',  color: '#1877f2', label: 'Facebook Page' },
  }

  const SIDEBAR: { id: Section; label: string; icon: string; desc: string; subs: { id: SubPage; label: string; icon: string }[] }[] = [
    {
      id: 'channels', label: 'Channels', icon: 'fa-solid fa-plug', desc: 'Connect and manage messaging channels',
      subs: [
        { id: 'channels-connected', label: 'Connected Channels', icon: 'fa-solid fa-circle-check' },
        { id: 'channels-whatsapp', label: 'WhatsApp Setup', icon: 'fa-brands fa-whatsapp' },
        { id: 'channels-webhook', label: 'Webhook & API', icon: 'fa-solid fa-webhook' },
      ],
    },
    {
      id: 'configuration', label: 'Configuration', icon: 'fa-solid fa-sliders', desc: 'Workflows, quick replies, business hours',
      subs: [
        { id: 'config-canned', label: 'Canned Responses', icon: 'fa-solid fa-comment-dots' },
        { id: 'config-profile', label: 'My Profile', icon: 'fa-solid fa-user' },
        { id: 'config-workspace', label: 'Workspace', icon: 'fa-solid fa-building' },
      ],
    },
    {
      id: 'team', label: 'Team Management', icon: 'fa-solid fa-users', desc: 'Manage agents, roles, and groups',
      subs: [
        { id: 'team-members', label: 'Users & Roles', icon: 'fa-solid fa-user-shield' },
        { id: 'team-invite', label: 'Invite Member', icon: 'fa-solid fa-user-plus' },
      ],
    },
    {
      id: 'data', label: 'Data & Security', icon: 'fa-solid fa-shield-halved', desc: 'Import, export, and manage security',
      subs: [
        { id: 'data-import', label: 'Import Contacts', icon: 'fa-solid fa-file-import' },
        { id: 'data-export', label: 'Export Data', icon: 'fa-solid fa-file-export' },
      ],
    },
    {
      id: 'account', label: 'Account & Billing', icon: 'fa-solid fa-credit-card', desc: 'Plans, billing, workspace settings',
      subs: [
        { id: 'account-info', label: 'Account Info', icon: 'fa-solid fa-circle-info' },
        { id: 'account-plan', label: 'Plans & Pricing', icon: 'fa-solid fa-gem' },
      ],
    },
  ]

  const activeSec = SIDEBAR.find(s => s.id === section)!

  return (
    <div className="generic-page" style={{ flexDirection: 'row', padding: 0, overflow: 'hidden' }}>
      {/* Left sidebar */}
      <div style={{ width: 240, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ padding: '16px 16px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          SETTINGS
        </div>
        {SIDEBAR.map(s => (
          <div key={s.id}>
            <div
              onClick={() => { nav(s.id, s.subs[0].id) }}
              style={{
                padding: '9px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                background: section === s.id ? 'var(--bg-active)' : 'none',
                borderLeft: section === s.id ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <i className={s.icon} style={{ color: section === s.id ? 'var(--accent)' : 'var(--text-muted)', marginTop: 1, fontSize: 14, width: 16 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: section === s.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.3 }}>{s.desc}</div>
              </div>
            </div>
            {section === s.id && s.subs.map(sub => (
              <div
                key={sub.id}
                onClick={() => setSubPage(sub.id)}
                style={{
                  padding: '7px 16px 7px 44px', cursor: 'pointer', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: subPage === sub.id ? 'var(--accent-glow)' : 'none',
                  color: subPage === sub.id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: subPage === sub.id ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <i className={sub.icon} style={{ fontSize: 11 }} />
                {sub.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", marginBottom: 4 }}>{activeSec.label}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{activeSec.desc}</div>
        </div>

        {/* ── CHANNELS: Connected ── */}
        {subPage === 'channels-connected' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
              {['whatsapp','instagram','facebook'].map(p => {
                const cfg = PCFG[p]
                const ch = channels.find(c => c.platform === p)
                return (
                  <div key={p} style={{ background: 'var(--bg-panel)', border: `1px solid ${ch?.is_active ? 'rgba(37,211,102,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
                    <i className={cfg.icon} style={{ fontSize: 28, color: cfg.color, display: 'block', marginBottom: 8 }} />
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{cfg.label}</div>
                    {ch?.is_active
                      ? <span className="pill green" style={{ fontSize: 10 }}>● Connected</span>
                      : <span className="pill amber" style={{ fontSize: 10 }}>Not Connected</span>}
                  </div>
                )
              })}
            </div>
            {channels.filter(c => c.is_active).map(ch => {
              const cfg = PCFG[ch.platform] ?? { icon: 'fa-solid fa-circle', color: '#888', label: ch.platform }
              return (
                <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <i className={cfg.icon} style={{ fontSize: 22, color: cfg.color, width: 28 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{ch.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phone ID: {ch.external_id}</div>
                    {ch.meta?.waba_id && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>WABA ID: {ch.meta.waba_id}</div>}
                  </div>
                  <span className="pill green">Active</span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── CHANNELS: WhatsApp Setup ── */}
        {subPage === 'channels-whatsapp' && (
          <div style={{ maxWidth: 600 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }} />WhatsApp Business API Setup
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
                Your WhatsApp channel is configured. To update the access token or add the WABA ID for template management, run these SQL commands in Supabase:
              </div>

              <div className="form-group">
                <div className="form-label">Update Access Token</div>
                <pre style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
{`UPDATE channels
SET access_token = 'YOUR_PERMANENT_TOKEN'
WHERE platform = 'whatsapp'
  AND workspace_id = '${workspaceId}';`}
                </pre>
              </div>

              <div className="form-group">
                <div className="form-label">Set WABA ID (for template management)</div>
                <pre style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
{`UPDATE channels
SET meta = jsonb_set(
  COALESCE(meta,'{}'),
  '{waba_id}',
  '"YOUR_WABA_ID_HERE"'
)
WHERE platform = 'whatsapp'
  AND workspace_id = '${workspaceId}';`}
                </pre>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Find your WABA ID in Meta Business Manager → Business Settings → WhatsApp Accounts
                </div>
              </div>

              <div className="form-group">
                <div className="form-label">Also add to Vercel Environment Variables</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  <code style={{ color: 'var(--accent3)' }}>WHATSAPP_WABA_ID</code> = Your WABA ID<br/>
                  <code style={{ color: 'var(--accent3)' }}>WHATSAPP_TOKEN</code> = Your permanent system user token
                </div>
              </div>

              <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 10, padding: 14, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
                  <i className="fa-solid fa-info-circle" style={{ marginRight: 6 }} />How to get a permanent token
                </div>
                1. Go to <strong>business.facebook.com</strong><br/>
                2. Settings → Users → System Users<br/>
                3. Add System User (role: Admin)<br/>
                4. Click "Generate New Token" → select your App<br/>
                5. Permissions: <code>whatsapp_business_messaging</code> + <code>whatsapp_business_management</code><br/>
                6. This token never expires ✓
              </div>
            </div>
          </div>
        )}

        {/* ── CHANNELS: Webhook ── */}
        {subPage === 'channels-webhook' && (
          <div style={{ maxWidth: 580 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
                <i className="fa-solid fa-webhook" style={{ color: 'var(--accent)', marginRight: 8 }} />Webhook Configuration
              </div>
              <div className="form-group">
                <div className="form-label">WhatsApp Webhook URL</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{ flex: 1, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, fontSize: 12, border: '1px solid var(--border)', wordBreak: 'break-all', display: 'block' }}>
                    {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/webhooks/whatsapp
                  </code>
                  <button className="btn btn-secondary" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/whatsapp`); alert('Copied!') }}>
                    <i className="fa-solid fa-copy" />
                  </button>
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">Verify Token</div>
                <code style={{ fontSize: 12, color: 'var(--accent3)', background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}>omnichannel_verify_2024</code>
              </div>
              <div className="form-group">
                <div className="form-label">Subscribed Fields</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['messages','message_deliveries','message_reads','message_reactions'].map(f => (
                    <span key={f} className="pill green" style={{ fontSize: 11 }}>{f}</span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">Instagram Webhook URL</div>
                <code style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', display: 'block', wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/instagram
                </code>
              </div>
              <div className="form-group">
                <div className="form-label">Facebook Webhook URL</div>
                <code style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', display: 'block', wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/facebook
                </code>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIG: Canned Responses ── */}
        {subPage === 'config-canned' && (
          <div style={{ maxWidth: 680 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                <i className="fa-solid fa-comment-dots" style={{ color: 'var(--accent)', marginRight: 8 }} />Canned Responses
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Shortcuts for common messages. Type / in the message box to search them (coming soon).
              </div>
              <div className="form-row">
                <div>
                  <div className="form-label">Shortcut</div>
                  <input className="form-input" placeholder="/order_conf" value={newCanned.shortcut} onChange={e => setNewCanned(p => ({ ...p, shortcut: e.target.value }))} />
                </div>
                <div>
                  <div className="form-label">Message</div>
                  <input className="form-input" placeholder="Your order is confirmed ✓" value={newCanned.message} onChange={e => setNewCanned(p => ({ ...p, message: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => {
                if (!newCanned.shortcut || !newCanned.message) return
                setCannedResponses(prev => [...prev, { id: Date.now(), ...newCanned }])
                setNewCanned({ shortcut: '', message: '' })
              }}>
                <i className="fa-solid fa-plus" /> Add Response
              </button>

              {[...cannedResponses, ...['Sending details now', 'Order is confirmed ✓', "We'll follow up shortly", 'Please share your order ID', 'Thank you for your purchase!'].map((m, i) => ({ id: `default-${i}`, shortcut: `/quick${i + 1}`, message: m }))].map(cr => (
                <div key={cr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6 }}>
                  <code style={{ fontSize: 11, color: 'var(--accent3)', flexShrink: 0 }}>{cr.shortcut}</code>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{cr.message}</span>
                  <button className="icon-btn" onClick={() => setCannedResponses(prev => prev.filter(r => r.id !== cr.id))}>
                    <i className="fa-solid fa-trash" style={{ fontSize: 11, color: '#e84040' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONFIG: Profile ── */}
        {subPage === 'config-profile' && (
          <div style={{ maxWidth: 440 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
                <i className="fa-solid fa-user" style={{ color: 'var(--accent)', marginRight: 8 }} />My Profile
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: 14, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                  {profile?.full_name?.slice(0, 2).toUpperCase() ?? '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{profile?.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{profile?.email}</div>
                  <span className={`pill ${profile?.role === 'admin' ? 'green' : profile?.role === 'manager' ? 'amber' : 'blue'}`} style={{ fontSize: 10, marginTop: 4, display: 'inline-flex', textTransform: 'capitalize' }}>{profile?.role}</span>
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">Full Name</div>
                <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="form-group">
                <div className="form-label">Email</div>
                <input className="form-input" value={profile?.email ?? ''} disabled style={{ opacity: 0.6 }} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Change in Supabase Auth settings</div>
              </div>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</button>
            </div>
          </div>
        )}

        {/* ── CONFIG: Workspace ── */}
        {subPage === 'config-workspace' && (
          <div style={{ maxWidth: 480 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
                <i className="fa-solid fa-building" style={{ color: 'var(--accent)', marginRight: 8 }} />Workspace Settings
              </div>
              <div className="form-group"><div className="form-label">Workspace Name</div><input className="form-input" value={workspaceName} disabled style={{ opacity: 0.6 }} /></div>
              <div className="form-group"><div className="form-label">Workspace ID</div><input className="form-input" value={workspaceId} disabled style={{ opacity: 0.6, fontSize: 11 }} /></div>
            </div>
          </div>
        )}

        {/* ── TEAM: Members ── */}
        {subPage === 'team-members' && (
          <div style={{ maxWidth: 720 }}>
            <div className="data-table">
              <div className="table-header"><span className="table-title">Team Members</span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{team.length} members</span></div>
              <table className="tbl">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>
                  {team.map(m => (
                    <tr key={m.id}>
                      <td className="primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                          {m.full_name?.slice(0, 2).toUpperCase()}
                        </div>
                        {m.full_name}{m.id === profile?.id && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>(you)</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>{m.email}</td>
                      <td>
                        {m.id === profile?.id || profile?.role !== 'admin' ? (
                          <span className={`pill ${m.role === 'admin' ? 'green' : m.role === 'manager' ? 'amber' : 'blue'}`} style={{ textTransform: 'capitalize' }}>{m.role}</span>
                        ) : (
                          <select value={m.role} onChange={async e => {
                            await supabase.from('profiles').update({ role: e.target.value }).eq('id', m.id)
                            setTeam(prev => prev.map(x => x.id === m.id ? { ...x, role: e.target.value } : x))
                          }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 8px', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' }}>
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
          </div>
        )}

        {/* ── TEAM: Invite ── */}
        {subPage === 'team-invite' && (
          <div style={{ maxWidth: 560 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                <i className="fa-solid fa-user-plus" style={{ color: 'var(--accent)', marginRight: 8 }} />Invite Team Member
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.8 }}>
                New members must sign up at your app URL first. Then run the SQL below to assign them to this workspace.
              </div>
              <div className="form-row">
                <div>
                  <div className="form-label">Email Address</div>
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
                  <div className="form-label">Run this SQL after they sign up:</div>
                  <pre style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, lineHeight: 1.7, overflowX: 'auto', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
{`UPDATE profiles
SET workspace_id = '${workspaceId}',
    role = '${inviteRole}'
WHERE email = '${inviteEmail}';`}
                  </pre>
                  <button className="btn btn-secondary" style={{ marginTop: 6, fontSize: 12 }} onClick={() => { navigator.clipboard.writeText(`UPDATE profiles SET workspace_id = '${workspaceId}', role = '${inviteRole}' WHERE email = '${inviteEmail}';`); alert('Copied!') }}>
                    <i className="fa-solid fa-copy" /> Copy SQL
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DATA: Import ── */}
        {subPage === 'data-import' && (
          <div style={{ maxWidth: 560 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
                <i className="fa-solid fa-file-import" style={{ color: 'var(--accent)', marginRight: 8 }} />Import Contacts
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.8 }}>
                Import contacts from a CSV file. Required columns: <code>name</code>, <code>phone</code>.<br/>
                Optional: <code>email</code>, <code>instagram</code>, <code>facebook</code>, <code>tags</code> (semicolon-separated)
              </div>
              <a href="/contacts" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                <i className="fa-solid fa-users" /> Go to Contacts → Import CSV
              </a>
            </div>
          </div>
        )}

        {/* ── DATA: Export ── */}
        {subPage === 'data-export' && (
          <div style={{ maxWidth: 560 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
                <i className="fa-solid fa-file-export" style={{ color: 'var(--accent)', marginRight: 8 }} />Export Data
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>Export your data from Supabase directly:</div>
              {[
                { label: 'Export Contacts', table: 'contacts', icon: 'fa-solid fa-users' },
                { label: 'Export Conversations', table: 'conversations', icon: 'fa-solid fa-comments' },
                { label: 'Export Messages', table: 'messages', icon: 'fa-solid fa-message' },
              ].map(e => (
                <div key={e.table} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
                  <i className={e.icon} style={{ color: 'var(--accent)', width: 20 }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{e.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Supabase → Table Editor → {e.table} → Export</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACCOUNT ── */}
        {subPage === 'account-info' && (
          <div style={{ maxWidth: 480 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}><i className="fa-solid fa-circle-info" style={{ color: 'var(--accent)', marginRight: 8 }} />Account Info</div>
              <div className="form-group"><div className="form-label">Workspace Name</div><input className="form-input" value={workspaceName} disabled style={{ opacity: 0.6 }} /></div>
              <div className="form-group"><div className="form-label">Workspace ID</div><input className="form-input" value={workspaceId} disabled style={{ opacity: 0.6, fontSize: 11 }} /></div>
              <div className="form-group"><div className="form-label">Plan</div><span className="pill green">Free — Unlimited (self-hosted)</span></div>
            </div>
          </div>
        )}

        {subPage === 'account-plan' && (
          <div style={{ maxWidth: 600 }}>
            <div className="form-section">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}><i className="fa-solid fa-gem" style={{ color: 'var(--accent)', marginRight: 8 }} />Plans & Pricing</div>
              <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-active)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <i className="fa-solid fa-server" style={{ fontSize: 32, color: 'var(--accent)', display: 'block', marginBottom: 10 }} />
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Self-Hosted</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  You're running React Commerce on your own infrastructure.<br/>
                  WhatsApp Cloud API: <strong style={{ color: 'var(--accent)' }}>Free up to 1,000 conversations/month</strong><br/>
                  Supabase: <strong style={{ color: 'var(--accent)' }}>Free tier: 500MB storage</strong><br/>
                  Vercel: <strong style={{ color: 'var(--accent)' }}>Free hobby plan</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
