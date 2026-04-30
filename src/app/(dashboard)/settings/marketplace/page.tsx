'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SettingsShell from '@/components/settings/SettingsShell'

function Breadcrumb({ leaf }: { leaf: string }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => router.push('/settings/admin')}>Admin Settings</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Marketplace</span>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
      <span style={{ color: 'var(--text-primary)' }}>{leaf}</span>
    </div>
  )
}

// ── Marketplace Apps ──────────────────────────────────────────────────────────
const APPS = [
  { id: 1, name: 'Shopify', icon: '🛍️', desc: 'Show order history and cart details inside conversations', category: 'E-Commerce', rating: 4.8, reviews: 234, installed: true },
  { id: 2, name: 'Stripe', icon: '💳', desc: 'View subscription and payment history for contacts', category: 'CRM', rating: 4.7, reviews: 189, installed: false },
  { id: 3, name: 'HubSpot', icon: '🧲', desc: 'Sync contacts, deals and pipeline data with HubSpot', category: 'CRM', rating: 4.6, reviews: 312, installed: false },
  { id: 4, name: 'Jira', icon: '🎯', desc: 'Link Jira tickets to conversations and track issues', category: 'Productivity', rating: 4.5, reviews: 156, installed: true },
  { id: 5, name: 'Salesforce', icon: '☁️', desc: 'Sync leads, opportunities and accounts from Salesforce', category: 'CRM', rating: 4.4, reviews: 278, installed: false },
  { id: 6, name: 'Google Analytics', icon: '📊', desc: 'Track chat widget engagement in Google Analytics', category: 'Analytics', rating: 4.3, reviews: 98, installed: false },
  { id: 7, name: 'Zoom', icon: '🎥', desc: 'Schedule and join Zoom calls directly from conversations', category: 'Communication', rating: 4.6, reviews: 145, installed: false },
  { id: 8, name: 'Calendly', icon: '📅', desc: 'Share booking links and schedule meetings seamlessly', category: 'Productivity', rating: 4.7, reviews: 203, installed: false },
  { id: 9, name: 'WooCommerce', icon: '🛒', desc: 'Bring WooCommerce order data into your conversations', category: 'E-Commerce', rating: 4.3, reviews: 87, installed: false },
]

const CATEGORIES = ['All', 'CRM', 'E-Commerce', 'Analytics', 'Productivity', 'Communication']

function MarketplaceTab() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [installed, setInstalled] = useState<Set<number>>(new Set(APPS.filter(a => a.installed).map(a => a.id)))

  const filtered = APPS.filter(a =>
    (activeCategory === 'All' || a.category === activeCategory) &&
    (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ maxWidth: 860 }}>
      <Breadcrumb leaf="Marketplace Apps" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Marketplace Apps</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Connect powerful apps and integrations to supercharge your workflow</div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '0 14px', height: 40, maxWidth: 380, marginBottom: 16 }}>
        <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)', fontSize: 13 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search apps..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }} />
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${activeCategory === cat ? 'var(--border-active)' : 'var(--border)'}`, background: activeCategory === cat ? 'var(--accent-glow)' : 'var(--bg-surface)', color: activeCategory === cat ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: activeCategory === cat ? 700 : 500, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* App grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {filtered.map(app => (
          <div key={app.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(47,231,116,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{app.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{app.name}</div>
                <span className="pill blue" style={{ fontSize: 10 }}>{app.category}</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{app.desc}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {'★★★★★'.split('').slice(0, Math.floor(app.rating)).map((s, i) => <span key={i} style={{ color: '#f59e0b', fontSize: 11 }}>{s}</span>)}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>{app.rating} ({app.reviews})</span>
              </div>
              {installed.has(app.id) ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }}><i className="fa-solid fa-gear" /> Settings</button>
                  <button onClick={() => setInstalled(prev => { const s = new Set(prev); s.delete(app.id); return s })} style={{ fontSize: 11, padding: '5px 10px', background: 'none', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, color: '#e84040', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Remove</button>
                </div>
              ) : (
                <button onClick={() => setInstalled(prev => new Set([...prev, app.id]))} className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}>Install</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tracking Code ─────────────────────────────────────────────────────────────
function TrackingCodeTab() {
  const [testURL, setTestURL] = useState('')
  const [testResult, setTestResult] = useState<null | 'success' | 'fail'>(null)

  const trackingCode = `<script>
  window.platformSettings = { appId: "YOUR_APP_ID_HERE" };
  (function(d, s) {
    var f = d.getElementsByTagName(s)[0],
        j = d.createElement(s);
    j.async = true;
    j.src = "https://cdn.yourplatform.com/widget.js";
    f.parentNode.insertBefore(j, f);
  })(document, "script");
