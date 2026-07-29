import React from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className={cn("w-full caption-bottom text-sm text-text-primary", className)} {...props} />
    </div>
  )
}
export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-border bg-panel", className)} {...props} />
}
export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
}
export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-hover data-[state=selected]:bg-[var(--accent-glow)]",
        className
      )}
      {...props}
    />
  )
}
export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 px-4 text-left align-middle font-semibold text-text-secondary uppercase tracking-wider text-xs [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}
export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "p-4 align-middle text-text-primary [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

export function BulkActionBar({ selectedCount, onClear, children, className }: { selectedCount: number, onClear: () => void, children?: React.ReactNode, className?: string }) {
  if (selectedCount === 0) return null
  
  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-neutral-900 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-5",
      className
    )}>
      <div className="flex items-center gap-2 border-r border-neutral-700 pr-4">
        <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {selectedCount}
        </span>
        <span className="text-sm font-medium">Selected</span>
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
      <button 
        onClick={onClear}
        className="ml-2 text-neutral-400 hover:text-white transition-colors p-1"
        aria-label="Clear selection"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  )
}
