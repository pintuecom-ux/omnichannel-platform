'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SettingsShell from '@/components/settings/SettingsShell'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 36, height: 20, borderRadius: 10, background: value ? 'var(--accent)' : 'var(--bg-surface2)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: value ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => router.push('/settings/admin')}>Admin Settings</span>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
          <span style={{ color: i === items.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: item.href ? 'pointer' : 'default' }}
            onClick={() => item.href && router.push(item.href)}>
            {item.label}
          </span>
        </span>
      ))}
    </div>
  )
}

const SUB_NAV = [
  { id: 'labels',                 label: 'Conversation Labels',          icon: 'fa-solid fa-tags',             group: 'Modules' },
  { id: 'conversation-properties', label: 'Conversation Properties',     icon: 'fa-solid fa-list-check',       group: 'Modules' },
  { id: 'contacts',               label: 'Contacts',                     icon: 'fa-solid fa-user',             group: 'Modules' },
  { id: 'accounts',               label: 'Accounts',                     icon: 'fa-solid fa-building',         group: 'Modules' },
  { id: 'tags',                   label: 'CRM Tags',                     icon: 'fa-solid fa-hashtag',          group: 'Modules' },
  { id: 'business-hours',         label: 'Business Hours',               icon: 'fa-solid fa-clock',            group: 'Workflows' },
  { id: 'assignment-rules',       label: 'Assignment Rules',             icon: 'fa-solid fa-shuffle',          group: 'Workflows' },
  { id: 'sla',                    label: 'SLA Policies',                 icon: 'fa-solid fa-gauge-high',       group: 'Workflows' },
  { id: 'web-chat-settings',      label: 'Web Chat Settings',            icon: 'fa-solid fa-sliders',          group: 'Workflows' },
  { id: 'languages',              label: 'Conversation Languages',       icon: 'fa-solid fa-language',         group: 'Workflows' },
  { id: 'journeys',               label: 'Customer Journeys',            icon: 'fa-solid fa-route',            group: 'Campaigns' },
  { id: 'wa-campaigns',           label: 'WhatsApp Campaigns',           icon: 'fa-brands fa-whatsapp',        group: 'Campaigns' },
]

