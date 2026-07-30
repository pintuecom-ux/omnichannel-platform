'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogoIcon } from '@/components/common/Logo'
import { Search, Bell, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MODULES = [
  { id: 'audience', icon: 'fa-solid fa-user-group', label: 'Audience', href: '/contacts' },
  { id: 'campaigns', icon: 'fa-solid fa-satellite-dish', label: 'Campaigns', href: '/broadcast' },
  { id: 'inbox', icon: 'fa-solid fa-comments', label: 'Inbox', href: '/inbox' },
  { id: 'automation', icon: 'fa-solid fa-diagram-project', label: 'Automation', href: '/flows' },
  { id: 'reports', icon: 'fa-solid fa-chart-column', label: 'Reports', href: '/analytics' },
] as const

export default function GlobalSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav id="global-sidebar" className="flex flex-col h-full bg-sidebar border-r border-border items-center py-4 justify-between z-[40]">
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Logo Workspace Switcher Placeholder */}
        <div 
          className="w-10 h-10 rounded-xl bg-surface border border-border/50 flex items-center justify-center cursor-pointer shadow-sm hover:border-primary-500 transition-colors"
          title="Switch Workspace"
        >
          <LogoIcon size={24} />
        </div>

        {/* Global Search Trigger */}
        <button 
          className="w-10 h-10 rounded-lg text-text-muted hover:text-primary-400 hover:bg-surface transition-all flex items-center justify-center"
          title="Search (Cmd+K)"
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
          <Search className="w-5 h-5" />
        </button>

        <div className="w-8 h-px bg-border/50 my-2"></div>

        {/* Primary Modules */}
        <div className="flex flex-col gap-2 w-full px-2">
          {MODULES.map(module => {
            // Rough match to check if active module
            const isActive = pathname?.includes(module.id) || pathname?.includes(module.href)
            
            return (
              <button
                key={module.id}
                onClick={() => router.push(module.href)}
                className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center transition-all group relative ${
                  isActive 
                    ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20 shadow-sm' 
                    : 'text-text-muted hover:text-white hover:bg-surface'
                }`}
              >
                <i className={`${module.icon} text-lg`} />
                <div className="absolute left-14 bg-panel border border-border px-3 py-1.5 rounded text-xs font-medium text-white shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity whitespace-nowrap z-50">
                  {module.label}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 w-full">
        {/* Notifications */}
        <button className="w-10 h-10 rounded-lg text-text-muted hover:text-white hover:bg-surface transition-all flex items-center justify-center relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-sidebar"></span>
        </button>

        {/* Settings */}
        <button 
          onClick={() => router.push('/settings')}
          className="w-10 h-10 rounded-lg text-text-muted hover:text-white hover:bg-surface transition-all flex items-center justify-center"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Avatar */}
        <button 
          className="w-10 h-10 rounded-full bg-gradient-to-br from-accent2 to-accent text-white flex items-center justify-center text-xs font-bold shadow-md ring-2 ring-transparent hover:ring-primary-500/50 transition-all mt-2"
          onClick={handleLogout}
          title="Sign Out"
        >
          AK
        </button>
      </div>
    </nav>
  )
}
