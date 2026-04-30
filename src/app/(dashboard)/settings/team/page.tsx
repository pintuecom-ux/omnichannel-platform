'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SettingsShell from '@/components/settings/SettingsShell'
import { createClient } from '@/lib/supabase/client'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 36, height: 20, borderRadius: 10, background: value ? 'var(--accent)' : 'var(--bg-surface2)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: value ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function Breadcrumb({ leaf }: { leaf: string }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => router.push('/settings/admin')}>Admin Settings</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Team Management</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ color: 'var(--text-primary)' }}>{leaf}</span>
    </div>
  )
}

const AVATAR_COLORS = ['#2fe774','#00a8e8','#f59e0b','#e84393','#8b5cf6','#10b981']

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color = AVATAR_COLORS[initials.charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#000', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [team, setTeam] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'deactivated'>('all')
  const [search, setSearch] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('agent')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: p }) => {
        setProfile(p)
        supabase.from('profiles').select('*').eq('workspace_id', p.workspace_id).then(({ data: m }) => { if (m) setTeam(m) })
      })
    })
  }, [])

  const filtered = team.filter(m => {
    const matchSearch = !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  return (
    <div>
      <Breadcrumb leaf="Users" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Users</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Manage all your users — add, remove, and assign roles</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ fontSize: 12 }}><i className="fa-solid fa-file-import" /> Import</button>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}><i className="fa-solid fa-user-plus" /> Add user</button>
        </div>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="form-section" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Invite New User</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Email</div>
              <input className="form-input" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Role</div>
              <select className="form-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => setShowInvite(false)}>Send Invite</button>
              <button className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {(['all', 'active', 'deactivated'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: filter === f ? 'var(--bg-panel)' : 'transparent', color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s', textTransform: 'capitalize' }}>
              {f === 'all' ? `All (${team.length})` : f === 'active' ? `Active (${team.filter(m => m.is_online).length})` : 'Deactivated'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '0 12px', height: 36, flex: 1, maxWidth: 280 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)', fontSize: 12 }} />
          <input placeholder="Search users" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }} />
        </div>
      </div>

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Last Login</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td></tr>
            ) : filtered.map(m => (
              <tr key={m.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={m.full_name} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.full_name}{m.id === profile?.id && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 6 }}>(you)</span>}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12 }}>{m.email}</td>
                <td>
                  <select
                    value={m.role ?? 'agent'}
                    disabled={m.id === profile?.id || profile?.role !== 'admin'}
                    onChange={async e => {
                      await supabase.from('profiles').update({ role: e.target.value }).eq('id', m.id)
                      setTeam(prev => prev.map(x => x.id === m.id ? { ...x, role: e.target.value } : x))
                    }}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 8px', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <option value="agent">Agent</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>Recently</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.is_online ? 'var(--accent)' : 'var(--text-muted)' }} />
                    {m.is_online ? 'Online' : 'Offline'}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" title="More options"><i className="fa-solid fa-ellipsis-vertical" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────
const DEFAULT_ROLES = [
  { id: 1, name: 'Account Admin', desc: 'Full access to all settings and features', users: 1, isDefault: true },
  { id: 2, name: 'Agent', desc: 'Standard access to conversations, contacts, and reports', users: 3, isDefault: true },
  { id: 3, name: 'Manager', desc: 'Access to reports, team management, and conversations', users: 1, isDefault: false },
]

const PERMISSIONS_GROUPS = [
  { group: 'Conversations', perms: ['View all conversations', 'Assign conversations', 'Delete conversations', 'Export conversations'] },
  { group: 'Contacts', perms: ['View contacts', 'Edit contacts', 'Delete contacts', 'Export contacts', 'Import contacts'] },
  { group: 'Reports', perms: ['View reports', 'Export report data'] },
  { group: 'Settings', perms: ['Access Admin Settings', 'Manage users', 'Manage roles', 'Manage channels', 'Manage billing'] },
]

