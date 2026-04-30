'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SettingsShell from '@/components/settings/SettingsShell'
import { createClient } from '@/lib/supabase/client'

const CHANNEL_TABS = [
  { id: 'web-chat',   label: 'Web Chat',                   icon: 'fa-solid fa-comment-dots',        color: '#2fe774' },
  { id: 'whatsapp',   label: 'WhatsApp',                   icon: 'fa-brands fa-whatsapp',           color: '#25d366' },
  { id: 'sms',        label: 'SMS',                        icon: 'fa-solid fa-sms',                 color: '#8b5cf6' },
  { id: 'instagram',  label: 'Instagram',                  icon: 'fa-brands fa-instagram',          color: '#e1306c' },
  { id: 'facebook',   label: 'Facebook Messenger',         icon: 'fa-brands fa-facebook-messenger', color: '#0084ff' },
  { id: 'line',       label: 'LINE',                       icon: 'fa-solid fa-message',             color: '#06c755' },
  { id: 'mobile-sdk', label: 'Mobile SDK',                 icon: 'fa-solid fa-mobile-screen',       color: '#f59e0b' },
  { id: 'email',      label: 'Support Email',              icon: 'fa-solid fa-envelope',            color: '#00a8e8' },
  { id: 'phone',      label: 'Phone',                      icon: 'fa-solid fa-phone',               color: '#10b981' },
  { id: 'apple',      label: 'Apple Messages',             icon: 'fa-brands fa-apple',             color: '#d5d5d5' },
  { id: 'apps',       label: 'Channel Apps',               icon: 'fa-solid fa-grid-2-plus',         color: '#2fe774' },
]

function Breadcrumb({ current }: { current: string }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => router.push('/settings/admin')}>Admin Settings</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Channels</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ color: 'var(--text-primary)' }}>{current}</span>
    </div>
  )
}

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</div>}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 36, height: 20, borderRadius: 10, background: value ? 'var(--accent)' : 'var(--bg-surface2)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: value ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function FormInput({ placeholder, value, onChange, disabled }: { placeholder?: string; value?: string; onChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      className="form-input"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled}
      style={disabled ? { opacity: 0.5 } : {}}
    />
  )
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
      <button className="btn btn-primary" onClick={onSave} disabled={saving}>
        {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : 'Update'}
      </button>
      <button className="btn btn-secondary">Cancel</button>
    </div>
  )
}

function EmptyState({ icon, title, desc, action, onAction }: { icon: string; title: string; desc: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ padding: 60, textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <i className={icon} style={{ fontSize: 40, color: 'var(--text-muted)', opacity: 0.4 }} />
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.6 }}>{desc}</div>
      {action && <button className="btn btn-primary" onClick={onAction}><i className="fa-solid fa-plus" /> {action}</button>}
    </div>
  )
}

