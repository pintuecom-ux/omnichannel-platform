import React from 'react'

export function Tabs({ children, defaultValue, ...props }: any) {
  return <div {...props}>{children}</div>
}
export function TabsList({ children, ...props }: any) {
  return <div {...props}>{children}</div>
}
export function TabsTrigger({ children, value, ...props }: any) {
  return <button {...props}>{children}</button>
}
export function TabsContent({ children, value, ...props }: any) {
  return <div {...props}>{children}</div>
}
