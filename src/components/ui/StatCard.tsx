import React from 'react'
import { cn } from '@/lib/utils'

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
}

export function StatCard({ title, value, icon, trend, className, ...props }: StatCardProps) {
  return (
    <div
      className={cn("rounded-xl border border-neutral-200 bg-white p-6 shadow-sm", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
        {icon && <div className="text-neutral-400">{icon}</div>}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold tracking-tight text-neutral-900">{value}</div>
        {trend && (
          <div className="flex items-center gap-1.5 mt-1 text-sm">
            <span
              className={cn(
                "font-medium",
                trend.isPositive ? "text-success-600" : "text-danger-600"
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-neutral-500">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  )
}
