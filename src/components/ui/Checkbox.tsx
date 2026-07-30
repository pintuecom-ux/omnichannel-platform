'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  id?: string
}

export function Checkbox({ checked = false, onCheckedChange, className, id }: CheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation()
        onCheckedChange?.(!checked)
      }}
      className={cn(
        "w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 flex-none",
        checked 
          ? "bg-primary-500 border-primary-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.4)]" 
          : "bg-slate-800/80 border-slate-600 hover:border-slate-400 text-transparent",
        className
      )}
    >
      <Check className={cn("w-3 h-3 stroke-[3]", checked ? "opacity-100 scale-100" : "opacity-0 scale-75", "transition-all duration-150")} />
    </button>
  )
}
