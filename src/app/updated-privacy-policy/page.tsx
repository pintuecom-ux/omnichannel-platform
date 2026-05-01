'use client'
import { useState } from 'react'
import Link from 'next/link'

const SECTIONS = [
  { id: 'overview',      label: 'Overview',                   icon: 'fa-solid fa-eye' },
  { id: 'collect',       label: 'What We Collect',            icon: 'fa-solid fa-database' },
  { id: 'use',           label: 'How We Use Data',            icon: 'fa-solid fa-gears' },
  { id: 'share',         label: 'Data Sharing',               icon: 'fa-solid fa-share-nodes' },
  { id: 'retention',     label: 'Retention & Storage',        icon: 'fa-solid fa-clock' },
  { id: 'security',      label: 'Security',                   icon: 'fa-solid fa-shield-halved' },
  { id: 'rights',        label: 'Your Rights',                icon: 'fa-solid fa-scale-balanced' },
  { id: 'cookies',       label: 'Cookies',                    icon: 'fa-solid fa-cookie-bite' },
  { id: 'children',      label: 'Children\'s Privacy',        icon: 'fa-solid fa-child' },
  { id: 'contact',       label: 'Contact & DPO',              icon: 'fa-solid fa-envelope' },
]

export default function PrivacyPolicyPage() {
  const [active, setActive] = useState('overview')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg-base: #0a0e14; --bg-panel: #141920; --bg-surface: #1a2030;
          --bg-surface2: #1e2535; --bg-hover: #222b3a;
          --accent: #25d366; --accent-dim: #1aab54; --accent-glow: rgba(37,211,102,0.10);
          --text-primary: #e8edf5; --text-secondary: #8a9ab8; --text-muted: #506080;
          --border: rgba(255,255,255,0.06); --border-active: rgba(37,211,102,0.3);
        }
        html, body { overflow: auto !important; font-family: 'DM Sans', sans-serif; background: var(--bg-base); color: var(--text-primary); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 4px; }

        .pp-wrap { display: flex; min-height: 100vh; }

        /* ── Left Nav ── */
        .pp-nav {
          width: 240px; min-width: 240px; position: sticky; top: 0; height: 100vh;
          background: var(--bg-panel); border-right: 1px solid var(--border);
          padding: 28px 0; display: flex; flex-direction: column; overflow-y: auto;
        }
        .pp-nav-logo { padding: 0 20px 24px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
        .pp-nav-logo-mark { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .pp-nav-logo-icon { width: 32px; height: 32px; background: var(--accent-glow); border: 1px solid var(--border-active); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 0.5px; }
        .pp-nav-logo-name { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .pp-nav-label { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; color: var(--text-muted); padding: 0 20px 8px; text-transform: uppercase; }
        .pp-nav-item {
          display: flex; align-items: center; gap: 10px; padding: 9px 20px;
          font-size: 12.5px; color: var(--text-secondary); cursor: pointer;
          border-left: 2px solid transparent; transition: all 0.15s;
        }
        .pp-nav-item:hover { color: var(--text-primary); background: var(--bg-hover); }
        .pp-nav-item.active { color: var(--accent); border-left-color: var(--accent); background: var(--accent-glow); font-weight: 500; }
        .pp-nav-item i { width: 16px; text-align: center; font-size: 12px; }
        .pp-nav-footer { margin-top: auto; padding: 16px 20px 0; border-top: 1px solid var(--border); }
        .pp-nav-footer a { font-size: 11px; color: var(--text-muted); text-decoration: none; display: flex; align-items: center; gap: 6px; padding: 6px 0; transition: color 0.15s; }
        .pp-nav-footer a:hover { color: var(--accent); }

        /* ── Main Content ── */
        .pp-main { flex: 1; padding: 48px 56px; max-width: 860px; overflow-y: auto; }
        .pp-hero { margin-bottom: 48px; }
        .pp-hero-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--accent); background: var(--accent-glow); border: 1px solid var(--border-active); border-radius: 20px; padding: 4px 12px; margin-bottom: 16px; }
        .pp-hero h1 { font-family: 'Space Grotesk', sans-serif; font-size: 36px; font-weight: 600; line-height: 1.2; color: var(--text-primary); margin-bottom: 12px; }
        .pp-hero-meta { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .pp-hero-meta span { display: flex; align-items: center; gap: 6px; }

        /* ── Section Card ── */
        .pp-section { margin-bottom: 40px; scroll-margin-top: 32px; }
        .pp-section-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
        .pp-section-icon { width: 36px; height: 36px; background: var(--accent-glow); border: 1px solid var(--border-active); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--accent); font-size: 14px; flex-shrink: 0; }
        .pp-section-head h2 { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 600; color: var(--text-primary); }
        .pp-body { font-size: 13.5px; line-height: 1.85; color: var(--text-secondary); }
        .pp-body p { margin-bottom: 14px; }
        .pp-body p:last-child { margin-bottom: 0; }
        .pp-body strong { color: var(--text-primary); font-weight: 500; }
        .pp-body a { color: var(--accent); text-decoration: none; }
        .pp-body a:hover { text-decoration: underline; }

        /* ── Data Table ── */
        .pp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 16px 0; }
        .pp-table th { text-align: left; padding: 9px 14px; background: var(--bg-surface); color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid var(--border); }
        .pp-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); color: var(--text-secondary); vertical-align: top; line-height: 1.6; }
        .pp-table tr:last-child td { border-bottom: none; }
        .pp-table tr:hover td { background: var(--bg-surface); }

        /* ── Pill / Chip ── */
        .chip { display: inline-flex; align-items: center; gap: 5px; background: var(--bg-surface2); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; font-size: 11px; color: var(--text-secondary); margin: 3px 3px 3px 0; }
        .chip.green { border-color: var(--border-active); color: var(--accent); background: var(--accent-glow); }
        .chip.amber { border-color: rgba(245,158,11,0.3); color: #f59e0b; background: rgba(245,158,11,0.08); }

        /* ── Rights Grid ── */
        .rights-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
        .right-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .right-card-icon { font-size: 18px; color: var(--accent); margin-bottom: 8px; }
        .right-card-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 5px; }
        .right-card-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }

        /* ── Alert Box ── */
        .pp-alert { display: flex; gap: 12px; padding: 16px; background: rgba(37,211,102,0.05); border: 1px solid var(--border-active); border-radius: 12px; margin: 16px 0; }
        .pp-alert i { color: var(--accent); font-size: 14px; flex-shrink: 0; margin-top: 2px; }
        .pp-alert-body { font-size: 12.5px; line-height: 1.7; color: var(--text-secondary); }
        .pp-alert-body strong { color: var(--text-primary); }

        .pp-alert.amber { background: rgba(245,158,11,0.05); border-color: rgba(245,158,11,0.25); }
        .pp-alert.amber i { color: #f59e0b; }

        @media (max-width: 768px) {
          .pp-nav { display: none; }
          .pp-main { padding: 28px 20px; }
          .pp-hero h1 { font-size: 26px; }
          .rights-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="pp-wrap">
        {/* ── Left Navigation ── */}
        <nav className="pp-nav">
          <div className="pp-nav-logo">
            <Link href="/" className="pp-nav-logo-mark">
              <div className="pp-nav-logo-icon">RC</div>
              <span className="pp-nav-logo-name">React Commerce</span>
            </Link>
          </div>
          <div className="pp-nav-label">Sections</div>
          {SECTIONS.map(s => (
            <div
              key={s.id}
              className={`pp-nav-item ${active === s.id ? 'active' : ''}`}
              onClick={() => {
                setActive(s.id)
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <i className={s.icon} />
              {s.label}
            </div>
          ))}
          <div className="pp-nav-footer">
            <Link href="/data-deletion-policy"><i className="fa-solid fa-trash-can" /> Data Deletion Policy</Link>
            <Link href="/settings/admin"><i className="fa-solid fa-arrow-left" /> Back to Settings</Link>
          </div>
        </nav>

        {/* ── Main Content ── */}
        <main className="pp-main">
          <div className="pp-hero">
            <div className="pp-hero-badge"><i className="fa-solid fa-shield-halved" /> Privacy Policy</div>
            <h1>How We Handle Your Data</h1>
            <div className="pp-hero-meta">
              <span><i className="fa-regular fa-calendar" /> Effective: 1 April 2026</span>
              <span><i className="fa-regular fa-clock" /> Last updated: 21 April 2026</span>
              <span><i className="fa-solid fa-flag" /> Applies to: React Commerce Platform</span>
            </div>
          </div>

          {/* ── 1. Overview ── */}
          <div className="pp-section" id="section-overview">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-eye" /></div>
              <h2>Overview</h2>
            </div>
            <div className="pp-body">
              <p>React Commerce ("we", "us", "our") is an omnichannel business messaging platform that enables companies to manage customer conversations across WhatsApp, Facebook Messenger, Instagram DMs, and other channels from a single unified inbox.</p>
              <p>This Privacy Policy explains what personal data we collect, why we collect it, how we use and protect it, and the rights you have over your information. It applies to all users of our platform, website, and related services.</p>
              <p>We act as a <strong>Data Controller</strong> for account and usage data, and as a <strong>Data Processor</strong> when handling conversation data on behalf of our customers. In both cases, we are committed to protecting your privacy in accordance with applicable data protection laws including GDPR, UK GDPR, India's DPDP Act 2023, and CCPA.</p>
              <div className="pp-alert">
                <i className="fa-solid fa-circle-info" />
                <div className="pp-alert-body">
                  <strong>Key Principle:</strong> We collect only what we need, use it only for stated purposes, and never sell your personal data to third parties for advertising or commercial gain.
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. What We Collect ── */}
          <div className="pp-section" id="section-collect">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-database" /></div>
              <h2>What We Collect</h2>
            </div>
            <div className="pp-body">
              <p>We collect data in two ways: directly from you during registration and use, and automatically as you interact with our platform.</p>
              <table className="pp-table">
                <thead>
                  <tr><th>Category</th><th>Examples</th><th>How Collected</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Account Identity', 'Full name, email address, profile picture', 'Registration form, OAuth (Google)'],
                    ['Authentication', 'Encrypted password hash, session tokens', 'Account creation, login'],
                    ['Workspace Data', 'Workspace name, timezone, billing address', 'Onboarding setup'],
                    ['Channel Credentials', 'WhatsApp Phone Number ID, Facebook Page tokens (encrypted)', 'Channel setup wizard'],
                    ['Contact Data', 'Customer names, phone numbers, tags you import', 'CSV import, live conversations'],
                    ['Conversation Content', 'Message text, media, timestamps (on your behalf)', 'Incoming/outgoing messages'],
                    ['Usage & Analytics', 'Feature usage, page views, click events', 'Automatically via Supabase / logs'],
                    ['Device & Technical', 'IP address, browser type, OS, referrer URL', 'Automatically on site visit'],
                    ['Billing Information', 'Plan tier (payment processed externally by Stripe/Razorpay)', 'Subscription selection'],
                  ].map(([cat, ex, how]) => (
                    <tr key={cat}><td><strong>{cat}</strong></td><td>{ex}</td><td>{how}</td></tr>
                  ))}
                </tbody>
              </table>
              <p>We do <strong>not</strong> collect sensitive personal data such as health information, racial or ethnic origin, political opinions, religious beliefs, or biometric data.</p>
            </div>
          </div>

          {/* ── 3. How We Use Data ── */}
          <div className="pp-section" id="section-use">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-gears" /></div>
              <h2>How We Use Your Data</h2>
            </div>
            <div className="pp-body">
              <table className="pp-table">
                <thead>
                  <tr><th>Purpose</th><th>Legal Basis</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Provide, operate, and improve the platform', 'Contract performance'],
                    ['Authenticate your identity and maintain session security', 'Contract performance / Legitimate interest'],
                    ['Process API calls to WhatsApp, Meta, and other channel providers', 'Contract performance'],
                    ['Send transactional emails (password reset, billing alerts)', 'Contract performance'],
                    ['Detect fraud, abuse, and security incidents', 'Legitimate interest'],
                    ['Comply with legal obligations and respond to lawful requests', 'Legal obligation'],
                    ['Aggregate analytics for platform improvement (anonymised)', 'Legitimate interest'],
                    ['Send product update newsletters (opt-in)', 'Consent'],
                  ].map(([p, b]) => (
                    <tr key={p}><td>{p}</td><td><span className={b.includes('Contract') ? 'chip green' : b === 'Consent' ? 'chip amber' : 'chip'}>{b}</span></td></tr>
                  ))}
                </tbody>
              </table>
              <p>We do <strong>not</strong> use your data for targeted advertising, profiling, or any purpose not listed above without your explicit consent.</p>
            </div>
          </div>

          {/* ── 4. Data Sharing ── */}
          <div className="pp-section" id="section-share">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-share-nodes" /></div>
              <h2>Data Sharing</h2>
            </div>
            <div className="pp-body">
              <p>We do not sell your data. We share it only in the following limited circumstances:</p>
              <table className="pp-table">
                <thead>
                  <tr><th>Recipient</th><th>Purpose</th><th>Safeguard</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Supabase (US)', 'Database hosting, auth, real-time subscriptions', 'DPA, SOC 2 Type II'],
                    ['Meta (WhatsApp/Instagram/Facebook APIs)', 'Deliver & receive messages on connected channels', 'Meta Business API Terms'],
                    ['Vercel (US)', 'Application hosting & edge delivery', 'DPA, SOC 2'],
                    ['Upstash / Redis', 'Job queue for message delivery (BullMQ)', 'DPA, encryption at rest'],
                    ['Stripe / Razorpay', 'Payment processing (we never store card data)', 'PCI-DSS Level 1'],
                    ['Law enforcement / courts', 'Response to legally binding requests only', 'Minimum necessary disclosure'],
                  ].map(([r, p, s]) => (
                    <tr key={r}><td><strong>{r}</strong></td><td>{p}</td><td><span className="chip">{s}</span></td></tr>
                  ))}
                </tbody>
              </table>
              <div className="pp-alert amber">
                <i className="fa-solid fa-triangle-exclamation" />
                <div className="pp-alert-body">
                  When you connect a messaging channel (e.g., WhatsApp), messages are routed through the respective platform's API. Those platforms have their own privacy policies. We do not control how Meta processes data within their infrastructure.
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. Retention ── */}
          <div className="pp-section" id="section-retention">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-clock" /></div>
              <h2>Retention & Storage</h2>
            </div>
            <div className="pp-body">
              <table className="pp-table">
                <thead>
                  <tr><th>Data Type</th><th>Retention Period</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Account & profile data', 'Duration of account + 30 days after deletion request is actioned'],
                    ['Conversation & message history', 'Duration of account + 30 days'],
                    ['Contact database', 'Duration of account + 30 days'],
                    ['Server & access logs', '90 days rolling, then auto-purged'],
                    ['Billing & invoice records', '7 years (legal / tax obligation)'],
                    ['Deleted account data', 'Queued for purge within 15 working days of confirmed deletion'],
                    ['Anonymised analytics', 'Indefinite (no personal identifiers retained)'],
                  ].map(([d, r]) => (
                    <tr key={d}><td><strong>{d}</strong></td><td>{r}</td></tr>
                  ))}
                </tbody>
              </table>
              <p>Data is stored on Supabase servers. You can request complete data deletion at any time — see our <Link href="/data-deletion">Data Deletion Policy</Link> for exact steps.</p>
            </div>
          </div>

          {/* ── 6. Security ── */}
          <div className="pp-section" id="section-security">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-shield-halved" /></div>
              <h2>Security</h2>
            </div>
            <div className="pp-body">
              <p>We implement industry-standard technical and organisational measures to protect your data:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
                {['TLS 1.3 in transit', 'AES-256 at rest', 'Row-level security (Supabase RLS)', 'Bcrypt password hashing', 'JWT session tokens', 'API key encryption', 'Webhook signature verification', 'Access control by workspace', 'Regular dependency audits'].map(f => (
                  <span key={f} className="chip green"><i className="fa-solid fa-check" style={{ fontSize: 10 }} />{f}</span>
                ))}
              </div>
              <p>Despite these measures, no system is 100% immune to breach. In the event of a data breach that poses significant risk to your rights, we will notify affected users within 72 hours of discovery, in line with GDPR Article 33.</p>
            </div>
          </div>

          {/* ── 7. Your Rights ── */}
          <div className="pp-section" id="section-rights">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-scale-balanced" /></div>
              <h2>Your Rights</h2>
            </div>
            <div className="pp-body">
              <p>Depending on your jurisdiction, you have the following rights over your personal data:</p>
              <div className="rights-grid">
                {[
                  { icon: 'fa-solid fa-eye', title: 'Right of Access', desc: 'Request a copy of all personal data we hold about you.' },
                  { icon: 'fa-solid fa-pen', title: 'Right to Rectification', desc: 'Correct inaccurate or incomplete personal data.' },
                  { icon: 'fa-solid fa-trash-can', title: 'Right to Erasure', desc: 'Request complete deletion of your account and data ("right to be forgotten").' },
                  { icon: 'fa-solid fa-hand', title: 'Right to Restrict', desc: 'Ask us to pause processing while a dispute is resolved.' },
                  { icon: 'fa-solid fa-file-export', title: 'Right to Portability', desc: 'Export your data in a machine-readable format (JSON/CSV).' },
                  { icon: 'fa-solid fa-ban', title: 'Right to Object', desc: 'Object to processing based on legitimate interest, including direct marketing.' },
                  { icon: 'fa-solid fa-robot', title: 'Automated Decisions', desc: 'Not to be subject to solely automated decisions that significantly affect you.' },
                  { icon: 'fa-solid fa-xmark', title: 'Withdraw Consent', desc: 'Withdraw consent at any time without affecting prior lawful processing.' },
                ].map(r => (
                  <div key={r.title} className="right-card">
                    <div className="right-card-icon"><i className={r.icon} /></div>
                    <div className="right-card-title">{r.title}</div>
                    <div className="right-card-desc">{r.desc}</div>
                  </div>
                ))}
              </div>
              <p>To exercise any of these rights, email <strong>privacy@reactcommerce.app</strong> or use the <Link href="/data-deletion">Data Deletion Request</Link> form. We respond within 30 days. You may also lodge a complaint with your local data protection authority.</p>
            </div>
          </div>

          {/* ── 8. Cookies ── */}
          <div className="pp-section" id="section-cookies">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-cookie-bite" /></div>
              <h2>Cookies</h2>
            </div>
            <div className="pp-body">
              <table className="pp-table">
                <thead>
                  <tr><th>Cookie</th><th>Type</th><th>Purpose</th><th>Duration</th></tr>
                </thead>
                <tbody>
                  {[
                    ['sb-auth-token', 'Essential', 'Supabase authentication session', 'Session'],
                    ['rc-theme', 'Preference', 'Stores dark/light mode preference', '1 year'],
                    ['_vercel_analytics', 'Analytics', 'Anonymised page views (no PII)', '30 days'],
                  ].map(([name, type, purpose, dur]) => (
                    <tr key={name}>
                      <td><code style={{ fontSize: 11, color: 'var(--accent)' }}>{name}</code></td>
                      <td><span className={type === 'Essential' ? 'chip green' : 'chip'}>{type}</span></td>
                      <td>{purpose}</td>
                      <td>{dur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>We do not use third-party advertising cookies. Essential cookies cannot be disabled as they are required for the platform to function.</p>
            </div>
          </div>

          {/* ── 9. Children ── */}
          <div className="pp-section" id="section-children">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-child" /></div>
              <h2>Children's Privacy</h2>
            </div>
            <div className="pp-body">
              <p>React Commerce is a B2B business messaging platform intended for use by individuals aged <strong>18 and over</strong>. We do not knowingly collect personal data from anyone under 18 years of age.</p>
              <p>If you believe a minor has created an account or provided us personal data, please contact <strong>privacy@reactcommerce.app</strong> immediately. We will promptly deactivate the account and delete the associated data.</p>
            </div>
          </div>

          {/* ── 10. Contact ── */}
          <div className="pp-section" id="section-contact">
            <div className="pp-section-head">
              <div className="pp-section-icon"><i className="fa-solid fa-envelope" /></div>
              <h2>Contact & DPO</h2>
            </div>
            <div className="pp-body">
              <p>For all privacy-related enquiries, rights requests, or concerns, contact our Data Protection Officer:</p>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginTop: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>React Commerce — Privacy Team</div>
                {[
                  ['Email', 'privacy@reactcommerce.app', 'fa-solid fa-envelope'],
                  ['Data Deletion', '/data-deletion', 'fa-solid fa-trash-can'],
                  ['Response Time', 'Within 30 calendar days', 'fa-solid fa-clock'],
                ].map(([label, value, icon]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <i className={icon} style={{ color: 'var(--accent)', width: 16 }} />
                    <span style={{ color: 'var(--text-muted)', minWidth: 100 }}>{label}:</span>
                    {value.startsWith('/') ? <Link href={value} style={{ color: 'var(--accent)' }}>{value}</Link> : <span>{value}</span>}
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 16 }}>We may update this policy from time to time. Material changes will be communicated via email and in-app notification. Your continued use of the platform following any update constitutes acceptance of the revised policy.</p>
            </div>
          </div>

        </main>
      </div>
    </>
  )
}
