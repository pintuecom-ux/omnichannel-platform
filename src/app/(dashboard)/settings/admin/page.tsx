'use client'
import { useRouter } from 'next/navigation'
import SettingsShell from '@/components/settings/SettingsShell'

const SECTIONS = [
  {
    title: 'Channels',
    desc: 'Connect your channels to engage your contacts',
    tiles: [
      { label: 'Web Chat',                     icon: 'fa-solid fa-comment-dots',        color: '#2fe774', href: '/settings/channels?tab=web-chat' },
      { label: 'WhatsApp',                     icon: 'fa-brands fa-whatsapp',           color: '#25d366', href: '/settings/channels?tab=whatsapp' },
      { label: 'SMS',                          icon: 'fa-solid fa-sms',                 color: '#8b5cf6', href: '/settings/channels?tab=sms' },
      { label: 'Instagram',                    icon: 'fa-brands fa-instagram',          color: '#e1306c', href: '/settings/channels?tab=instagram' },
      { label: 'Facebook Messenger',           icon: 'fa-brands fa-facebook-messenger', color: '#0084ff', href: '/settings/channels?tab=facebook' },
      { label: 'LINE',                         icon: 'fa-solid fa-message',             color: '#06c755', href: '/settings/channels?tab=line' },
      { label: 'Mobile SDK',                   icon: 'fa-solid fa-mobile-screen',       color: '#f59e0b', href: '/settings/channels?tab=mobile-sdk' },
      { label: 'Support Email',                icon: 'fa-solid fa-envelope',            color: '#00a8e8', href: '/settings/channels?tab=email' },
      { label: 'Phone',                        icon: 'fa-solid fa-phone',               color: '#10b981', href: '/settings/channels?tab=phone' },
      { label: 'Apple Messages for Business',  icon: 'fa-brands fa-apple',             color: '#d5d5d5', href: '/settings/channels?tab=apple' },
      { label: 'Channel Apps',                 icon: 'fa-solid fa-grid-2-plus',         color: '#2fe774', href: '/settings/channels?tab=apps' },
    ],
  },
  {
    title: 'Configuration and Workflows',
    desc: 'Manage workflows, campaigns, collaboration and other configurations',
    tiles: [
      { label: 'Conversation Labels',           icon: 'fa-solid fa-tags',               color: '#f59e0b', href: '/settings/configuration?tab=labels' },
      { label: 'Conversation Properties',       icon: 'fa-solid fa-list-check',          color: '#00a8e8', href: '/settings/configuration?tab=conversation-properties' },
      { label: 'Contacts',                      icon: 'fa-solid fa-user',                color: '#2fe774', href: '/settings/configuration?tab=contacts' },
      { label: 'Accounts',                      icon: 'fa-solid fa-building',            color: '#8b5cf6', href: '/settings/configuration?tab=accounts' },
      { label: 'CRM Tags',                      icon: 'fa-solid fa-hashtag',             color: '#e84393', href: '/settings/configuration?tab=tags' },
      { label: 'Business Hours',                icon: 'fa-solid fa-clock',               color: '#f59e0b', href: '/settings/configuration?tab=business-hours' },
      { label: 'Conversation Assignment Rules', icon: 'fa-solid fa-shuffle',             color: '#00a8e8', href: '/settings/configuration?tab=assignment-rules' },
      { label: 'SLA Policies',                  icon: 'fa-solid fa-gauge-high',          color: '#e84040', href: '/settings/configuration?tab=sla' },
      { label: 'Canned Responses',              icon: 'fa-solid fa-comment-dots',        color: '#2fe774', href: '/settings/canned-responses' },
      { label: 'Conversation Resources',        icon: 'fa-solid fa-folder-open',         color: '#f59e0b', href: '/settings/conversation-resources' },
      { label: 'WhatsApp Campaigns',            icon: 'fa-brands fa-whatsapp',           color: '#25d366', href: '/settings/configuration?tab=wa-campaigns' },
      { label: 'Customer Journeys',             icon: 'fa-solid fa-route',               color: '#8b5cf6', href: '/settings/configuration?tab=journeys' },
    ],
  },
  {
    title: 'Freddy AI and Self Service',
    desc: 'Manage Bots, FAQs and empower support with AI',
    tiles: [
      { label: 'AI Agent Studio', icon: 'fa-solid fa-wand-magic-sparkles', color: '#2fe774', href: '/settings/ai?tab=agent-studio' },
      { label: 'Freddy AI Assistant', icon: 'fa-solid fa-robot', color: '#00a8e8', href: '/settings/ai?tab=freddy' },
      { label: 'FAQs / Knowledge Base', icon: 'fa-solid fa-book-open', color: '#f59e0b', href: '/settings/ai?tab=faqs' },
    ],
  },
  {
    title: 'Marketplace and Integrations',
    desc: 'Manage Marketplace apps, native integrations and APIs',
    tiles: [
      { label: 'Marketplace Apps',        icon: 'fa-solid fa-store',       color: '#2fe774', href: '/settings/marketplace?tab=apps' },
      { label: 'Conversation Integrations', icon: 'fa-solid fa-plug-circle-check', color: '#00a8e8', href: '/settings/marketplace?tab=conversation' },
      { label: 'E-Commerce Apps',         icon: 'fa-solid fa-cart-shopping', color: '#f59e0b', href: '/settings/marketplace?tab=ecommerce' },
      { label: 'CRM Tracking Code',       icon: 'fa-solid fa-code',        color: '#8b5cf6', href: '/settings/marketplace?tab=tracking-code' },
      { label: 'API Settings',            icon: 'fa-solid fa-key',         color: '#e84040', href: '/settings/marketplace?tab=api' },
    ],
  },
  {
    title: 'Team Management',
    desc: 'Manage your agents, their permissions and group settings',
    tiles: [
      { label: 'Users',                icon: 'fa-solid fa-users',       color: '#2fe774', href: '/settings/users' },
      { label: 'Roles',                icon: 'fa-solid fa-user-shield', color: '#00a8e8', href: '/settings/team?tab=roles' },
      { label: 'Conversation Groups',  icon: 'fa-solid fa-people-group', color: '#f59e0b', href: '/settings/team?tab=groups' },
    ],
  },
  {
    title: 'Data and Security',
    desc: 'Import your data, and manage account security and compliance',
    tiles: [
      { label: 'Contacts Import',  icon: 'fa-solid fa-file-import',    color: '#2fe774', href: '/settings/data?tab=import-contacts' },
      { label: 'Import History',   icon: 'fa-solid fa-clock-rotate-left', color: '#8b5cf6', href: '/settings/data?tab=import-history' },
      { label: 'Block IPs',        icon: 'fa-solid fa-ban',            color: '#e84040', href: '/settings/data?tab=block-ips' },
      { label: 'Org Security',     icon: 'fa-solid fa-shield-halved',  color: '#00a8e8', href: '/settings/data?tab=org-security' },
      { label: 'GDPR',             icon: 'fa-solid fa-scale-balanced',  color: '#f59e0b', href: '/settings/data?tab=gdpr' },
    ],
  },
  {
    title: 'Account and Billing',
    desc: 'Manage your billing, payment and account settings',
    tiles: [
      { label: 'CRM Settings',     icon: 'fa-solid fa-sliders',      color: '#2fe774', href: '/settings/billing?tab=crm-settings' },
      { label: 'Account',          icon: 'fa-solid fa-building-user', color: '#00a8e8', href: '/settings/billing?tab=account' },
      { label: 'Plans and Billing', icon: 'fa-solid fa-credit-card',  color: '#f59e0b', href: '/settings/billing?tab=plans' },
    ],
  },
]

export default function AdminSettingsPage() {
  const router = useRouter()

  return (
    <SettingsShell>
      <div style={{ padding: 28, maxWidth: 1100 }}>
        {/* Upgrade Banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(47,231,116,0.08), rgba(0,168,232,0.06))', border: '1px solid rgba(47,231,116,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--border-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', fontSize: 16 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Upgrade to Pro</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Elevate your customer service with advanced features powered by AI.</div>
          </div>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '7px 14px' }}>Learn more</button>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}><i className="fa-solid fa-arrow-right" /> Upgrade Now</button>
        </div>

        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)', marginBottom: 3 }}>{section.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{section.desc}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {section.tiles.map(tile => (
                <div
                  key={tile.label}
                  onClick={() => router.push(tile.href)}
                  style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'all 0.15s', textAlign: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(47,231,116,0.3)'; e.currentTarget.style.background = 'var(--bg-surface)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-panel)' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tile.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={tile.icon} style={{ color: tile.color, fontSize: 18 }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{tile.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SettingsShell>
  )
}