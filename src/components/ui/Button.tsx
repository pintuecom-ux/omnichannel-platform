/**
 * src/components/ui/Button.tsx
 *
 * Shared button component. Replaces the 12+ inline button variants
 * scattered across page files. All variants, sizes, and states in one place.
 */

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success'
export type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  loading?:  boolean
  icon?:     string       // fa class e.g. "fa-solid fa-paper-plane"
  iconRight?: string
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger:    'btn btn-danger',
  ghost:     'btn btn-ghost',
  outline:   'btn btn-outline',
  success:   'btn btn-success',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = 'primary',
      size      = 'md',
      loading   = false,
      icon,
      iconRight,
      fullWidth = false,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={cn(
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'btn-full',
          className
        )}
        disabled={isDisabled}
        {...rest}
      >
        {loading ? (
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: children ? 6 : 0 }} />
        ) : icon ? (
          <i className={icon} style={{ marginRight: children ? 6 : 0 }} />
        ) : null}

        {children}

        {!loading && iconRight && (
          <i className={iconRight} style={{ marginLeft: children ? 6 : 0 }} />
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