</script>`

  return (
    <div style={{ maxWidth: 660 }}>
      <Breadcrumb leaf="CRM Tracking Code" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>CRM Tracking Code</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Install this script on your website to enable live chat, event tracking, and contact identification</div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(47,231,116,0.06)', border: '1px solid rgba(47,231,116,0.2)', borderRadius: 10, marginBottom: 20 }}>
        <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent)', fontSize: 16 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>✅ Active — Detected on your-app.vercel.app</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last detected: 2 minutes ago</div>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>Check again</button>
      </div>

      {/* Code */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Your Tracking Code</div>
        <div style={{ position: 'relative' }}>
          <pre style={{ fontSize: 11.5, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'pre', lineHeight: 1.7, margin: 0, fontFamily: "'Fira Code', monospace" }}>
            {trackingCode}
          </pre>
          <button onClick={() => navigator.clipboard.writeText(trackingCode)} className="btn btn-secondary" style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, padding: '5px 10px' }}>
            <i className="fa-solid fa-copy" /> Copy
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Paste this code before the closing {'</body>'} tag of every page.</div>
      </div>

      {/* Installation guides */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Installation Guides</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Standard HTML', icon: 'fa-brands fa-html5', color: '#e34f26' },
            { label: 'WordPress', icon: 'fa-brands fa-wordpress', color: '#21759b' },
            { label: 'Shopify', icon: 'fa-brands fa-shopify', color: '#96bf48' },
            { label: 'Webflow', icon: 'fa-solid fa-globe', color: '#4353ff' },
            { label: 'React / Next.js', icon: 'fa-brands fa-react', color: '#61dafb' },
            { label: 'Google Tag Manager', icon: 'fa-brands fa-google', color: '#4285f4' },
          ].map(guide => (
            <div key={guide.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(47,231,116,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <i className={guide.icon} style={{ color: guide.color, fontSize: 16, width: 20 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', flex: 1 }}>{guide.label}</span>
              <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-muted)', fontSize: 10 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Test installation */}
      <div className="form-section">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Test Installation</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="https://yourwebsite.com" value={testURL} onChange={e => setTestURL(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={() => setTestResult(Math.random() > 0.3 ? 'success' : 'fail')}>Test</button>
        </div>
        {testResult === 'success' && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(47,231,116,0.06)', border: '1px solid rgba(47,231,116,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', display: 'flex', gap: 7, alignItems: 'center' }}>
            <i className="fa-solid fa-circle-check" />✅ Tracking code found! Your widget is installed correctly.
          </div>
        )}
        {testResult === 'fail' && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(232,64,64,0.06)', border: '1px solid rgba(232,64,64,0.2)', borderRadius: 8, fontSize: 12, color: '#e84040', display: 'flex', gap: 7, alignItems: 'center' }}>
            <i className="fa-solid fa-circle-xmark" />❌ Tracking code not found. Check our installation guide.
          </div>
        )}
      </div>
    </div>
  )
}

// ── API Settings ──────────────────────────────────────────────────────────────
function APITab() {
  const [showKey, setShowKey] = useState(false)
  const [innerTab, setInnerTab] = useState<'keys' | 'webhooks' | 'oauth'>('keys')
  const [ipWhitelist, setIpWhitelist] = useState(false)
  const [webhooks, setWebhooks] = useState([
    { id: 1, url: 'https://hooks.zapier.com/hooks/catch/1234567', events: ['conversation.created', 'message.received'], status: 'active' as const },
  ])
  const [showWebhookForm, setShowWebhookForm] = useState(false)
  const [newWebhookURL, setNewWebhookURL] = useState('')

  return (
    <div style={{ maxWidth: 680 }}>
      <Breadcrumb leaf="API Settings" />
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>API Settings</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Manage API keys, configure webhooks, and access developer documentation</div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {(['keys', 'webhooks', 'oauth'] as const).map(t => (
          <button key={t} onClick={() => setInnerTab(t)} style={{ padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: innerTab === t ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: innerTab === t ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, fontFamily: 'DM Sans, sans-serif', transition: 'color 0.15s', textTransform: 'capitalize' }}>
            {t === 'keys' ? 'API Keys' : t === 'oauth' ? 'OAuth Apps' : 'Webhooks'}
          </button>
        ))}
      </div>

      {innerTab === 'keys' && (
        <div>
          <div className="form-section" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Your API Key</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABCxyzDemo123456789
              <button className="icon-btn" onClick={() => setShowKey(!showKey)} title={showKey ? 'Hide' : 'Show'}><i className={`fa-solid ${showKey ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
              <button className="icon-btn" onClick={() => navigator.clipboard.writeText('sk_live_a1b2c3d4e5f6')} title="Copy"><i className="fa-solid fa-copy" /></button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <a style={{ fontSize: 12, color: '#e84040', cursor: 'pointer' }}><i className="fa-solid fa-rotate" style={{ marginRight: 5 }} />Regenerate API key</a>
              <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>
              <a style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}><i className="fa-solid fa-book" style={{ marginRight: 5 }} />API documentation →</a>
            </div>
          </div>

          <div className="form-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ipWhitelist ? 12 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>IP Whitelisting</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Restrict API access to specific IP addresses or ranges</div>
              </div>
              <div onClick={() => setIpWhitelist(!ipWhitelist)} style={{ width: 36, height: 20, borderRadius: 10, background: ipWhitelist ? 'var(--accent)' : 'var(--bg-surface2)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: ipWhitelist ? 18 : 2, transition: 'left 0.2s' }} />
              </div>
            </div>
            {ipWhitelist && (
              <div>
                <textarea className="form-input" rows={4} placeholder="One IP address or CIDR range per line&#10;e.g. 192.168.1.1&#10;10.0.0.0/8" style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
                <button className="btn btn-primary" style={{ marginTop: 10, fontSize: 12 }}>Save</button>
              </div>
            )}
          </div>
        </div>
      )}

      {innerTab === 'webhooks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowWebhookForm(true)}><i className="fa-solid fa-plus" /> Add webhook</button>
          </div>

          {showWebhookForm && (
            <div className="form-section" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>New Webhook</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Endpoint URL (HTTPS required)</div>
                <input className="form-input" placeholder="https://your-server.com/webhook" value={newWebhookURL} onChange={e => setNewWebhookURL(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Events to Subscribe</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {['conversation.created', 'conversation.assigned', 'conversation.resolved', 'message.received', 'contact.created', 'contact.updated'].map(event => (
                    <label key={event} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
                      <code style={{ fontSize: 11 }}>{event}</code>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowWebhookForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => { if (newWebhookURL) { setWebhooks(prev => [...prev, { id: Date.now(), url: newWebhookURL, events: ['conversation.created'], status: 'active' }]); setNewWebhookURL(''); setShowWebhookForm(false) } }}>Save Webhook</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {webhooks.map(wh => (
              <div key={wh.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)', marginBottom: 6, wordBreak: 'break-all' }}>{wh.url}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {wh.events.map(e => <code key={e} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{e}</code>)}
                    </div>
                  </div>
                  <span className="pill green" style={{ fontSize: 10, flexShrink: 0 }}>● Active</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn"><i className="fa-solid fa-pencil" /></button>
                    <button className="icon-btn"><i className="fa-solid fa-bolt" title="Test" /></button>
                    <button className="icon-btn" onClick={() => setWebhooks(prev => prev.filter(w => w.id !== wh.id))}><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {innerTab === 'oauth' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary" style={{ fontSize: 12 }}><i className="fa-solid fa-plus" /> Register new app</button>
          </div>
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <i className="fa-solid fa-key" style={{ fontSize: 32, color: 'var(--text-muted)', opacity: 0.35, display: 'block', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No OAuth apps registered</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>Register an OAuth app to allow third-party integrations to authenticate with your account.</div>
            <button className="btn btn-primary" style={{ fontSize: 12 }}><i className="fa-solid fa-plus" /> Register new app</button>
          </div>
        </div>
      )}
    </div>
  )
}

const SUB_NAV = [
  { id: 'apps',           label: 'Marketplace Apps',         icon: 'fa-solid fa-store',               group: 'Apps' },
  { id: 'conversation',   label: 'Conversation Integrations', icon: 'fa-solid fa-plug-circle-check',   group: 'Apps' },
  { id: 'mobile-app',     label: 'Mobile App',               icon: 'fa-solid fa-mobile-screen',       group: 'Apps' },
  { id: 'ecommerce',      label: 'E-Commerce Apps',          icon: 'fa-solid fa-cart-shopping',       group: 'Apps' },
  { id: 'tracking-code',  label: 'CRM Tracking Code',        icon: 'fa-solid fa-code',                group: 'Website & Tracking' },
  { id: 'code-library',   label: 'CRM Code Library',         icon: 'fa-solid fa-book-open',           group: 'Website & Tracking' },
  { id: 'api',            label: 'API Settings',             icon: 'fa-solid fa-key',                 group: 'Developer' },
]

export default function MarketplacePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams?.get('tab') ?? 'apps'
  const setTab = (t: string) => router.push(`/settings/marketplace?tab=${t}`)

  return (
    <SettingsShell>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 220, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, padding: '12px 0' }}>
          {[...new Set(SUB_NAV.map(s => s.group))].map(group => (
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
          {tab === 'apps'          && <MarketplaceTab />}
          {tab === 'tracking-code' && <TrackingCodeTab />}
          {tab === 'api'           && <APITab />}
          {!['apps','tracking-code','api'].includes(tab) && (
            <div style={{ maxWidth: 500 }}>
              <Breadcrumb leaf={SUB_NAV.find(s => s.id === tab)?.label ?? ''} />
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 20 }}>{SUB_NAV.find(s => s.id === tab)?.label}</div>
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14 }}>
                <i className={SUB_NAV.find(s => s.id === tab)?.icon ?? 'fa-solid fa-store'} style={{ fontSize: 36, color: 'var(--text-muted)', opacity: 0.35, display: 'block', marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Coming Soon</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>This section is being built out.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsShell>
  )
}
