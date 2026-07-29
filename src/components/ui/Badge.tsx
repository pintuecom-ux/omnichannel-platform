/**
 * src/components/ui/Badge.tsx
 *
 * Shared badge / pill / status chip component.
 * Replaces 20+ inline badge spans across page files.
 */

import { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors border',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-hover text-text-primary',
        primary: 'border-transparent bg-primary-500/15 text-primary-400',
        success: 'border-transparent bg-success-500/15 text-success-400',
        warning: 'border-transparent bg-warning-500/15 text-warning-400',
        danger: 'border-transparent bg-danger-500/15 text-danger-400',
        info: 'border-transparent bg-blue-500/15 text-blue-400',
        whatsapp: 'border-transparent bg-[#25D366]/15 text-[#25D366]',
        instagram: 'border-transparent bg-[#E1306C]/15 text-[#E1306C]',
        facebook: 'border-transparent bg-[#1877F2]/15 text-[#1877F2]',
        ghost: 'border-border bg-transparent text-text-secondary',
      },
      size: {
        xs: 'text-[10px] px-1.5 py-0.5',
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
      },
      pill: {
        true: 'rounded-full',
        false: 'rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      pill: true,
    },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean // show a colored dot before the label
  icon?: string // fa icon class
}

const dotVariants = cva('w-1.5 h-1.5 rounded-full mr-1.5 shrink-0', {
  variants: {
    variant: {
      default: 'bg-neutral-500',
      primary: 'bg-primary-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      info: 'bg-blue-500',
      whatsapp: 'bg-[#25D366]',
      instagram: 'bg-[#E1306C]',
      facebook: 'bg-[#1877F2]',
      ghost: 'bg-neutral-400',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export default function Badge({
  variant,
  size,
  pill,
  dot = false,
  icon,
  children,
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, pill, className }))}
      {...rest}
    >
      {dot && (
        <span
          className={dotVariants({ variant })}
          aria-hidden="true"
        />
      )}
      {icon && <i className={cn(icon, children ? 'mr-1.5' : '')} />}
      {children}
    </span>
  )
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export function PlatformBadge({ platform }: { platform: 'whatsapp' | 'instagram' | 'facebook' }) {
  const map = {
    whatsapp: { variant: 'whatsapp' as const, icon: 'fa-brands fa-whatsapp', label: 'WA' },
    instagram: { variant: 'instagram' as const, icon: 'fa-brands fa-instagram', label: 'IG' },
    facebook: { variant: 'facebook' as const, icon: 'fa-brands fa-facebook', label: 'FB' },
  }
  const { variant, icon, label } = map[platform]
  return <Badge variant={variant} icon={icon} size="xs">{label}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeProps['variant']> = {
    open: 'success',
    pending: 'warning',
    closed: 'ghost',
    snoozed: 'info',
  }
  return (
    <Badge variant={map[status] ?? 'default'} dot size="xs">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export function TemplateBadge({ status }: { status: string }) {
  const map: Record<string, BadgeProps['variant']> = {
    approved: 'success',
    pending: 'warning',
    rejected: 'danger',
    draft: 'ghost',
    paused: 'info',
    disabled: 'ghost',
  }
  return (
    <Badge variant={map[status] ?? 'default'} size="xs">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
