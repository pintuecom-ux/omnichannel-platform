'use client'
import { useState } from 'react'
import Link from 'next/link'

type Step = { num: number; title: string; desc: string; icon: string; detail: string }

const STEPS: Step[] = [
  {
    num: 1,
    title: 'Log in to your account',
    icon: 'fa-solid fa-right-to-bracket',
    desc: 'Sign in at reactcommerce.app with your credentials.',
    detail: 'Go to Settings → Data & Security → Request Data Deletion. You must be authenticated to submit a deletion request. This ensures only the account owner can initiate the process.',
  },
  {
    num: 2,
    title: 'Navigate to Data Deletion',
    icon: 'fa-solid fa-sliders',
    desc: 'Open Settings, select Data & Security, then click "Request Data Deletion".',
    detail: 'In the left sidebar of the app, click the Settings (gear) icon. In the Settings sidebar, find "Data & Security" and click "Request Data Deletion" under it.',
  },
  {
    num: 3,
    title: 'Submit your deletion request',
    icon: 'fa-solid fa-paper-plane',
    desc: 'Confirm your identity and click the red "Schedule Account Deletion" button.',
    detail: 'You will be shown exactly what data will be deleted. Type your email address to confirm, then click the button. A confirmation email will be sent immediately to your registered address.',
  },
  {
    num: 4,
    title: '15-working-day grace period begins',
    icon: 'fa-solid fa-hourglass-half',
    desc: 'Your account enters a "Pending Deletion" state for 15 working days.',
    detail: 'During this window you can cancel the request at any time by logging back in. If no login is detected for 15 working days, deletion executes automatically. This protects against accidental or unauthorised deletions.',
  },
  {
    num: 5,
    title: 'Data is permanently purged',
    icon: 'fa-solid fa-trash-can',
    desc: 'All personal data is irreversibly deleted from active databases.',
    detail: 'On day 15 (if no cancellation): all messages, contacts, channel credentials, workspace data and profile info are hard-deleted from Supabase. Backups containing your data are rotated out within 30 additional days.',
  },
  {
    num: 6,
    title: 'Deletion confirmation email',
    icon: 'fa-solid fa-circle-check',
    desc: 'You receive a final confirmation email once purge is complete.',
    detail: 'The confirmation email serves as your receipt. Billing records may be retained for up to 7 years to satisfy legal / tax obligations, but will contain no personal identifiers beyond your invoice email.',
  },
]

const WHAT_DELETED = [
  { label: 'Account & profile', icon: 'fa-solid fa-user', deleted: true },
  { label: 'All workspace data', icon: 'fa-solid fa-building', deleted: true },
  { label: 'All contacts & segments', icon: 'fa-solid fa-users', deleted: true },
  { label: 'All conversations & messages', icon: 'fa-solid fa-comments', deleted: true },
  { label: 'Channel credentials & tokens', icon: 'fa-solid fa-key', deleted: true },
  { label: 'Flow automations', icon: 'fa-solid fa-diagram-project', deleted: true },
  { label: 'Templates & canned responses', icon: 'fa-solid fa-file-lines', deleted: true },
  { label: 'Team members (workspace)', icon: 'fa-solid fa-user-group', deleted: true },
  { label: 'Invoice / payment history', icon: 'fa-solid fa-file-invoice', deleted: false, note: 'Retained 7 years (tax law)' },
  { label: 'Anonymised platform analytics', icon: 'fa-solid fa-chart-bar', deleted: false, note: 'No PII — retained for product improvement' },
]

