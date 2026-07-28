'use client'
/**
 * src/components/sidebar/Sidebar.tsx
 *
 * UPGRADE: Enterprise docked navigation rail with tooltips & optional pinned drawer mode.
 * Eliminates accidental hover jitter and layout shifting.
 */

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoIcon } from '@/components/common/Logo'

const NAV = [
  { id: 'inbox',     icon: 'fa-solid fa-comments',       label: 'Inbox',            href: '/inbox',    section: 'Messaging' },
  { id: 'calls',     icon: 'fa-solid fa-phone',           label: 'Calls',            href: '/calls',    section: 'Messaging' },
  { id: 'email',     icon: 'fa-solid fa-envelope',        label: 'Email',            soon: true,        section: 'Messaging' },
  { id: 'livechat',  icon: 'fa-solid fa-bolt',            label: 'Live Chat Widget', soon: true,        section: 'Messaging' },
  { id: 'contacts',  icon: 'fa-solid fa-user-group',      label: 'Contacts',         href: '/contacts', section: 'Audience' },
  { id: 'lists',     icon: 'fa-solid fa-list-ul',         label: 'Lists',            soon: true,        section: 'Audience' },
  { id: 'segments',  icon: 'fa-solid fa-filter',          label: 'Segments',         soon: true,        section: 'Audience' },
  { id: 'broadcast', icon: 'fa-solid fa-satellite-dish',  label: 'Broadcast',        soon: true,        section: 'Automation' },
  { id: 'flows',     icon: 'fa-solid fa-diagram-project', label: 'WA Flows',         href: '/flows',    section: 'Automation' },
  { id: 'aibots',    icon: 'fa-solid fa-robot',           label: 'AI Bots',          soon: true,        section: 'Automation' },
  { id: 'planner',   icon: 'fa-solid fa-calendar-days',   label: 'Content Planner',  href: '/planner',  section: 'Publishing' },
  { id: 'templates', icon: 'fa-solid fa-file-code',       label: 'Templates',        href: '/templates',section: 'Publishing' },
  { id: 'pages',     icon: 'fa-solid fa-photo-film',      label: 'Media Library',    href: '/pages',    section: 'Publishing' },
  { id: 'ads',       icon: 'fa-solid fa-rectangle-ad',    label: 'Ad Manager',       soon: true,        section: 'Ads & Analytics' },
  { id: 'catalog',   icon: 'fa-solid fa-store',           label: 'Meta Catalogs',    href: '/catalog',  section: 'Ads & Analytics' },
  { id: 'analytics', icon: 'fa-solid fa-chart-column',    label: 'Analytics',        href: '/analytics',section: 'Ads & Analytics' },
  { id: 'numbers',   icon: 'fa-solid fa-sim-card',        label: 'Buy Numbers',      soon: true,        section: 'Numbers & Calling' },
  { id: 'voip',      icon: 'fa-solid fa-headset',         label: 'VoIP / Dialer',    soon: true,        section: 'Numbers & Calling' },
  { id: 'ivr',       icon: 'fa-solid fa-sitemap',         label: 'IVR Builder',      soon: true,        section: 'Numbers & Calling' },
] as const

export default function Sidebar() {
  const router   = useRouter()
  const pathname = usePathname()
  const sections = [...new Set(NAV.map(n => n.section))]
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_expanded') === 'true'
    setExpanded(saved)
    const app = document.getElementById('app')
    if (app && saved) app.classList.add('sidebar-expanded')
  }, [])

  function toggleExpand() {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem('sidebar_expanded', String(next))
    const app = document.getElementById('app')
    if (app) app.classList.toggle('sidebar-expanded', next)
  }

  function toggleTheme() {
    const html = document.documentElement
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
    const trk = document.getElementById('toggleTrack')
    if (trk) trk.classList.toggle('on')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav id="sidebar" className={expanded ? 'expanded' : ''}>
      {!expanded && (
        <button className="sidebar-compact-toggle" onClick={toggleExpand} title="Expand Navigation">
          <i className="fa-solid fa-chevron-right" />
        </button>
      )}

      <div className="sidebar-logo">
        <div className="logo-left">
          <div className="logo-icon">
            <LogoIcon size={24} />
          </div>
          <span className="logo-text">React Commerce</span>
        </div>
        {expanded && (
          <button className="sidebar-toggle-btn" onClick={toggleExpand} title="Collapse Navigation">
            <i className="fa-solid fa-chevron-left" style={{ fontSize: 11 }} />
          </button>
        )}
      </div>

      <div className="sidebar-nav">
        {sections.map(section => (
          <div className="sidebar-section" key={section}>
            <div className="sidebar-section-label">{section}</div>
            {NAV.filter(n => n.section === section).map(item => {
              const isSoon   = 'soon' in item && item.soon
              const href     = 'href' in item ? item.href : undefined
              const isActive = href ? pathname?.startsWith(href) : false
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isSoon ? 'coming-soon' : ''} ${isActive ? 'active' : ''}`}
                  onClick={() => { if (!isSoon && href) router.push(href) }}
                >
                  <span className="nav-icon"><i className={item.icon} /></span>
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-tooltip">{isSoon ? `${item.label} (Soon)` : item.label}</span>
                  {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && !isSoon && (
                    <span className="nav-badge" id={`badge-${item.id}`}>{item.badge}</span>
                  )}
                  {isSoon && <span className="cs-badge">Soon</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-section">
          <div className="theme-toggle-item" onClick={toggleTheme}>
            <span className="nav-icon"><i className="fa-solid fa-circle-half-stroke" /></span>
            <span className="nav-label">Theme</span>
            <span className="nav-tooltip">Toggle Theme</span>
            <div className="toggle-track" id="toggleTrack"><div className="toggle-knob" /></div>
          </div>
          <div className="nav-item" onClick={() => router.push('/settings')}>
            <span className="nav-icon"><i className="fa-solid fa-gear" /></span>
            <span className="nav-label">Settings</span>
            <span className="nav-tooltip">Settings</span>
          </div>
          <div className="nav-item" onClick={handleLogout}>
            <span className="nav-icon">
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent2), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>AK</div>
            </span>
            <span className="nav-label">Sign Out</span>
            <span className="nav-tooltip">Sign Out</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
