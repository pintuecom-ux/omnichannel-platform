'use client'

import React, { useState } from 'react'
import { Contact } from '@/types'
import { Activity, Clock, MessageCircle, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Contact360MainWorkspaceProps {
  contact: Contact
}

export function Contact360MainWorkspace({ contact }: Contact360MainWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="h-full flex flex-col bg-base">
      
      {/* Sticky Tab Header */}
      <div className="flex-none border-b border-border bg-base px-6 pt-4 sticky top-0 z-10 shrink-0">
        <div className="flex space-x-6 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'overview' ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'timeline' ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            Timeline
          </button>
          <button 
            onClick={() => setActiveTab('conversations')}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'conversations' ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            Conversations
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'campaigns' ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            Campaigns
          </button>
          <button 
            onClick={() => setActiveTab('metadata')}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'metadata' ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            Fields & Metadata
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-base">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-start">
            
            {/* Recent Activity Mini */}
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-text-primary">Recent Activity</h3>
              </div>
              <div className="text-center py-10 text-sm text-text-secondary italic">
                No recent activity found.
              </div>
            </div>

            {/* CRM Insights */}
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-text-primary">Insights</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-panel p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary mb-1">Total Orders</div>
                  <div className="text-xl font-semibold text-text-muted">—</div>
                </div>
                <div className="bg-panel p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary mb-1">Total Revenue</div>
                  <div className="text-xl font-semibold text-text-muted">—</div>
                </div>
                <div className="bg-panel p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary mb-1">Avg Reply Time</div>
                  <div className="text-xl font-semibold text-text-muted">—</div>
                </div>
                <div className="bg-panel p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary mb-1">Active Since</div>
                  <div className="text-lg font-semibold text-text-primary truncate">
                    {contact.created_at ? new Date(contact.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="h-full flex items-center justify-center text-text-secondary bg-surface border border-border rounded-lg min-h-[300px]">
            <div className="text-center flex flex-col items-center gap-3">
              <Clock className="h-10 w-10 text-text-secondary opacity-50" />
              <p>Full Unified Event Timeline goes here.</p>
            </div>
          </div>
        )}

        {/* CONVERSATIONS TAB */}
        {activeTab === 'conversations' && (
          <div className="h-full flex items-center justify-center text-text-secondary bg-surface border border-border rounded-lg min-h-[300px]">
            <div className="text-center flex flex-col items-center gap-3">
              <MessageCircle className="h-10 w-10 text-text-secondary opacity-50" />
              <p>Embedded inbox view goes here.</p>
            </div>
          </div>
        )}

        {/* CAMPAIGNS TAB */}
        {activeTab === 'campaigns' && (
          <div className="h-full flex items-center justify-center text-text-secondary bg-surface border border-border rounded-lg min-h-[300px]">
            <div className="text-center flex flex-col items-center gap-3">
              <Activity className="h-10 w-10 text-text-secondary opacity-50" />
              <p>Campaign history goes here.</p>
            </div>
          </div>
        )}

        {/* METADATA TAB */}
        {activeTab === 'metadata' && (
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm max-w-2xl mx-auto mt-4">
            <div className="flex items-center gap-2 mb-4 border-b border-border pb-4">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-text-primary">Custom Fields & Metadata</h3>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              Manage extensible fields defined in the Field Registry.
            </p>
            <div className="text-center py-8 text-sm text-text-secondary italic bg-panel rounded border border-border">
              No custom fields found for this contact.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
