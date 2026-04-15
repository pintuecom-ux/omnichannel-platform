import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getAvatarColor(id: string): string {
  const colors = [
    '#1a6b3a', '#6a3a1a', '#1a3a6a',
    '#4a1a6a', '#1a4a4a', '#2a1a4a',
    '#6b1a3a', '#1a5a6a', '#3a6a1a',
  ]
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function formatConvTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  try {
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else {
      return format(date, 'dd/MM/yy')
    }
  } catch {
    return ''
  }
}

export function formatMessageTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return format(new Date(dateStr), 'HH:mm')
  } catch {
    return ''
  }
}

export function formatMessageDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  try {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'dd MMM yyyy')
  } catch {
    return ''
  }
}

export function truncate(str: string | null | undefined, len = 40): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}