function RolesTab() {
  const [roles, setRoles] = useState(DEFAULT_ROLES)
  const [editingRole, setEditingRole] = useState<typeof DEFAULT_ROLES[0] | null>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    'View all conversations': true, 'Assign conversations': true, 'View contacts': true, 'Edit contacts': true, 'View reports': true,
    'Access Admin Settings': false, 'Manage users': false, 'Manage roles': false,
  })

  if (editingRole) return (
    <div style={{ maxWidth: 680 }}>
      <button onClick={() => setEditingRole(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 16, fontFamily: 'DM Sans, sans-serif' }}>
        <i className="fa-solid fa-arrow-left" /> Back to Roles
      </button>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>{editingRole.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>{editingRole.desc}</div>
      {PERMISSIONS_GROUPS.map(pg => (
        <div key={pg.group} className="form-section" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{pg.group}</div>
          {pg.perms.map(perm => (
            <div key={perm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{perm}</span>
              <Toggle value={permissions[perm] ?? false} onChange={v => setPermissions(p => ({ ...p, [perm]: v }))} />
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={() => setEditingRole(null)}>Save Role</button>
        <button className="btn btn-secondary" onClick={() => setEditingRole(null)}>Cancel</button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 680 }}>
      <Breadcrumb leaf="Roles" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Roles</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Define permission sets that control what agents and admins can access</div>
        </div>
        <button className="btn btn-primary"><i className="fa-solid fa-plus" /> Add role</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {roles.map(role => (
          <div key={role.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-user-shield" style={{ color: 'var(--accent)', fontSize: 16 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                {role.name}
                {role.isDefault && <span className="pill blue" style={{ fontSize: 10 }}>Default</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{role.desc}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{role.users}</div>
              <div>users</div>
            </div>
            <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => setEditingRole(role)}><i className="fa-solid fa-pencil" /> Edit</button>
            {!role.isDefault && <button className="icon-btn"><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Groups Tab ────────────────────────────────────────────────────────────────
function GroupsTab() {
  const [groups, setGroups] = useState([
    { id: 1, name: 'Sales Team', desc: 'Handles all inbound sales inquiries', members: 4, channels: ['WhatsApp', 'Web Chat'] },
    { id: 2, name: 'Support Team', desc: 'General customer support queries', members: 6, channels: ['WhatsApp', 'Instagram', 'Facebook'] },
    { id: 3, name: 'Billing Support', desc: 'Payment and subscription issues', members: 2, channels: ['Support Email'] },
  ])
  const [showForm, setShowForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  return (
    <div style={{ maxWidth: 720 }}>
      <Breadcrumb leaf="Conversation Groups" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Conversation Groups</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Organise agents into teams to route conversations and manage availability</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><i className="fa-solid fa-plus" /> Create group</button>
      </div>

      {showForm && (
        <div className="form-section" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>New Group</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Group Name</div>
              <input className="form-input" placeholder="e.g. Sales Team" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
              <input className="form-input" placeholder="Optional description" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => { if (newGroupName) { setGroups(prev => [...prev, { id: Date.now(), name: newGroupName, desc: '', members: 0, channels: [] }]); setNewGroupName(''); setShowForm(false) } }}>Create</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map(g => (
          <div key={g.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,168,232,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-people-group" style={{ color: 'var(--accent2)', fontSize: 16 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{g.desc}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {g.channels.map(c => <span key={c} className="pill blue" style={{ fontSize: 10 }}>{c}</span>)}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 16 }}>{g.members}</div>
              <div>members</div>
            </div>
            <button className="btn btn-secondary" style={{ fontSize: 11 }}><i className="fa-solid fa-pencil" /> Edit</button>
            <button className="icon-btn" onClick={() => setGroups(prev => prev.filter(x => x.id !== g.id))}><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

const SUB_NAV = [
  { id: 'users',  label: 'Users',                icon: 'fa-solid fa-users' },
  { id: 'roles',  label: 'Roles',                icon: 'fa-solid fa-user-shield' },
  { id: 'groups', label: 'Conversation Groups',  icon: 'fa-solid fa-people-group' },
]

export default function TeamPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams?.get('tab') ?? 'users'
  const setTab = (t: string) => router.push(`/settings/team?tab=${t}`)

  return (
    <SettingsShell>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 200, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, padding: '12px 0' }}>
          <div style={{ padding: '4px 14px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Team Management</div>
          {SUB_NAV.map(item => {
            const isActive = tab === item.id
            return (
              <div key={item.id} onClick={() => setTab(item.id)} style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isActive ? 'var(--accent-glow)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400, fontSize: 12.5, transition: 'all 0.15s', borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <i className={item.icon} style={{ fontSize: 12, width: 14 }} />
                {item.label}
              </div>
            )
          })}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {tab === 'users'  && <UsersTab />}
          {tab === 'roles'  && <RolesTab />}
          {tab === 'groups' && <GroupsTab />}
        </div>
      </div>
    </SettingsShell>
  )
}
