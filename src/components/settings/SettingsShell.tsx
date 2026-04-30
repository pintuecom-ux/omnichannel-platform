'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

const CATEGORIES = [
  { id: 'channels',      label: 'Channels',                     desc: 'Connect your channels to engage your contacts',                          icon: 'fa-solid fa-plug',           href: '/settings/channels' },
  { id: 'configuration', label: 'Configuration and Workflows',  desc: 'Manage workflows, campaigns, collaboration and other configurations',    icon: 'fa-solid fa-sliders',        href: '/settings/configuration' },
  { id: 'ai',            label: 'Freddy AI and Self Service',   desc: 'Manage Bots, FAQs and empower support with AI',                         icon: 'fa-solid fa-robot',          href: '/settings/ai' },
  { id: 'marketplace',   label: 'Marketplace and Integrations', desc: 'Manage Marketplace apps, native integrations and APIs',                 icon: 'fa-solid fa-store',          href: '/settings/marketplace' },
  { id: 'team',          label: 'Team Management',              desc: 'Manage your agents, their permissions and group settings',              icon: 'fa-solid fa-users',          href: '/settings/team' },
  { id: 'data',          label: 'Data and Security',            desc: 'Import your data, and manage account security and compliance',          icon: 'fa-solid fa-shield-halved',  href: '/settings/data' },
  { id: 'billing',       label: 'Account and Billing',          desc: 'Manage your billing, payment and account settings',                     icon: 'fa-solid fa-credit-card',    href: '/settings/billing' },
]

const QUICK_LINKS = [
  { label: 'Marketplace Apps', href: '/settings/marketplace' },
  { label: 'Web Chat',         href: '/settings/channels' },
  { label: 'Team Members',     href: '/settings/team' },
  { label: 'Canned Responses', href: '/settings/canned-responses' },
]

export default function SettingsShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState('')

  const activeId = CATEGORIES.find(c => pathname?.startsWith(c.href))?.id

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>

      {/* ── Top Bar ───────────────────────────────────────── */}
      <div style={{ height: 56, borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '0 12px', height: 36, flex: '0 0 300px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)', fontSize: 12 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search settings"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
          />
        </div>

        {/* Quick Links */}
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {QUICK_LINKS.map(l => (
            <button
              key={l.label}
              onClick={() => router.push(l.href)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'color .15s', fontFamily: 'DM Sans, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >{l.label}</button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn" title="Notifications"><i className="fa-regular fa-bell" /></button>
          <button className="icon-btn" title="Profile"><i className="fa-regular fa-circle-user" /></button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left Sidebar */}
        <div style={{ width: 250, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, padding: '8px 0' }}>
          <div style={{ padding: '10px 16px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ADMIN SETTINGS
          </div>
          {CATEGORIES.map(cat => {
            const isActive = pathname?.startsWith(cat.href)
            return (
              <div
                key={cat.id}
                onClick={() => router.push(cat.href)}
                style={{
                  padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <i className={cat.icon} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', marginTop: 2, fontSize: 13, width: 16, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.3 }}>{cat.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{cat.desc}</div>
                </div>
              </div>
            )
          })}

          <div style={{ height: 1, background: 'var(--border)', margin: '8px 16px' }} />

          {/* Quick access items */}
          {[
            { label: 'Canned Responses',    href: '/settings/canned-responses',    icon: 'fa-solid fa-comment-dots' },
            { label: 'Conversation Resources', href: '/settings/conversation-resources', icon: 'fa-solid fa-folder-open' },
            { label: 'Lifecycle Stages',    href: '/settings/lifecycle-stages',    icon: 'fa-solid fa-arrow-right-arrow-left' },
            { label: 'Users',               href: '/settings/users',               icon: 'fa-solid fa-user-group' },
          ].map(item => {
            const isActive = pathname === item.href
            return (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{ padding: '8px 16px 8px 44px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 7, color: isActive ? 'var(--accent)' : 'var(--text-secondary)', background: isActive ? 'var(--accent-glow)' : 'transparent', transition: 'all 0.15s', fontWeight: isActive ? 600 : 400 }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
              >
                <i className={item.icon} style={{ fontSize: 11, width: 14 }} />
                {item.label}
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
