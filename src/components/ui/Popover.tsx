import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface PopoverProps {
  children: React.ReactNode
}

export function Popover({ children }: PopoverProps) {
  return <div className="relative inline-block">{children}</div>
}

export function PopoverTrigger({ children, asChild = false, onClick }: { children: React.ReactNode, asChild?: boolean, onClick?: () => void }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick })
  }
  return <div onClick={onClick} className="cursor-pointer">{children}</div>
}

export function PopoverContent({ children, className, isOpen, onClose }: { children: React.ReactNode, className?: string, isOpen?: boolean, onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose?.()
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 w-72 rounded-md border border-neutral-200 bg-white p-4 text-neutral-900 shadow-md outline-none animate-in fade-in-80 zoom-in-95 data-[side=bottom]:slide-in-from-top-2",
        "top-full mt-2 right-0",
        className
      )}
    >
      {children}
    </div>
  )
}
