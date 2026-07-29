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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm transition-opacity" 
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
        "relative z-50 grid w-full max-w-lg gap-4 bg-panel border border-border p-6 shadow-2xl sm:rounded-xl text-text-primary animate-in fade-in-90 zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
  )
}

export function ModalTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight text-text-primary", className)} {...props} />
  )
}

export function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
  )
}
