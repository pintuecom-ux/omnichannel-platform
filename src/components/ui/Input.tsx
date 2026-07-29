/**
 * src/components/ui/Input.tsx
 *
 * Shared input/textarea/select components.
 * Replaces raw <input className="form-input"> scattered across files.
 */

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

// ── Text Input ───────────────────────────────────────────────────────────────

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string // fa class shown inside left edge
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, hint, className, id, ...rest }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <i
              className={cn(icon, 'absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none')}
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 border-[var(--border)]',
              icon && 'pl-9',
              error && 'border-danger-500 focus-visible:ring-danger-500 focus-visible:border-danger-500',
              className
            )}
            {...rest}
          />
        </div>
        {error && <span className="text-xs font-medium text-danger-500">{error}</span>}
        {hint && !error && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ── Textarea ─────────────────────────────────────────────────────────────────

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...rest }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor={inputId}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 border-[var(--border)]',
            error && 'border-danger-500 focus-visible:ring-danger-500 focus-visible:border-danger-500',
            className
          )}
          {...rest}
        />
        {error && <span className="text-xs font-medium text-danger-500">{error}</span>}
        {hint && !error && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

// ── Select ───────────────────────────────────────────────────────────────────

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...rest }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'flex h-10 w-full appearance-none rounded-lg border bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 border-[var(--border)]',
              error && 'border-danger-500 focus-visible:ring-danger-500 focus-visible:border-danger-500',
              className
            )}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map(opt => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                {opt.label}
              </option>
            ))}
          </select>
          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs pointer-events-none" />
        </div>
        {error && <span className="text-xs font-medium text-danger-500">{error}</span>}
        {hint && !error && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
      </div>
    )
  }
)
Select.displayName = 'Select'

export default Input
