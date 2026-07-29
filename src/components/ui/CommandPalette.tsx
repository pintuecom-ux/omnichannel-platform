import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Search, Command, File, User, Settings, ArrowRight } from 'lucide-react'
import { Modal, ModalContent } from './Modal'

export function CommandPalette({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const [query, setQuery] = useState('')



  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl p-0 overflow-hidden gap-0 border-none bg-transparent shadow-none">
        <div className="flex flex-col w-full bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
          <div className="flex items-center px-4 py-3 border-b border-neutral-100">
            <Search className="h-5 w-5 text-neutral-400 mr-3" />
            <input
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-neutral-400"
              placeholder="Search contacts, campaigns, or settings..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-1">
              <kbd className="bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 text-xs text-neutral-500 font-mono">⌘</kbd>
              <kbd className="bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 text-xs text-neutral-500 font-mono">K</kbd>
            </div>
          </div>
          <div className="flex flex-col max-h-[400px] overflow-y-auto p-2">
            <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Quick Actions</div>
            <CommandItem icon={<User className="text-primary-500" />} title="Create new Contact" shortcut="C" />
            <CommandItem icon={<File className="text-success-500" />} title="New Campaign Segment" shortcut="S" />
            <CommandItem icon={<Settings className="text-neutral-500" />} title="Go to Settings" />
            
            <div className="px-3 py-2 mt-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Recent Searches</div>
            <CommandItem icon={<Search />} title="VIP Customers" subtitle="Segment" />
            <CommandItem icon={<Search />} title="Jane Doe" subtitle="Contact" />
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}

function CommandItem({ icon, title, subtitle, shortcut }: any) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer hover:bg-neutral-100 group">
      <div className="flex items-center gap-3">
        <div className="text-neutral-400 group-hover:text-neutral-600 transition-colors h-5 w-5 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-neutral-900">{title}</span>
          {subtitle && <span className="text-xs text-neutral-500">{subtitle}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {shortcut && <kbd className="hidden group-hover:inline-block bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 text-xs text-neutral-500 font-mono">{shortcut}</kbd>}
        <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-400 opacity-0 group-hover:opacity-100 transition-all" />
      </div>
    </div>
  )
}
