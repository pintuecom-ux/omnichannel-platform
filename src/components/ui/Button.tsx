/**
 * src/components/ui/Button.tsx
 *
 * Shared button component. Replaces the 12+ inline button variants
 * scattered across page files. All variants, sizes, and states in one place.
 */

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--accent)] text-white hover:opacity-90 shadow-sm font-semibold',
        secondary: 'bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-active)] border border-[var(--border)]',
        danger: 'bg-danger-600 text-white hover:bg-danger-700 shadow-sm',
        ghost: 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        outline: 'border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
        success: 'bg-success-600 text-white hover:bg-success-700 shadow-sm',
      },
      size: {
        xs: 'h-7 rounded-sm px-2 text-xs',
        sm: 'h-8 rounded-md px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 rounded-md px-8',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  icon?: string // e.g. "fa-solid fa-paper-plane"
  iconRight?: string
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      icon,
      iconRight,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <i className="fa-solid fa-spinner fa-spin mr-2" />
        ) : icon ? (
          <i className={cn(icon, children ? 'mr-2' : '')} />
        ) : null}
        
        {children}
        
        {!loading && iconRight && (
          <i className={cn(iconRight, children ? 'ml-2' : '')} />
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button

// ── Named exports for convenience ────────────────────────────────────────────

export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="danger" {...props} />
}

export function GhostButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="ghost" {...props} />
}
