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
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Account & Billing</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ color: 'var(--text-primary)' }}>{leaf}</span>
    </div>
  )
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
      <button className="btn btn-primary" onClick={onSave} disabled={saving}>
        {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : 'Save'}
      </button>
      <button className="btn btn-secondary">Cancel</button>
    </div>
  )
}

// ── CRM Settings ──────────────────────────────────────────────────────────────
function CRMSettingsTab() {
  const [workspaceName, setWorkspaceName] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [timeFormat, setTimeFormat] = useState('12-hour')
  const [currency, setCurrency] = useState('INR')
  const [firstDayOfWeek, setFirstDayOfWeek] = useState('Monday')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single().then(({ data: p }) => {
        if (!p) return
        supabase.from('workspaces').select('name').eq('id', p.workspace_id).single().then(({ data: w }) => {
          if (w) setWorkspaceName(w.name)
        })
      })
    })
  }, [])

  return (
    <div style={{ maxWidth: 580 }}>
      <Breadcrumb leaf="CRM Settings" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>CRM Settings</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Configure global settings for your CRM</div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>General</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Account Name</div>
          <input className="form-input" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="Your organisation name" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Timezone</div>
            <select className="form-input" value={timezone} onChange={e => setTimezone(e.target.value)}>
              <option value="Asia/Kolkata">(UTC+05:30) Asia/Kolkata</option>
              <option value="America/New_York">(UTC-05:00) America/New_York</option>
              <option value="Europe/London">(UTC+00:00) Europe/London</option>
              <option value="Asia/Dubai">(UTC+04:00) Asia/Dubai</option>
              <option value="Asia/Singapore">(UTC+08:00) Asia/Singapore</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Default Language</div>
            <select className="form-input">
              <option>English</option>
              <option>Hindi</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Date Format</div>
            <select className="form-input" value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Time Format</div>
            <select className="form-input" value={timeFormat} onChange={e => setTimeFormat(e.target.value)}>
              <option>12-hour</option>
              <option>24-hour</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>First Day of Week</div>
            <select className="form-input" value={firstDayOfWeek} onChange={e => setFirstDayOfWeek(e.target.value)}>
              <option>Monday</option>
              <option>Sunday</option>
              <option>Saturday</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Business Settings</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Default Currency</div>
            <select className="form-input" value={currency} onChange={e => setCurrency(e.target.value)}>
              {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Fiscal Year Start</div>
            <select className="form-input">
              <option>April</option>
              <option>January</option>
              <option>July</option>
            </select>
          </div>
        </div>
      </div>

      <SaveBar
        onSave={async () => {
          setSaving(true)
          // In production: update workspace name in supabase
          setTimeout(() => setSaving(false), 1200)
        }}
        saving={saving}
      />
    </div>
  )
}