export default function DataDeletionPage() {
  const [expanded, setExpanded] = useState<number | null>(null)

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
          --danger: #ef4444; --danger-glow: rgba(239,68,68,0.08); --danger-border: rgba(239,68,68,0.3);
          --amber: #f59e0b; --amber-glow: rgba(245,158,11,0.08); --amber-border: rgba(245,158,11,0.25);
          --text-primary: #e8edf5; --text-secondary: #8a9ab8; --text-muted: #506080;
          --border: rgba(255,255,255,0.06); --border-active: rgba(37,211,102,0.3);
        }
        html, body { overflow: auto !important; font-family: 'DM Sans', sans-serif; background: var(--bg-base); color: var(--text-primary); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 4px; }

        .dd-page { max-width: 760px; margin: 0 auto; padding: 56px 32px 80px; }

        /* ── Header ── */
        .dd-back { display: inline-flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 12px; text-decoration: none; margin-bottom: 32px; transition: color 0.15s; }
        .dd-back:hover { color: var(--accent); }
        .dd-badge {margin-left: 20px; display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--danger); background: var(--danger-glow); border: 1px solid var(--danger-border); border-radius: 20px; padding: 4px 12px; margin-bottom: 16px; }
        .dd-title { font-family: 'Space Grotesk', sans-serif; font-size: 34px; font-weight: 600; line-height: 1.2; margin-bottom: 12px; }
        .dd-subtitle { font-size: 14px; color: var(--text-secondary); line-height: 1.7; max-width: 580px; margin-bottom: 36px; }

        /* ── Alert ── */
        .dd-alert { display: flex; gap: 14px; padding: 18px 20px; border-radius: 14px; margin-bottom: 36px; }
        .dd-alert.amber { background: var(--amber-glow); border: 1px solid var(--amber-border); }
        .dd-alert.red { background: var(--danger-glow); border: 1px solid var(--danger-border); }
        .dd-alert i { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
        .dd-alert.amber i { color: var(--amber); }
        .dd-alert.red i { color: var(--danger); }
        .dd-alert-body { font-size: 13px; color: var(--text-secondary); line-height: 1.75; }
        .dd-alert-body strong { color: var(--text-primary); }

        /* ── Section Headers ── */
        .dd-section-title { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; padding-top: 40px; border-top: 1px solid var(--border); }
        .dd-section-title i { color: var(--accent); font-size: 14px; }

        /* ── Steps Timeline ── */
        .steps-list { display: flex; flex-direction: column; gap: 0; }
        .step-item { display: flex; gap: 20px; position: relative; }
        .step-item:not(:last-child)::after { content: ''; position: absolute; left: 19px; top: 44px; width: 2px; bottom: -12px; background: var(--border); }
        .step-left { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
        .step-num { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-surface); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14px; color: var(--text-secondary); flex-shrink: 0; transition: all 0.2s; }
        .step-item.active .step-num { background: var(--accent-glow); border-color: var(--border-active); color: var(--accent); }
        .step-right { flex: 1; padding-bottom: 28px; }
        .step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; cursor: pointer; }
        .step-icon { color: var(--accent); font-size: 13px; width: 16px; }
        .step-header h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); flex: 1; }
        .step-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 8px; }
        .step-detail { font-size: 12.5px; color: var(--text-muted); line-height: 1.75; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-top: 8px; }
        .step-toggle { font-size: 11px; color: var(--accent); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; background: none; border: none; padding: 0; font-family: inherit; }
        .step-toggle:hover { text-decoration: underline; }

        /* ── What Gets Deleted ── */
        .deleted-grid { display: flex; flex-direction: column; gap: 6px; }
        .deleted-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; font-size: 13px; }
        .deleted-row i.item-icon { color: var(--text-muted); width: 16px; text-align: center; }
        .deleted-row .item-label { flex: 1; color: var(--text-secondary); }
        .deleted-row .item-note { font-size: 11px; color: var(--text-muted); }
        .deleted-row .status-yes { color: var(--danger); font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
        .deleted-row .status-no  { color: var(--amber);  font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; }

        /* ── Alt Methods ── */
        .alt-method { display: flex; gap: 14px; align-items: flex-start; padding: 16px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px; }
        .alt-method i { color: var(--accent); font-size: 18px; flex-shrink: 0; margin-top: 2px; }
        .alt-method-body h4 { font-size: 13.5px; font-weight: 600; margin-bottom: 4px; }
        .alt-method-body p { font-size: 12.5px; color: var(--text-secondary); line-height: 1.65; }
        .alt-method-body a { color: var(--accent); text-decoration: none; }
        .alt-method-body a:hover { text-decoration: underline; }

        /* ── CTA ── */
        .dd-cta { margin-top: 48px; padding: 32px; background: var(--danger-glow); border: 1px solid var(--danger-border); border-radius: 16px; text-align: center; }
        .dd-cta h3 { font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
        .dd-cta p { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }
        .btn-danger { display: inline-flex; align-items: center; gap: 8px; background: var(--danger); color: #fff; border: none; border-radius: 10px; padding: 12px 28px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; transition: opacity 0.15s; }
        .btn-danger:hover { opacity: 0.85; }
        .btn-ghost { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 12px 24px; font-size: 14px; cursor: pointer; text-decoration: none; margin-left: 12px; transition: all 0.15s; }
        .btn-ghost:hover { border-color: var(--border-active); color: var(--accent); }

        @media (max-width: 600px) { .dd-page { padding: 32px 16px 60px; } .dd-title { font-size: 26px; } }
      `}</style>

      <div className="dd-page">
        <Link href="/settings/admin" className="dd-back">
          <i className="fa-solid fa-arrow-left" /> Settings 
        </Link>

        <div className="dd-badge"><i className="fa-solid fa-trash-can" /> Data Deletion Policy</div>
        <h1 className="dd-title">Account & Data Deletion</h1>
        <p className="dd-subtitle">
          You have the right to permanently delete your React Commerce account and all associated data at any time — no questions asked. This page explains exactly what is deleted, what is retained (and why), and the precise steps to make it happen.
        </p>

        <div className="dd-alert amber">
          <i className="fa-solid fa-triangle-exclamation" />
          <div className="dd-alert-body">
            <strong>15-working-day grace period:</strong> After you submit a deletion request, your account enters a protected window. If you log back in during this period, the deletion is automatically cancelled. If no login occurs for 15 working days, your data is permanently and irreversibly purged.
          </div>
        </div>

        {/* ── Step-by-step ── */}
        <div className="dd-section-title">
          <i className="fa-solid fa-list-ol" />
          Step-by-Step: How to Request Deletion
        </div>

        <div className="steps-list">
          {STEPS.map((step) => (
            <div key={step.num} className={`step-item ${expanded === step.num ? 'active' : ''}`}>
              <div className="step-left">
                <div className="step-num">{step.num}</div>
              </div>
              <div className="step-right">
                <div className="step-header" onClick={() => setExpanded(expanded === step.num ? null : step.num)}>
                  <i className={`${step.icon} step-icon`} />
                  <h3>{step.title}</h3>
                  <i className={`fa-solid fa-chevron-${expanded === step.num ? 'up' : 'down'}`} style={{ fontSize: 11, color: 'var(--text-muted)' }} />
                </div>
                <div className="step-desc">{step.desc}</div>
                {expanded === step.num && <div className="step-detail">{step.detail}</div>}
                <button className="step-toggle" onClick={() => setExpanded(expanded === step.num ? null : step.num)}>
                  <i className={`fa-solid fa-chevron-${expanded === step.num ? 'up' : 'down'}`} />
                  {expanded === step.num ? 'Hide detail' : 'Show detail'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── What gets deleted ── */}
        <div className="dd-section-title">
          <i className="fa-solid fa-list-check" />
          What Gets Deleted vs. Retained
        </div>
        <div className="deleted-grid">
          {WHAT_DELETED.map((item) => (
            <div key={item.label} className="deleted-row">
              <i className={`${item.icon} item-icon`} />
              <span className="item-label">{item.label}</span>
              {item.deleted
                ? <span className="status-yes"><i className="fa-solid fa-trash" /> Permanently deleted</span>
                : <span className="status-no"><i className="fa-solid fa-lock" /> Retained — {item.note}</span>
              }
            </div>
          ))}
        </div>

        {/* ── Alternative methods ── */}
        <div className="dd-section-title">
          <i className="fa-solid fa-envelope-open-text" />
          Alternative Ways to Request Deletion
        </div>
        <div>
          <div className="alt-method">
            <i className="fa-solid fa-envelope" />
            <div className="alt-method-body">
              <h4>Email Request</h4>
              <p>Send an email to <a href="mailto:privacy@reactcommerce.app">privacy@reactcommerce.app</a> from the email address registered to your account. Include your workspace name and the subject line <strong>"Data Deletion Request"</strong>. We will verify your identity and action the request within 30 days.</p>
            </div>
          </div>
          <div className="alt-method">
            <i className="fa-brands fa-facebook-messenger" />
            <div className="alt-method-body">
              <h4>Facebook Data Deletion Callback (Meta-required)</h4>
              <p>If you used Facebook Login to create your account, Meta's platform requires us to provide a data deletion callback URL. When you revoke app permissions from your Facebook settings, a deletion request is automatically sent to: <code style={{ fontSize: 11, color: 'var(--accent)' }}>https://reactcommerce.app/api/auth/facebook-deletion</code>. This triggers the same 15-working-day deletion flow.</p>
            </div>
          </div>
          <div className="alt-method">
            <i className="fa-solid fa-headset" />
            <div className="alt-method-body">
              <h4>Support Channel</h4>
              <p>Contact us via the in-app support widget or email <a href="mailto:support@reactcommerce.app">support@reactcommerce.app</a>. Our team will guide you through the process.</p>
            </div>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="dd-section-title">
          <i className="fa-solid fa-circle-question" />
          Frequently Asked Questions
        </div>
        {[
          {
            q: 'Can I cancel after submitting a deletion request?',
            a: 'Yes. Log back into your account at any point during the 15-working-day grace period and the scheduled deletion will be automatically cancelled. You\'ll see a banner in your dashboard indicating the pending deletion and a one-click cancel option.',
          },
          {
            q: 'What happens to my team members\' data?',
            a: 'Deletion of the workspace owner\'s account triggers deletion of the entire workspace, including all agent profiles associated with that workspace. All agents will be notified by email before deletion executes.',
          },
          {
            q: 'Will my contacts\' data (my customers) also be deleted?',
            a: 'Yes. All contact records, conversation history, and messages stored in your workspace are permanently deleted. This data is not shared with any third party prior to deletion.',
          },
          {
            q: 'Does deletion affect my WhatsApp Business Account with Meta?',
            a: 'No. Deleting your React Commerce account only removes data from our platform. Your WhatsApp Business Account registered with Meta is independent and unaffected. You can continue to use it with other BSPs.',
          },
          {
            q: 'How long until data disappears from backups?',
            a: 'Supabase point-in-time backups are rotated on a 30-day cycle. Your data will be fully purged from all backup snapshots within 30 days of the deletion execution date.',
          },
        ].map((faq, i) => (
          <div key={i} style={{ marginBottom: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div
              style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: 13.5, fontWeight: 500 }}
              onClick={() => setExpanded(expanded === 100 + i ? null : 100 + i)}
            >
              {faq.q}
              <i className={`fa-solid fa-chevron-${expanded === 100 + i ? 'up' : 'down'}`} style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12 }} />
            </div>
            {expanded === 100 + i && (
              <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, borderTop: '1px solid var(--border)' }}>
                <div style={{ paddingTop: 12 }}>{faq.a}</div>
              </div>
            )}
          </div>
        ))}

        {/* ── CTA ── */}
        <div className="dd-cta">
          <h3>Ready to Delete Your Account?</h3>
          <p>Go to Settings → Data & Security → Request Data Deletion inside the app, or email us directly.</p>
          <Link href="/settings" className="btn-danger">
            <i className="fa-solid fa-trash-can" /> Go to Settings
          </Link>
          <a href="mailto:privacy@reactcommerce.app" className="btn-ghost">
            <i className="fa-solid fa-envelope" /> Email Us
          </a>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            © 2026 React Commerce. Last updated 21 April 2026.
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
            <Link href="/privacy-policy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</Link>
          </div>
        </div>
      </div>
    </>
  )
}
