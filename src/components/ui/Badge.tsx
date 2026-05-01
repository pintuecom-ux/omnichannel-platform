/**
 * src/components/ui/Badge.tsx
 *
 * Shared badge / pill / status chip component.
 * Replaces 20+ inline badge spans across page files.
 */

import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'ghost'

export type BadgeSize = 'xs' | 'sm' | 'md'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?:    BadgeSize
  dot?:     boolean         // show a colored dot before the label
  icon?:    string          // fa icon class
  pill?:    boolean         // fully rounded (default true)
}

const variantStyles: Record<BadgeVariant, string> = {
  default:   'badge-default',
  primary:   'badge-primary',
  success:   'badge-success',
  warning:   'badge-warning',
  danger:    'badge-danger',
  info:      'badge-info',
  whatsapp:  'badge-wa',
  instagram: 'badge-ig',
  facebook:  'badge-fb',
  ghost:     'badge-ghost',
}

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'badge-xs',
  sm: 'badge-sm',
  md: 'badge-md',
}

export default function Badge({
  variant = 'default',
  size    = 'sm',
  dot     = false,
  icon,
  pill    = true,
  children,
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        variantStyles[variant],
        sizeStyles[size],
        pill && 'badge-pill',
        className
      )}
      {...rest}
    >
      {dot && (
        <span
          className="badge-dot"
          aria-hidden="true"
        />
      )}
      {icon && <i className={icon} style={{ marginRight: children ? 4 : 0 }} />}
      {children}
    </span>
  )
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export function PlatformBadge({ platform }: { platform: 'whatsapp' | 'instagram' | 'facebook' }) {
  const map = {
    whatsapp:  { variant: 'whatsapp'  as BadgeVariant, icon: 'fa-brands fa-whatsapp', label: 'WA' },
    instagram: { variant: 'instagram' as BadgeVariant, icon: 'fa-brands fa-instagram', label: 'IG' },
    facebook:  { variant: 'facebook'  as BadgeVariant, icon: 'fa-brands fa-facebook',  label: 'FB' },
  }
  const { variant, icon, label } = map[platform]
  return <Badge variant={variant} icon={icon} size="xs">{label}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    open:    'success',
    pending: 'warning',
    closed:  'ghost',
    snoozed: 'info',
  }
  return (
    <Badge variant={map[status] ?? 'default'} dot size="xs">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export function TemplateBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    approved: 'success',
    pending:  'warning',
    rejected: 'danger',
    draft:    'ghost',
    paused:   'info',
    disabled: 'ghost',
  }
  return (
    <Badge variant={map[status] ?? 'default'} size="xs">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