// ── Conversation Labels ───────────────────────────────────────────────────────
function LabelsTab() {
  const [labels, setLabels] = useState([
    { id: 1, name: 'Urgent',    color: '#e84040', desc: 'High priority issues' },
    { id: 2, name: 'VIP',       color: '#f59e0b', desc: 'VIP customers' },
    { id: 3, name: 'Bug',       color: '#8b5cf6', desc: 'Product bugs' },
    { id: 4, name: 'Billing',   color: '#00a8e8', desc: 'Billing related' },
    { id: 5, name: 'Sales',     color: '#2fe774', desc: 'Sales inquiries' },
  ])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#2fe774')
  const [newDesc, setNewDesc] = useState('')
  const [showForm, setShowForm] = useState(false)

  return (
    <div style={{ maxWidth: 640 }}>
      <Breadcrumb items={[{ label: 'Configuration' }, { label: 'Conversation Labels' }]} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Conversation Labels</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Create labels to tag and categorise conversations</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><i className="fa-solid fa-plus" /> Create Label</button>
      </div>

      {showForm && (
        <div className="form-section" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>New Label</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 12, alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Color</div>
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 44, height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: 3, background: 'var(--bg-surface)', cursor: 'pointer' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Label Name</div>
              <input className="form-input" placeholder="Label name" value={newName} onChange={e => setNewName(e.target.value)} maxLength={50} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
              <input className="form-input" placeholder="Optional description" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => { if (newName) { setLabels(prev => [...prev, { id: Date.now(), name: newName, color: newColor, desc: newDesc }]); setNewName(''); setNewDesc(''); setShowForm(false) } }}>Save</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {labels.map(label => (
          <div key={label.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: label.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{label.name}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 2 }}>{label.desc}</span>
            <button className="icon-btn" title="Edit"><i className="fa-solid fa-pencil" /></button>
            <button className="icon-btn" title="Delete" onClick={() => setLabels(prev => prev.filter(l => l.id !== label.id))}><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Business Hours ────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
function BusinessHoursTab() {
  const [tz, setTz] = useState('Asia/Kolkata')
  const [hours, setHours] = useState(DAYS.map((d, i) => ({ day: d, enabled: i < 5, start: '09:00', end: '18:00' })))
  const [saving, setSaving] = useState(false)

  return (
    <div style={{ maxWidth: 640 }}>
      <Breadcrumb items={[{ label: 'Configuration' }, { label: 'Business Hours' }]} />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Business Hours</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Define your team's working hours to control availability and SLA timers</div>

      <div className="form-section">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Timezone</div>
          <select className="form-input" value={tz} onChange={e => setTz(e.target.value)} style={{ maxWidth: 300 }}>
            <option value="Asia/Kolkata">(UTC+05:30) Asia/Kolkata</option>
            <option value="America/New_York">(UTC-05:00) America/New_York</option>
            <option value="Europe/London">(UTC+00:00) Europe/London</option>
            <option value="Asia/Dubai">(UTC+04:00) Asia/Dubai</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hours.map((h, i) => (
            <div key={h.day} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <Toggle value={h.enabled} onChange={v => setHours(prev => prev.map((x, j) => j === i ? { ...x, enabled: v } : x))} />
              <span style={{ width: 90, fontSize: 13, fontWeight: 600, color: h.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>{h.day}</span>
              {h.enabled ? (
                <>
                  <select className="form-input" value={h.start} onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} style={{ width: 100 }}>
                    {['08:00','09:00','10:00','11:00','12:00'].map(t => <option key={t}>{t}</option>)}
                  </select>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
                  <select className="form-input" value={h.end} onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} style={{ width: 100 }}>
                    {['17:00','18:00','19:00','20:00','21:00','22:00'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Closed</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={() => { setSaving(true); setTimeout(() => setSaving(false), 1200) }}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : 'Save Hours'}
          </button>
          <button className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── SLA Policies ──────────────────────────────────────────────────────────────
function SLATab() {
  const [policies] = useState([
    { id: 1, name: 'Default SLA', firstReply: '4 hours', resolution: '24 hours', businessHours: true },
    { id: 2, name: 'VIP Policy', firstReply: '30 min', resolution: '4 hours', businessHours: false },
  ])
  return (
    <div style={{ maxWidth: 720 }}>
      <Breadcrumb items={[{ label: 'Configuration' }, { label: 'SLA Policies' }]} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>SLA Policies</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Define response and resolution time targets</div>
        </div>
        <button className="btn btn-primary"><i className="fa-solid fa-plus" /> Create Policy</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {policies.map(p => (
          <div key={p.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span><i className="fa-regular fa-clock" style={{ marginRight: 5, color: 'var(--accent)' }} />First reply: <strong>{p.firstReply}</strong></span>
                <span><i className="fa-solid fa-circle-check" style={{ marginRight: 5, color: 'var(--accent2)' }} />Resolution: <strong>{p.resolution}</strong></span>
                {p.businessHours && <span><i className="fa-solid fa-briefcase" style={{ marginRight: 5, color: 'var(--accent3)' }} />Business hours only</span>}
              </div>
            </div>
            <button className="btn btn-secondary" style={{ fontSize: 11 }}><i className="fa-solid fa-pencil" /> Edit</button>
            {p.id !== 1 && <button className="icon-btn"><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Assignment Rules ──────────────────────────────────────────────────────────
function AssignmentRulesTab() {
  const [rules] = useState([
    { id: 1, name: 'WhatsApp → Sales Group', conditions: 'Channel is WhatsApp', action: 'Assign to Sales', enabled: true },
    { id: 2, name: 'VIP Tag → Premium Support', conditions: 'Contact tag contains VIP', action: 'Assign to Premium Support', enabled: true },
  ])
  return (
    <div style={{ maxWidth: 760 }}>
      <Breadcrumb items={[{ label: 'Configuration' }, { label: 'Assignment Rules' }]} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Conversation Assignment Rules</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Automatically route conversations to agents or groups based on conditions</div>
        </div>
        <button className="btn btn-primary"><i className="fa-solid fa-plus" /> Create Rule</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rules.map((rule, i) => (
          <div key={rule.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <i className="fa-solid fa-grip-dots-vertical" style={{ color: 'var(--text-muted)', cursor: 'grab', fontSize: 12 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{rule.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>IF</span>{rule.conditions}
                <span style={{ color: 'var(--text-muted)', marginLeft: 8, marginRight: 4 }}>→</span>{rule.action}
              </div>
            </div>
            <Toggle value={rule.enabled} onChange={() => {}} />
            <button className="icon-btn"><i className="fa-solid fa-pencil" /></button>
            <button className="icon-btn"><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CRM Tags ─────────────────────────────────────────────────────────────────
function TagsTab() {
  const [tags, setTags] = useState(['Hot Lead', 'VIP', 'Repeat Customer', 'Enterprise', 'Follow Up', 'Demo Requested', 'Trial User', 'Churned', 'Upsell Opportunity'])
  const [newTag, setNewTag] = useState('')
  return (
    <div style={{ maxWidth: 640 }}>
      <Breadcrumb items={[{ label: 'Configuration' }, { label: 'CRM Tags' }]} />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>CRM Tags</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Manage tags used across contacts and accounts</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="form-input" placeholder="New tag name" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newTag) { setTags(prev => [...prev, newTag]); setNewTag('') } }} style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => { if (newTag) { setTags(prev => [...prev, newTag]); setNewTag('') } }}><i className="fa-solid fa-plus" /> Create tag</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.map(tag => (
          <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
            {tag}
            <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: 0, display: 'flex', alignItems: 'center' }}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Contact Fields ────────────────────────────────────────────────────────────
function ContactFieldsTab({ entity }: { entity: 'contacts' | 'accounts' }) {
  const defaultFields = entity === 'contacts'
    ? ['First name', 'Last name', 'Email', 'Phone', 'Company', 'Job title', 'Location']
    : ['Company name', 'Website', 'Industry', 'Employee count', 'Annual revenue', 'Country']
  const [customFields, setCustomFields] = useState([
    { id: 1, name: 'LinkedIn URL', type: 'URL', required: false },
    { id: 2, name: 'Plan Type', type: 'Dropdown', required: false },
  ])
  return (
    <div style={{ maxWidth: 640 }}>
      <Breadcrumb items={[{ label: 'Configuration' }, { label: entity === 'contacts' ? 'Contacts' : 'Accounts' }]} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{entity === 'contacts' ? 'Contacts' : 'Accounts'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Manage custom fields and properties</div>
        </div>
        <button className="btn btn-primary"><i className="fa-solid fa-plus" /> Add custom field</button>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Default Fields</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
        {defaultFields.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-lock" style={{ fontSize: 10, color: 'var(--text-muted)' }} />
            <span style={{ flex: 1 }}>{f}</span>
            <span className="pill blue" style={{ fontSize: 10 }}>System</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Custom Fields</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {customFields.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <i className="fa-solid fa-grip-dots-vertical" style={{ fontSize: 10, color: 'var(--text-muted)', cursor: 'grab' }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{f.name}</span>
            <span className="pill blue" style={{ fontSize: 10 }}>{f.type}</span>
            {f.required && <span className="pill green" style={{ fontSize: 10 }}>Required</span>}
            <button className="icon-btn"><i className="fa-solid fa-pencil" /></button>
            <button className="icon-btn"><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ConfigurationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams?.get('tab') ?? 'labels'
  const setTab = (t: string) => router.push(`/settings/configuration?tab=${t}`)

  const groups = [...new Set(SUB_NAV.map(s => s.group))]

  return (
    <SettingsShell>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Sub nav */}
        <div style={{ width: 220, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, padding: '12px 0' }}>
          {groups.map(group => (
            <div key={group}>
              <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group}</div>
              {SUB_NAV.filter(s => s.group === group).map(item => {
                const isActive = tab === item.id
                return (
                  <div key={item.id} onClick={() => setTab(item.id)} style={{ padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isActive ? 'var(--accent-glow)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400, fontSize: 12, transition: 'all 0.15s', borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent' }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <i className={item.icon} style={{ fontSize: 11, width: 14 }} />
                    {item.label}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {tab === 'labels'                  && <LabelsTab />}
          {tab === 'business-hours'          && <BusinessHoursTab />}
          {tab === 'sla'                     && <SLATab />}
          {tab === 'assignment-rules'        && <AssignmentRulesTab />}
          {tab === 'tags'                    && <TagsTab />}
          {tab === 'contacts'                && <ContactFieldsTab entity="contacts" />}
          {tab === 'accounts'                && <ContactFieldsTab entity="accounts" />}
          {!['labels','business-hours','sla','assignment-rules','tags','contacts','accounts'].includes(tab) && (
            <div style={{ maxWidth: 640 }}>
              <Breadcrumb items={[{ label: 'Configuration' }, { label: SUB_NAV.find(s => s.id === tab)?.label ?? '' }]} />
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>{SUB_NAV.find(s => s.id === tab)?.label}</div>
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, marginTop: 20 }}>
                <i className={SUB_NAV.find(s => s.id === tab)?.icon ?? 'fa-solid fa-gear'} style={{ fontSize: 36, color: 'var(--text-muted)', opacity: 0.4, display: 'block', marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Coming Soon</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>This settings section is being built.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsShell>
  )
}
