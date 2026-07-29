import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface ModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Modal({ open, onOpenChange, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-base/60 backdrop-blur-[8px] transition-opacity" 
        onClick={() => onOpenChange?.(false)} 
      />
      {children}
    </div>
  )
}

export function ModalContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative z-50 grid w-full max-w-lg bg-panel/95 backdrop-blur-[20px] border border-white/10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.05)] text-text-primary animate-in fade-in zoom-in-95 duration-200 overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Subtle Glow Accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50"></div>
      
      {children}
    </div>
  )
}

export function ModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5 border-b border-white/5 flex items-center justify-between", className)} {...props} />
  )
}

export function ModalTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-xl font-bold text-white tracking-tight flex items-center gap-3", className)} {...props} />
  )
}

export function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4 border-t border-white/5 bg-surface/30 flex items-center justify-end gap-3", className)} {...props} />
  )
}