// ── Web Chat Tab ──────────────────────────────────────────────────────────────
function WebChatTab() {
  const [widgetName, setWidgetName] = useState('Support Chat')
  const [widgetColor, setWidgetColor] = useState('#2fe774')
  const [position, setPosition] = useState<'left' | 'right'>('right')
  const [preChatForm, setPreChatForm] = useState(true)
  const [headingText, setHeadingText] = useState('Hi there! 👋')
  const [subheading, setSubheading] = useState("We're here to help. Send us a message!")
  const [csatEnabled, setCsatEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeInnerTab, setActiveInnerTab] = useState<'configuration' | 'availability' | 'integrations'>('configuration')

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'
  const embedCode = `<script>
  window.platformSettings = { appId: "YOUR_APP_ID" };
  (function(d,s){
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
    j.async=true; j.src="https://cdn.yourplatform.com/widget.js";
    f.parentNode.insertBefore(j,f);
  })(document,"script");
</script>`

  return (
    <div style={{ maxWidth: 640 }}>
      <Breadcrumb current="Web Chat" />
      <SectionHeader title="Web Chat" />

      {/* Inner tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {(['configuration', 'availability', 'integrations'] as const).map(t => (
          <button key={t} onClick={() => setActiveInnerTab(t)} style={{ padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: activeInnerTab === t ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: activeInnerTab === t ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize', transition: 'color 0.15s' }}>
            {t}
          </button>
        ))}
      </div>

      {activeInnerTab === 'configuration' && (
        <div>
          <div className="form-section" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Widget Appearance</div>
            <FormField label="Widget Name">
              <FormInput value={widgetName} onChange={setWidgetName} placeholder="Enter widget name" />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Widget Color">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={widgetColor} onChange={e => setWidgetColor(e.target.value)} style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8, padding: 2, background: 'var(--bg-surface)', cursor: 'pointer' }} />
                  <FormInput value={widgetColor} onChange={setWidgetColor} />
                </div>
              </FormField>
              <FormField label="Widget Position">
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['left', 'right'] as const).map(p => (
                    <button key={p} onClick={() => setPosition(p)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${position === p ? 'var(--border-active)' : 'var(--border)'}`, background: position === p ? 'var(--accent-glow)' : 'var(--bg-surface)', color: position === p ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize' }}>
                      {p === 'left' ? '← Bottom Left' : 'Bottom Right →'}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          </div>

          <div className="form-section" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Welcome Message</div>
            <FormField label="Heading">
              <FormInput value={headingText} onChange={setHeadingText} />
            </FormField>
            <FormField label="Subheading">
              <FormInput value={subheading} onChange={setSubheading} />
            </FormField>
          </div>

          <div className="form-section" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Pre-Chat Form</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Collect visitor info before starting the chat</div>
              </div>
              <Toggle value={preChatForm} onChange={setPreChatForm} />
            </div>
            {preChatForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[{ label: 'Name', required: true }, { label: 'Email', required: true }, { label: 'Phone', required: false }].map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <i className="fa-solid fa-grip-dots-vertical" style={{ color: 'var(--text-muted)', fontSize: 11, cursor: 'grab' }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{f.label}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: f.required ? 'rgba(47,231,116,0.1)' : 'var(--bg-surface2)', color: f.required ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>{f.required ? 'Required' : 'Optional'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-section" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Embed Code</div>
            <div style={{ position: 'relative' }}>
              <pre style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>
                {embedCode}
              </pre>
              <button onClick={() => navigator.clipboard.writeText(embedCode)} style={{ position: 'absolute', top: 8, right: 8, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                <i className="fa-solid fa-copy" /> Copy
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Paste this code before the closing {'</body>'} tag of your website.</div>
          </div>

          <SaveBar onSave={() => { setSaving(true); setTimeout(() => setSaving(false), 1200) }} saving={saving} />
        </div>
      )}

      {activeInnerTab === 'availability' && (
        <div className="form-section">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Agent Availability Mode</div>
          {['Always Online', 'Follow Business Hours', 'Custom'].map(m => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <input type="radio" name="avail" style={{ accentColor: 'var(--accent)' }} defaultChecked={m === 'Follow Business Hours'} />
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{m}</span>
            </label>
          ))}
          <SaveBar onSave={() => {}} saving={false} />
        </div>
      )}

      {activeInnerTab === 'integrations' && (
        <EmptyState icon="fa-solid fa-plug" title="No integrations connected" desc="Connect third-party integrations to enhance your web chat experience." action="Add integration" />
      )}
    </div>
  )
}

// ── WhatsApp Tab ──────────────────────────────────────────────────────────────
function WhatsAppTab() {
  const [channels, setChannels] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('channels').select('*').eq('platform', 'whatsapp').then(({ data }) => { if (data) setChannels(data) })
  }, [])

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'

  return (
    <div style={{ maxWidth: 760 }}>
      <Breadcrumb current="WhatsApp" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <SectionHeader title="WhatsApp" desc="Manage your WhatsApp Business numbers and settings" />
        <button className="btn btn-primary"><i className="fa-solid fa-plus" /> Add number</button>
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
        <i className="fa-solid fa-circle-check" style={{ color: '#25d366' }} />
        You can view all messages from your WhatsApp number in your <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Team Inbox</span>
      </div>

      {channels.length === 0 ? (
        <EmptyState
          icon="fa-brands fa-whatsapp"
          title="No WhatsApp numbers connected yet"
          desc="Connect a WhatsApp Business number to start receiving and responding to WhatsApp messages from your customers."
          action="Add number"
        />
      ) : (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>WhatsApp Number</th>
                <th>Inbox</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {channels.map(ch => (
                <tr key={ch.id}>
                  <td className="primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }} />
                    {ch.external_id}
                  </td>
                  <td>{ch.name}</td>
                  <td><span className="pill green">Active</span></td>
                  <td>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}><i className="fa-solid fa-gear" /> Configure</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Webhook setup */}
      <div className="form-section" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Webhook Configuration</div>
        <FormField label="Webhook URL">
          <div style={{ display: 'flex', gap: 8 }}>
            <code style={{ flex: 1, fontSize: 12, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', display: 'block', wordBreak: 'break-all' }}>{origin}/api/webhooks/whatsapp</code>
            <button className="btn btn-secondary" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => navigator.clipboard.writeText(`${origin}/api/webhooks/whatsapp`)}>
              <i className="fa-solid fa-copy" />
            </button>
          </div>
        </FormField>
        <FormField label="Verify Token">
          <div style={{ display: 'flex', gap: 8 }}>
            <code style={{ flex: 1, fontSize: 12, color: 'var(--accent3)', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}>omnichannel_meta_verify_2024</code>
            <button className="btn btn-secondary" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => navigator.clipboard.writeText('omnichannel_meta_verify_2024')}>
              <i className="fa-solid fa-copy" />
            </button>
          </div>
        </FormField>
      </div>
    </div>
  )
}

// ── SMS Tab ───────────────────────────────────────────────────────────────────
function SMSTab() {
  return (
    <div style={{ maxWidth: 760 }}>
      <Breadcrumb current="SMS" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <SectionHeader title="SMS" desc="Manage your SMS numbers and providers" />
        <button className="btn btn-primary"><i className="fa-solid fa-plus" /> Add number</button>
      </div>
      <EmptyState icon="fa-solid fa-sms" title="No SMS numbers connected" desc="Add a number to start sending and receiving SMS messages." action="Add number" />
      <div className="form-section" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Opt-out Settings</div>
        <FormField label="Opt-out Keywords" hint="Default: STOP, UNSUBSCRIBE, CANCEL, QUIT">
          <FormInput value="STOP, UNSUBSCRIBE, CANCEL, QUIT" />
        </FormField>
        <FormField label="Opt-out Reply">
          <textarea className="form-input" rows={2} defaultValue="You have been unsubscribed and will no longer receive messages." style={{ resize: 'vertical' }} />
        </FormField>
        <FormField label="Opt-in Keywords" hint="Default: START, YES, SUBSCRIBE">
          <FormInput value="START, YES, SUBSCRIBE" />
        </FormField>
        <SaveBar onSave={() => {}} saving={false} />
      </div>
    </div>
  )
}

// ── Email Tab ─────────────────────────────────────────────────────────────────
function EmailTab() {
  const [tab, setTab] = useState<'mailboxes' | 'dkim' | 'templates'>('mailboxes')
  return (
    <div style={{ maxWidth: 760 }}>
      <Breadcrumb current="Support Email" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <SectionHeader title="Support Email" desc="Integrate support mailboxes, configure DKIM, and more" />
        <button className="btn btn-primary"><i className="fa-solid fa-plus" /> Add mailbox</button>
      </div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {(['mailboxes', 'dkim', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: tab === t ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize', transition: 'color 0.15s' }}>
            {t === 'dkim' ? 'DKIM Configuration' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'mailboxes' && <EmptyState icon="fa-solid fa-envelope" title="No mailboxes connected" desc="Connect a mailbox to start receiving support emails in your inbox." action="Add mailbox" />}
      {tab === 'dkim' && (
        <div className="form-section">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Add these DNS records to your domain to improve email deliverability and prevent your emails from being marked as spam.</div>
          {[{ type: 'TXT', host: '@', label: 'SPF', value: 'v=spf1 include:sendgrid.net ~all' }, { type: 'CNAME', host: 's1._domainkey', label: 'DKIM', value: 's1.domainkey.example.sendgrid.net' }, { type: 'TXT', host: '_dmarc', label: 'DMARC', value: 'v=DMARC1; p=none; rua=mailto:reports@example.com' }].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
              <span className="pill blue" style={{ fontSize: 10, flexShrink: 0 }}>{r.type}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{r.label} — {r.host}</div>
                <code style={{ fontSize: 11, color: 'var(--accent)', wordBreak: 'break-all' }}>{r.value}</code>
              </div>
              <span className="pill amber" style={{ fontSize: 10, flexShrink: 0 }}>⏳ Pending</span>
              <button className="icon-btn" onClick={() => navigator.clipboard.writeText(r.value)}><i className="fa-solid fa-copy" /></button>
            </div>
          ))}
          <button className="btn btn-primary" style={{ marginTop: 8 }}>Verify DNS Records</button>
        </div>
      )}
      {tab === 'templates' && (
        <div className="form-section">
          <FormField label="Reply Signature">
            <textarea className="form-input" rows={4} defaultValue="Best regards,&#10;{{agent.name}}&#10;{{workspace.name}}" style={{ resize: 'vertical' }} />
          </FormField>
          <SaveBar onSave={() => {}} saving={false} />
        </div>
      )}
    </div>
  )
}

// ── Generic placeholder for other channels ────────────────────────────────────
function GenericChannelTab({ tabInfo }: { tabInfo: typeof CHANNEL_TABS[number] }) {
  return (
    <div style={{ maxWidth: 640 }}>
      <Breadcrumb current={tabInfo.label} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <SectionHeader title={tabInfo.label} />
        <button className="btn btn-primary"><i className="fa-solid fa-plus" /> Connect</button>
      </div>
      <EmptyState
        icon={tabInfo.icon}
        title={`No ${tabInfo.label} accounts connected`}
        desc={`Connect your ${tabInfo.label} account to manage conversations from one place.`}
        action="Connect account"
      />
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ChannelsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams?.get('tab') ?? 'web-chat'

  const setTab = (t: string) => router.push(`/settings/channels?tab=${t}`)

  const activeTab = CHANNEL_TABS.find(t => t.id === tab) ?? CHANNEL_TABS[0]

  return (
    <SettingsShell>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Channel sub-nav */}
        <div style={{ width: 220, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, padding: '12px 0' }}>
          <div style={{ padding: '4px 14px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Channels</div>
          {CHANNEL_TABS.map(t => {
            const isActive = t.id === tab
            return (
              <div key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, background: isActive ? 'var(--accent-glow)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400, fontSize: 12.5, transition: 'all 0.15s', borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <i className={t.icon} style={{ fontSize: 13, color: isActive ? 'var(--accent)' : t.color, width: 16 }} />
                {t.label}
                {t.id === 'whatsapp' && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#25d366' }} />}
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {tab === 'web-chat'   && <WebChatTab />}
          {tab === 'whatsapp'   && <WhatsAppTab />}
          {tab === 'sms'        && <SMSTab />}
          {tab === 'email'      && <EmailTab />}
          {!['web-chat','whatsapp','sms','email'].includes(tab) && <GenericChannelTab tabInfo={activeTab} />}
        </div>
      </div>
    </SettingsShell>
  )
}