// ── Account ───────────────────────────────────────────────────────────────────
function AccountTab() {
  const [saving, setSaving] = useState(false)
  const [companyName, setCompanyName] = useState('React Commerce')
  const [website, setWebsite] = useState('https://reactcommerce.io')
  const [industry, setIndustry] = useState('Technology')
  const [size, setSize] = useState('11-50')
  const [showDangerZone, setShowDangerZone] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  return (
    <div style={{ maxWidth: 580 }}>
      <Breadcrumb leaf="Account" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Account</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Manage your organisation's profile and branding</div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Company Profile</div>

        {/* Logo upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#000', flexShrink: 0 }}>RC</div>
          <div>
            <button className="btn btn-secondary" style={{ fontSize: 12, marginBottom: 4 }}><i className="fa-solid fa-upload" /> Upload Logo</button>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG, JPG or SVG • Recommended 200×200px • Max 2MB</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Company Name</div>
            <input className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Website</div>
            <input className="form-input" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Industry</div>
            <select className="form-input" value={industry} onChange={e => setIndustry(e.target.value)}>
              {['Technology', 'E-Commerce', 'Healthcare', 'Finance', 'Education', 'Retail', 'Real Estate', 'Other'].map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Company Size</div>
            <select className="form-input" value={size} onChange={e => setSize(e.target.value)}>
              {['1-10', '11-50', '51-200', '201-1000', '1000+'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <SaveBar onSave={() => { setSaving(true); setTimeout(() => setSaving(false), 1200) }} saving={saving} />

      {/* Danger Zone */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e84040', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-triangle-exclamation" />Danger Zone
        </div>
        <div style={{ border: '1px solid rgba(232,64,64,0.3)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Delete this account</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Once deleted, all data is permanently removed and cannot be recovered.</div>
            </div>
            <button onClick={() => setShowDangerZone(!showDangerZone)} style={{ background: 'transparent', border: '1px solid rgba(232,64,64,0.5)', borderRadius: 8, padding: '7px 14px', color: '#e84040', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Delete account
            </button>
          </div>
          {showDangerZone && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(232,64,64,0.2)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Type <strong style={{ color: 'var(--text-primary)' }}>{companyName}</strong> to confirm:</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="form-input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={companyName} style={{ flex: 1 }} />
                <button disabled={deleteConfirm !== companyName} style={{ background: deleteConfirm === companyName ? '#e84040' : 'var(--bg-surface2)', color: deleteConfirm === companyName ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: deleteConfirm === companyName ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                  Permanently Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Plans and Billing ─────────────────────────────────────────────────────────
function PlansTab() {
  const invoices = [
    { no: 'INV-2026-04', date: 'Apr 1, 2026', amount: '₹0', status: 'paid' },
    { no: 'INV-2026-03', date: 'Mar 1, 2026', amount: '₹0', status: 'paid' },
    { no: 'INV-2026-02', date: 'Feb 1, 2026', amount: '₹0', status: 'paid' },
  ]

  const usageMetrics = [
    { label: 'Agent Seats', used: 3, limit: 10, color: 'var(--accent)' },
    { label: 'Contact Records', used: 1247, limit: 10000, color: 'var(--accent2)' },
    { label: 'WhatsApp Conversations', used: 340, limit: 1000, color: '#25d366' },
    { label: 'Marketing Emails / mo', used: 2100, limit: 5000, color: 'var(--accent3)' },
  ]

  return (
    <div style={{ maxWidth: 700 }}>
      <Breadcrumb leaf="Plans and Billing" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Plans and Billing</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>View your current plan, usage, and manage your subscription</div>

      {/* Current Plan */}
      <div style={{ background: 'linear-gradient(135deg, rgba(47,231,116,0.08), rgba(0,168,232,0.06))', border: '1px solid rgba(47,231,116,0.25)', borderRadius: 14, padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>Self-Hosted</span>
            <span className="pill green" style={{ fontSize: 11 }}>Active</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            WhatsApp Cloud API: <strong style={{ color: 'var(--accent)' }}>Free up to 1,000 conv/month</strong> &nbsp;•&nbsp;
            Supabase: <strong style={{ color: 'var(--accent)' }}>Free tier: 500MB</strong>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--accent)' }}>₹0</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>per month</div>
        </div>
      </div>

      {/* Usage Meters */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Usage This Month</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {usageMetrics.map(m => {
            const pct = Math.round((m.used / m.limit) * 100)
            return (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{m.label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{m.used.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {m.limit.toLocaleString()}</span></span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#e84040' : m.color, borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment Method */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Payment Method</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <i className="fa-brands fa-cc-visa" style={{ fontSize: 24, color: '#1a1f71' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Visa ending in 4242</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expires 04/2028</div>
          </div>
          <button className="btn btn-secondary" style={{ fontSize: 12 }}>Update</button>
        </div>
      </div>

      {/* Invoices */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>Billing History</div>
        <table className="tbl" style={{ width: '100%' }}>
          <thead><tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.no}>
                <td className="primary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.no}</td>
                <td style={{ fontSize: 12 }}>{inv.date}</td>
                <td style={{ fontWeight: 600 }}>{inv.amount}</td>
                <td><span className="pill green" style={{ fontSize: 10 }}>✓ Paid</span></td>
                <td><button className="icon-btn" title="Download PDF"><i className="fa-solid fa-download" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const SUB_NAV = [
  { id: 'crm-settings', label: 'CRM Settings',    icon: 'fa-solid fa-sliders' },
  { id: 'account',      label: 'Account',          icon: 'fa-solid fa-building-user' },
  { id: 'plans',        label: 'Plans and Billing', icon: 'fa-solid fa-credit-card' },
]

export default function BillingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams?.get('tab') ?? 'crm-settings'
  const setTab = (t: string) => router.push(`/settings/billing?tab=${t}`)

  return (
    <SettingsShell>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 200, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, padding: '12px 0' }}>
          <div style={{ padding: '4px 14px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Account & Billing</div>
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
          {tab === 'crm-settings' && <CRMSettingsTab />}
          {tab === 'account'      && <AccountTab />}
          {tab === 'plans'        && <PlansTab />}
        </div>
      </div>
    </SettingsShell>
  )
}
