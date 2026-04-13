'use client'
import { useRouter, usePathname } from 'next/navigation'

const NAV = [
  // Messaging
  { id: 'inbox',     icon: 'fa-solid fa-comments',        label: 'Inbox',            href: '/inbox',      badge: 12,  section: 'Messaging' },
  { id: 'calls',     icon: 'fa-solid fa-phone',            label: 'Calls',            soon: true,          section: 'Messaging' },
  { id: 'email',     icon: 'fa-solid fa-envelope',         label: 'Email',            soon: true,          section: 'Messaging' },
  { id: 'livechat',  icon: 'fa-solid fa-bolt',             label: 'Live Chat Widget', soon: true,          section: 'Messaging' },
  // Audience
  { id: 'contacts',  icon: 'fa-solid fa-user-group',       label: 'Contacts',         href: '/contacts',   section: 'Audience' },
  { id: 'lists',     icon: 'fa-solid fa-list-ul',          label: 'Lists',            href: '/lists',      section: 'Audience' },
  { id: 'segments',  icon: 'fa-solid fa-filter',           label: 'Segments',         soon: true,          section: 'Audience' },
  // Automation
  { id: 'broadcast', icon: 'fa-solid fa-satellite-dish',   label: 'Broadcast',        href: '/broadcast',  badge: 2,   section: 'Automation' },
  { id: 'flows',     icon: 'fa-solid fa-diagram-project',  label: 'Flows / Bots',     soon: true,          section: 'Automation' },
  { id: 'aibots',    icon: 'fa-solid fa-robot',            label: 'AI Bots',          soon: true,          section: 'Automation' },
  // Publishing
  { id: 'planner',   icon: 'fa-solid fa-calendar-days',    label: 'Content Planner',  soon: true,          section: 'Publishing' },
  { id: 'templates', icon: 'fa-solid fa-file-code',        label: 'Templates',        href: '/templates',  badge: 12,  section: 'Publishing' },
  { id: 'pages',     icon: 'fa-solid fa-layer-group',      label: 'Pages & Posts',    soon: true,          section: 'Publishing' },
  // Ads & Analytics
  { id: 'ads',       icon: 'fa-solid fa-rectangle-ad',     label: 'Ad Manager',       soon: true,          section: 'Ads & Analytics' },
  { id: 'analytics', icon: 'fa-solid fa-chart-column',     label: 'Analytics',        href: '/analytics',  section: 'Ads & Analytics' },
  // Numbers & Calling
  { id: 'numbers',   icon: 'fa-solid fa-sim-card',         label: 'Buy Numbers',      soon: true,          section: 'Numbers & Calling' },
  { id: 'voip',      icon: 'fa-solid fa-headset',          label: 'VoIP / Dialer',    soon: true,          section: 'Numbers & Calling' },
  { id: 'ivr',       icon: 'fa-solid fa-sitemap',          label: 'IVR Builder',      soon: true,          section: 'Numbers & Calling' },
] as const

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()

  const sections = [...new Set(NAV.map(n => n.section))]

  function toggleTheme() {
    const html = document.documentElement
    html.setAttribute('data-theme',
      html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    )
  }

  return (
    <nav id="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon" style={{ fontSize: '10px' }}>RC</div>
        <span className="logo-text">React Commerce</span>
      </div>

      {/* Nav items */}
      <div className="sidebar-nav">
        {sections.map(section => (
          <div className="sidebar-section" key={section}>
            <div className="sidebar-section-label">{section}</div>

            {NAV.filter(n => n.section === section).map(item => (
              <div
                key={item.id}
                className={[
                  'nav-item',
                  'soon' in item && item.soon ? 'coming-soon cs-tooltip' : '',
                  'href' in item && pathname?.startsWith(item.href as string) ? 'active' : '',
                ].join(' ')}
                data-tip={'soon' in item && item.soon ? 'Coming Soon' : undefined}
                onClick={() => {
                  if (!('soon' in item && item.soon) && 'href' in item) {
                    router.push(item.href as string)
                  }
                }}
              >
                <span className="nav-icon"><i className={item.icon} /></span>
                <span className="nav-label">{item.label}</span>
                {'badge' in item && item.badge && !('soon' in item && item.soon) && (
                  <span className="nav-badge">{item.badge}</span>
                )}
                {'soon' in item && item.soon && (
                  <span className="cs-badge">Soon</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="sidebar-section">
          <div className="theme-toggle-item" onClick={toggleTheme}>
            <span className="nav-icon"><i className="fa-solid fa-circle-half-stroke" /></span>
            <span className="nav-label">Theme</span>
            <div className="toggle-track" id="toggleTrack">
              <div className="toggle-knob" />
            </div>
          </div>
          <div className="nav-item" onClick={() => router.push('/settings')}>
            <span className="nav-icon"><i className="fa-solid fa-gear" /></span>
            <span className="nav-label">Settings</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon">
              <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--accent2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#000' }}>
                AK
              </div>
            </span>
            <span className="nav-label">Anil Kumar</span>
          </div>
        </div>
      </div>
    </nav>
  )
}