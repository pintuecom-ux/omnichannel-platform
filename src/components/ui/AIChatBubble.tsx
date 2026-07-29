import React from 'react'
import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'

export interface AIChatBubbleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'content'> {
  role: 'user' | 'assistant'
  content: React.ReactNode
  timestamp?: string
}

export function AIChatBubble({ role, content, timestamp, className, ...props }: AIChatBubbleProps) {
  const isAssistant = role === 'assistant'

  return (
    <div
      className={cn(
        "flex w-full gap-4 p-4",
        isAssistant ? "bg-primary-50/50" : "bg-white",
        className
      )}
      {...props}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow-sm",
        isAssistant ? "bg-primary-600 border-primary-700 text-white" : "bg-white border-neutral-200 text-neutral-600"
      )}>
        {isAssistant ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
      </div>
      <div className="flex flex-col gap-1 w-full min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">
            {isAssistant ? 'Omni AI' : 'You'}
          </span>
          {timestamp && <span className="text-xs text-neutral-400">{timestamp}</span>}
        </div>
        <div className="text-sm text-neutral-700 prose prose-sm max-w-none break-words">
          {content}
        </div>
      </div>
    </div>
  )
}
