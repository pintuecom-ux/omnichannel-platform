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

function Breadcrumb({ leaf }: { leaf: string }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => router.push('/settings/admin')}>Admin Settings</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Data & Security</span>
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

// ── Contacts Import ───────────────────────────────────────────────────────────
function ContactsImportTab() {
  const [step, setStep] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'create'>('skip')

  return (
    <div style={{ maxWidth: 620 }}>
      <Breadcrumb leaf="Contacts Import" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Contacts Import</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Import contacts in bulk via CSV file</div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
        {['Upload File', 'Map Columns', 'Options', 'Preview', 'Import'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: step > i + 1 ? 'var(--accent)' : step === i + 1 ? 'var(--accent-glow)' : 'var(--bg-surface2)', border: step >= i + 1 ? '2px solid var(--accent)' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: step > i + 1 ? '#000' : step === i + 1 ? 'var(--accent)' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                {step > i + 1 ? <i className="fa-solid fa-check" style={{ fontSize: 10 }} /> : i + 1}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: step === i + 1 ? 'var(--accent)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s}</div>
            </div>
            {i < 4 && <div style={{ height: 2, flex: 0.5, background: step > i + 1 ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s', marginBottom: 22 }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setStep(2) } }}
            style={{ border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, padding: 48, textAlign: 'center', background: dragging ? 'var(--accent-glow)' : 'var(--bg-surface)', transition: 'all 0.2s', cursor: 'pointer' }}
            onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv'; inp.onchange = (e: any) => { const f = e.target.files?.[0]; if (f) { setFile(f); setStep(2) } }; inp.click() }}
          >
            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 36, color: dragging ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 12, display: 'block' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Drop your CSV file here or browse</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Max file size: 25MB • Required column: Email or Phone</div>
          </div>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <a style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'none' }}>
              <i className="fa-solid fa-download" style={{ marginRight: 5 }} />Download sample CSV
            </a>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-section">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Map Columns</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>File: <strong>{file?.name}</strong></div>
          {[['first_name', 'First Name'], ['last_name', 'Last Name'], ['email', 'Email'], ['phone', 'Phone'], ['company', 'Company']].map(([col, label]) => (
            <div key={col} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--accent3)', fontFamily: 'monospace' }}>{col}</div>
              <i className="fa-solid fa-arrow-right" style={{ color: 'var(--text-muted)', fontSize: 12 }} />
              <select className="form-input" style={{ fontSize: 12 }}>
                <option>{label}</option>
                <option>Skip this column</option>
              </select>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="form-section">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Import Options</div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Duplicate Handling</div>
            {[{ id: 'skip', label: 'Skip duplicates', desc: 'Do not create or update existing contacts' }, { id: 'update', label: 'Update existing contacts', desc: 'Overwrite fields in matching records' }, { id: 'create', label: 'Create duplicate contacts', desc: 'Always create new records regardless of duplicates' }].map(opt => (
              <label key={opt.id} onClick={() => setDuplicateHandling(opt.id as any)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: duplicateHandling === opt.id ? 'var(--accent-glow)' : 'var(--bg-surface)', border: `1px solid ${duplicateHandling === opt.id ? 'var(--border-active)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 8, transition: 'all 0.15s' }}>
                <input type="radio" name="dup" checked={duplicateHandling === opt.id} readOnly style={{ accentColor: 'var(--accent)', marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Next →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="form-section" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Preview</div>
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead>
              <tbody>
                {[['Jane Doe', 'jane@example.com', '+1234567890', 'ok'], ['John Smith', 'john@example.com', '+0987654321', 'ok'], ['Invalid Row', 'not-an-email', '', 'error']].map(([n, e, p, s], i) => (
                  <tr key={i} style={{ background: s === 'error' ? 'rgba(232,64,64,0.05)' : undefined }}>
                    <td className={s === 'ok' ? 'primary' : ''} style={s === 'error' ? { color: '#e84040' } : {}}>{n}</td>
                    <td style={s === 'error' ? { color: '#e84040' } : {}}>{e}</td>
                    <td>{p}</td>
                    <td>{s === 'ok' ? <span className="pill green" style={{ fontSize: 10 }}>✓ Ready</span> : <span className="pill red" style={{ fontSize: 10 }}>✗ Invalid email</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong>2 contacts</strong> will be imported. <strong style={{ color: '#e84040' }}>1 row</strong> will be skipped due to errors.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(5)}><i className="fa-solid fa-cloud-arrow-up" /> Start Import</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: 48, color: 'var(--accent)', display: 'block', marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Import Complete</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>2 contacts imported successfully. 1 row was skipped.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}><i className="fa-solid fa-plus" /> New Import</button>
            <a style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '9px 18px', border: '1px solid var(--border-active)', borderRadius: 10, textDecoration: 'none' }}>
              <i className="fa-solid fa-download" /> Download error report
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Import History ────────────────────────────────────────────────────────────
function ImportHistoryTab() {
  const history = [
    { id: 1, type: 'Contacts', by: 'Admin User', date: 'Apr 28, 2026 10:24 AM', file: 'contacts_q1.csv', total: 284, imported: 280, failed: 4, status: 'completed' },
    { id: 2, type: 'Accounts', by: 'Admin User', date: 'Apr 20, 2026 02:11 PM', file: 'accounts_batch.csv', total: 50, imported: 50, failed: 0, status: 'completed' },
    { id: 3, type: 'Users', by: 'Admin User', date: 'Mar 15, 2026 09:00 AM', file: 'team_import.csv', total: 8, imported: 7, failed: 1, status: 'completed' },
  ]

  return (
    <div>
      <Breadcrumb leaf="Import History" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Import History</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>View the status and results of all previous data imports</div>
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Import Type</th>
              <th>Imported By</th>
              <th>Date</th>
              <th>File</th>
              <th>Total</th>
              <th>Imported</th>
              <th>Failed</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id}>
                <td className="primary">{h.type}</td>
                <td style={{ fontSize: 12 }}>{h.by}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h.date}</td>
                <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent3)' }}>{h.file}</td>
                <td style={{ textAlign: 'center' }}>{h.total}</td>
                <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 600 }}>{h.imported}</td>
                <td style={{ textAlign: 'center', color: h.failed > 0 ? '#e84040' : 'var(--text-muted)', fontWeight: h.failed > 0 ? 700 : 400 }}>{h.failed}</td>
                <td><span className="pill green" style={{ fontSize: 10 }}>✓ Completed</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" title="Download original"><i className="fa-solid fa-download" /></button>
                    {h.failed > 0 && <button className="icon-btn" title="Download error report" style={{ color: '#e84040' }}><i className="fa-solid fa-file-circle-exclamation" /></button>}
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

// ── Block IPs ─────────────────────────────────────────────────────────────────
function BlockIPsTab() {
  const [ipList, setIpList] = useState('192.168.100.0/24\n10.0.0.1')
  const [blockedMsg, setBlockedMsg] = useState('Chat is currently unavailable.')
  const [saving, setSaving] = useState(false)

  return (
    <div style={{ maxWidth: 580 }}>
      <Breadcrumb leaf="Block IPs for Web Chat" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Block IPs for Web Chat</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Prevent specific IP addresses or ranges from initiating web chat conversations</div>
      <div className="form-section">
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Blocked IP Addresses / Ranges</div>
        <textarea value={ipList} onChange={e => setIpList(e.target.value)} rows={8} className="form-input" style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} placeholder="One IP or CIDR range per line&#10;e.g. 192.168.1.1&#10;10.0.0.0/8" />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Use CIDR notation to block IP ranges (e.g. 10.0.0.0/8)</div>
        <div style={{ marginTop: 16, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Message Shown to Blocked Visitors</div>
        <input className="form-input" value={blockedMsg} onChange={e => setBlockedMsg(e.target.value)} />
        <SaveBar onSave={() => { setSaving(true); setTimeout(() => setSaving(false), 1200) }} saving={saving} />
      </div>

      <div className="form-section" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Recent Block Events</div>
        <table className="tbl">
          <thead><tr><th>IP Address</th><th>Attempted At</th><th>Reason</th></tr></thead>
          <tbody>
            <tr>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>192.168.100.55</td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>Apr 28, 2026 11:32 AM</td>
              <td><span className="pill red" style={{ fontSize: 10 }}>IP range blocked</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Org Security ──────────────────────────────────────────────────────────────
function OrgSecurityTab() {
  const [enforce2fa, setEnforce2fa] = useState(false)
  const [ssoEnabled, setSsoEnabled] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState('8 hours')
  const [minPassLen, setMinPassLen] = useState(12)
  const [requireUpper, setRequireUpper] = useState(true)
  const [requireNumbers, setRequireNumbers] = useState(true)
  const [requireSpecial, setRequireSpecial] = useState(false)
  const [saving, setSaving] = useState(false)

  return (
    <div style={{ maxWidth: 600 }}>
      <Breadcrumb leaf="Org Security" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Org Security</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Configure authentication, session management, and access control</div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Two-Factor Authentication</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Enforce 2FA for all users</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Users without 2FA will be prompted on next login</div>
          </div>
          <Toggle value={enforce2fa} onChange={setEnforce2fa} />
        </div>
        {enforce2fa && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Grace Period Before Enforcement</div>
            <select className="form-input" style={{ maxWidth: 200 }}>
              <option>Immediate</option>
              <option>24 hours</option>
              <option>7 days</option>
            </select>
          </div>
        )}
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Single Sign-On (SSO)</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Enable SSO</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Allow users to sign in with your identity provider</div>
          </div>
          <Toggle value={ssoEnabled} onChange={setSsoEnabled} />
        </div>
        {ssoEnabled && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {['SAML 2.0', 'OAuth 2.0', 'OpenID Connect'].map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <input type="radio" name="sso-protocol" style={{ accentColor: 'var(--accent)' }} defaultChecked={p === 'SAML 2.0'} />
                  {p}
                </label>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>IdP Entity ID</div>
                <input className="form-input" placeholder="https://your-idp.com/entity" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>IdP SSO URL</div>
                <input className="form-input" placeholder="https://your-idp.com/sso" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Session Management</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Session Timeout</div>
          <select className="form-input" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} style={{ maxWidth: 200 }}>
            {['30 minutes', '1 hour', '4 hours', '8 hours', '24 hours', '7 days', 'Never'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Password Policy</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Minimum Password Length</div>
          <input type="number" className="form-input" value={minPassLen} onChange={e => setMinPassLen(Number(e.target.value))} min={8} max={32} style={{ maxWidth: 100 }} />
        </div>
        {[
          { label: 'Require uppercase letters', value: requireUpper, set: setRequireUpper },
          { label: 'Require numbers', value: requireNumbers, set: setRequireNumbers },
          { label: 'Require special characters', value: requireSpecial, set: setRequireSpecial },
        ].map(opt => (
          <div key={opt.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{opt.label}</span>
            <Toggle value={opt.value} onChange={opt.set} />
          </div>
        ))}
      </div>

      <SaveBar onSave={() => { setSaving(true); setTimeout(() => setSaving(false), 1200) }} saving={saving} />
    </div>
  )
}

// ── GDPR ──────────────────────────────────────────────────────────────────────
function GDPRTab() {
  const [retention, setRetention] = useState('2 years')
  const [autoDelete, setAutoDelete] = useState(false)
  const [consentTracking, setConsentTracking] = useState(true)
  const [cookieConsent, setCookieConsent] = useState(true)
  const [erasureEmail, setErasureEmail] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <div style={{ maxWidth: 600 }}>
      <Breadcrumb leaf="GDPR" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>GDPR</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Tools to help you comply with data protection regulations including GDPR, CCPA, and similar laws</div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Data Retention</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Conversation Data Retention</div>
            <select className="form-input" value={retention} onChange={e => setRetention(e.target.value)}>
              {['Keep forever', '1 year', '2 years', '3 years'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Contact Data Retention</div>
            <select className="form-input">
              {['Keep forever', '1 year', '2 years', '3 years'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Auto-delete data after retention period</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Data will be automatically purged when the retention period expires</div>
          </div>
          <Toggle value={autoDelete} onChange={setAutoDelete} />
        </div>
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Right to Erasure</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Permanently delete all data associated with a contact</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="form-input" placeholder="Search by email or contact ID" value={erasureEmail} onChange={e => setErasureEmail(e.target.value)} style={{ flex: 1 }} />
          <button className="btn" style={{ background: erasureEmail ? '#e84040' : 'var(--bg-surface2)', color: erasureEmail ? '#fff' : 'var(--text-muted)', border: 'none', cursor: erasureEmail ? 'pointer' : 'not-allowed', padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
            <i className="fa-solid fa-eraser" style={{ marginRight: 6 }} />Find & Erase
          </button>
        </div>
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Cookie Consent (Web Chat)</div>
          <Toggle value={cookieConsent} onChange={setCookieConsent} />
        </div>
        {cookieConsent && (
          <>
            <textarea className="form-input" rows={3} defaultValue="We use cookies to provide you with the best experience. By using this chat, you agree to our privacy policy." style={{ resize: 'vertical', marginBottom: 12 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Privacy Policy URL</div>
              <input className="form-input" placeholder="https://yourcompany.com/privacy" />
            </div>
          </>
        )}
      </div>

      <div className="form-section" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Data Processing Agreement</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary"><i className="fa-solid fa-file-pdf" style={{ color: '#e84040' }} /> Download DPA</button>
          <button className="btn btn-secondary"><i className="fa-solid fa-upload" /> Upload Countersigned DPA</button>
        </div>
      </div>

      <SaveBar onSave={() => { setSaving(true); setTimeout(() => setSaving(false), 1200) }} saving={saving} />
    </div>
  )
}

const SUB_NAV = [
  { id: 'import-contacts', label: 'Contacts Import',   icon: 'fa-solid fa-user-plus',          group: 'Import' },
  { id: 'import-accounts', label: 'Accounts Import',   icon: 'fa-solid fa-building-circle-arrow-right', group: 'Import' },
  { id: 'import-users',    label: 'Users Import',      icon: 'fa-solid fa-users-gear',         group: 'Import' },
  { id: 'import-history',  label: 'Import History',    icon: 'fa-solid fa-clock-rotate-left',  group: 'Import' },
  { id: 'block-ips',       label: 'Block IPs',         icon: 'fa-solid fa-ban',                group: 'Security' },
  { id: 'org-security',    label: 'Org Security',      icon: 'fa-solid fa-shield-halved',      group: 'Security' },
  { id: 'gdpr',            label: 'GDPR',              icon: 'fa-solid fa-scale-balanced',     group: 'Security' },
  { id: 'security-design', label: 'Security by Design', icon: 'fa-solid fa-lock',              group: 'Security' },
]

export default function DataSecurityPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams?.get('tab') ?? 'import-contacts'
  const setTab = (t: string) => router.push(`/settings/data?tab=${t}`)

  const groups = [...new Set(SUB_NAV.map(s => s.group))]

  return (
    <SettingsShell>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {tab === 'import-contacts' && <ContactsImportTab />}
          {tab === 'import-history'  && <ImportHistoryTab />}
          {tab === 'block-ips'       && <BlockIPsTab />}
          {tab === 'org-security'    && <OrgSecurityTab />}
          {tab === 'gdpr'            && <GDPRTab />}
          {!['import-contacts','import-history','block-ips','org-security','gdpr'].includes(tab) && (
            <div style={{ maxWidth: 500 }}>
              <Breadcrumb leaf={SUB_NAV.find(s => s.id === tab)?.label ?? ''} />
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 20 }}>{SUB_NAV.find(s => s.id === tab)?.label}</div>
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14 }}>
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
