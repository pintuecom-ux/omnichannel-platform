'use client'
import React, { useState } from 'react'
import { MessageCircle, Mail, Phone, ExternalLink, Calendar, MessageSquare, ArrowUpRight, Share2, Globe, Users } from 'lucide-react'

interface TimelineEvent {
  id: string
  type: 'whatsapp' | 'email' | 'facebook' | 'sms' | 'note' | 'system'
  content: string
  timestamp: string
  direction: 'inbound' | 'outbound' | 'internal'
}

export function OmnichannelTimeline({ contactId }: { contactId: string }) {
  // Mock data for the unified timeline
  const [events] = useState<TimelineEvent[]>([
    {
      id: '1',
      type: 'whatsapp',
      direction: 'inbound',
      content: 'Hello, I am interested in upgrading my plan to Enterprise. Can we schedule a call?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: '2',
      type: 'note',
      direction: 'internal',
      content: 'Lead is highly qualified. Assigned to Sarah for follow-up.',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    {
      id: '3',
      type: 'email',
      direction: 'outbound',
      content: 'Subject: React Commerce Enterprise Plan Details\n\nHi there, thanks for your interest...',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    },
    {
      id: '4',
      type: 'facebook',
      direction: 'inbound',
      content: 'Liked our post on the new feature release.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
    }
  ])

  const getIcon = (type: string) => {
    switch(type) {
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-green-400" />
      case 'email': return <Mail className="w-4 h-4 text-blue-400" />
      case 'facebook': return <Users className="w-4 h-4 text-blue-600" />
      case 'sms': return <MessageSquare className="w-4 h-4 text-purple-400" />
      case 'note': return <Calendar className="w-4 h-4 text-amber-400" />
      default: return <ExternalLink className="w-4 h-4 text-text-muted" />
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Unified Timeline</h3>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-surface text-text-secondary rounded-lg text-xs font-medium border border-border hover:text-white">Filter</button>
          <button className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-medium">Add Note</button>
        </div>
      </div>
      
      <div className="relative pl-6 before:absolute before:inset-0 before:ml-[11px] before:w-px before:bg-border space-y-6">
        {events.map(event => (
          <div key={event.id} className="relative flex items-start gap-4">
            <div className="absolute -left-[30px] w-6 h-6 rounded-full bg-panel border border-border flex items-center justify-center shadow-md">
              {getIcon(event.type)}
            </div>
            
            <div className="flex-1 bg-surface border border-border rounded-xl p-4 shadow-sm group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    {event.type}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${event.direction === 'inbound' ? 'bg-green-500/10 text-green-400' : event.direction === 'outbound' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {event.direction}
                  </span>
                </div>
                <time className="text-xs text-text-muted">{new Date(event.timestamp).toLocaleString()}</time>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{event.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
