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
          <label className="text-sm font-medium text-neutral-900" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <i
              className={cn(icon, 'absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none')}
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-9',
              error ? 'border-danger-500 focus-visible:ring-danger-500 focus-visible:border-danger-500' : 'border-neutral-300',
              className
            )}
            {...rest}
          />
        </div>
        {error && <span className="text-xs font-medium text-danger-600">{error}</span>}
        {hint && !error && <span className="text-xs text-neutral-500">{hint}</span>}
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
          <label className="text-sm font-medium text-neutral-900" htmlFor={inputId}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger-500 focus-visible:ring-danger-500 focus-visible:border-danger-500' : 'border-neutral-300',
            className
          )}
          {...rest}
        />
        {error && <span className="text-xs font-medium text-danger-600">{error}</span>}
        {hint && !error && <span className="text-xs text-neutral-500">{hint}</span>}
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
          <label className="text-sm font-medium text-neutral-900" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'flex h-10 w-full appearance-none rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-danger-500 focus-visible:ring-danger-500 focus-visible:border-danger-500' : 'border-neutral-300',
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
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none" />
        </div>
        {error && <span className="text-xs font-medium text-danger-600">{error}</span>}
        {hint && !error && <span className="text-xs text-neutral-500">{hint}</span>}
      </div>
    )
  }
)
Select.displayName = 'Select'

export default Input
