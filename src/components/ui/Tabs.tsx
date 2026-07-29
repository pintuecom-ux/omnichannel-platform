import React from 'react'
import { cn } from '@/lib/utils'

export function Tabs({ className, defaultValue, value, onValueChange, ...props }: React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string, value?: string, onValueChange?: (val: string) => void }) {
  return <div className={cn("flex flex-col w-full", className)} {...props} />
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-start border-b border-neutral-200 w-full gap-4",
        className
      )}
      {...props}
    />
  )
}
export function TabsTrigger({ className, active, value, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean, value?: string }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-1 py-2 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active
          ? "border-b-2 border-primary-600 text-primary-600"
          : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300",
        className
      )}
      {...props}
    />
  )
}
export function TabsContent({ className, value, ...props }: React.HTMLAttributes<HTMLDivElement> & { value?: string }) {
  return (
    <div
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
}
