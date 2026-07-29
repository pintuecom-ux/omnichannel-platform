import React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({ value, max = 100, variant = 'default', size = 'md', className, ...props }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const variantClasses = {
    default: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-500',
    danger: 'bg-danger-600',
  }

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-neutral-100", sizeClasses[size], className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      {...props}
    >
      <div
        className={cn("h-full w-full flex-1 transition-all", variantClasses[variant])}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  )
}
