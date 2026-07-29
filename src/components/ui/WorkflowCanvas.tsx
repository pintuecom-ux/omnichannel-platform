import React from 'react'
import { cn } from '@/lib/utils'

export function WorkflowCanvas({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(
      "relative h-full w-full bg-[#f8f9fa] overflow-hidden rounded-xl border border-neutral-200",
      className
    )}>
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-neutral-300) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="relative z-10 w-full h-full p-8 overflow-auto flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export function WorkflowNode({ title, type = 'trigger', active, children, className }: any) {
  const typeColors = {
    trigger: 'border-primary-500 shadow-primary-500/20',
    action: 'border-success-500 shadow-success-500/20',
    condition: 'border-warning-500 shadow-warning-500/20',
  }

  return (
    <div className={cn(
      "flex flex-col bg-white rounded-xl border-2 p-4 w-64 shadow-lg transition-all",
      typeColors[type as keyof typeof typeColors],
      active && "ring-4 ring-primary-500/20 scale-[1.02]",
      className
    )}>
      <div className="font-semibold text-sm mb-2">{title}</div>
      <div className="text-xs text-neutral-500">
        {children}
      </div>
    </div>
  )
}
