'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  id: string
  label: string
  href: string
  icon: string
  soon?: boolean
}

type ModuleConfig = {
  title: string
  items: NavItem[]
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  audience: {
    title: 'Audience',
    items: [
      { id: 'contacts', label: 'Contacts', href: '/contacts', icon: 'fa-solid fa-user' },
      { id: 'lists', label: 'Lists', href: '/lists', icon: 'fa-solid fa-list-ul' },
      { id: 'segments', label: 'Segments', href: '/segments', icon: 'fa-solid fa-filter' },
    ]
  },
  inbox: {
    title: 'Inbox',
    items: [
      { id: 'inbox', label: 'Messages', href: '/inbox', icon: 'fa-solid fa-comments' },
      { id: 'calls', label: 'Calls', href: '/calls', icon: 'fa-solid fa-phone' },
    ]
  },
  automation: {
    title: 'Automation',
    items: [
      { id: 'broadcast', label: 'Broadcasts', href: '/broadcast', icon: 'fa-solid fa-satellite-dish' },
      { id: 'flows', label: 'WA Flows', href: '/flows', icon: 'fa-solid fa-diagram-project' },
    ]
  },
  reports: {
    title: 'Reports',
    items: [
      { id: 'analytics', label: 'Analytics', href: '/analytics', icon: 'fa-solid fa-chart-column' },
    ]
  }
}

export default function ModuleSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Keyboard shortcut Cmd + \ to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '\\') {
        e.preventDefault()
        setCollapsed(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Determine active module based on URL
  const activeModuleKey = Object.keys(MODULE_CONFIGS).find(key => {
    return MODULE_CONFIGS[key].items.some(item => pathname?.startsWith(item.href))
  }) || 'audience' // Default fallback

  const config = MODULE_CONFIGS[activeModuleKey]

  return (
    <nav id="module-sidebar" className={cn(
      "flex flex-col h-full bg-surface border-r border-border transition-all duration-300 z-[30] relative",
      collapsed ? "w-0 overflow-hidden border-r-0" : "w-[240px]"
    )}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase">{config.title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {config.items.map(item => {
          const isActive = pathname?.startsWith(item.href)
          
          return (
            <button
              key={item.id}
              onClick={() => !item.soon && router.push(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                isActive 
                  ? "bg-primary-500/10 text-primary-400 font-medium" 
                  : "text-text-secondary hover:text-white hover:bg-hover",
                item.soon && "opacity-50 cursor-not-allowed"
              )}
            >
              <i className={cn(item.icon, "w-4 text-center text-xs opacity-80")} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.soon && <span className="text-[10px] bg-surface2 px-1.5 py-0.5 rounded text-text-muted">Soon</span>}
            </button>
          )
        })}
      </div>

      {/* Collapse Toggle */}
      <button 
        onClick={() => setCollapsed(true)}
        className="absolute -right-3 top-16 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-text-muted hover:text-white shadow-sm z-50 transform hover:scale-110 transition-transform"
        title="Collapse (Cmd + \)"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Expand Toggle (only visible when collapsed) */}
      {collapsed && (
        <button 
          onClick={() => setCollapsed(false)}
          className="fixed left-[52px] top-16 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-text-muted hover:text-white shadow-sm z-50 transform hover:scale-110 transition-transform"
          title="Expand (Cmd + \)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </nav>
  )
}
