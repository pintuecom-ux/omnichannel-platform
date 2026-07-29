import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
}

export function LoadingSpinner({ size = 'md', text, className, ...props }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)} {...props}>
      <Loader2 className={cn("animate-spin text-primary-600", sizeClasses[size])} />
      {text && <span className="text-sm font-medium text-neutral-500">{text}</span>}
    </div>
  )
}
