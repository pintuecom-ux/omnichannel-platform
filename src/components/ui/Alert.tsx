import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error'
  title?: string
}

const icons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
}

export function Alert({ variant = 'default', title, children, className, ...props }: AlertProps) {
  const Icon = icons[variant]

  const variantClasses = {
    default: 'bg-neutral-100 text-neutral-900 border-neutral-200',
    info: 'bg-primary-50 text-primary-900 border-primary-200',
    success: 'bg-success-50 text-success-900 border-success-200',
    warning: 'bg-warning-50 text-warning-900 border-warning-200',
    error: 'bg-danger-50 text-danger-900 border-danger-200',
  }

  const iconClasses = {
    default: 'text-neutral-500',
    info: 'text-primary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-danger-600',
  }

  return (
    <div
      role="alert"
      className={cn(
        "relative flex w-full items-start gap-4 rounded-lg border p-4 shadow-sm",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClasses[variant])} />
      <div className="flex flex-col gap-1">
        {title && <h5 className="font-medium leading-none tracking-tight">{title}</h5>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  )
}
