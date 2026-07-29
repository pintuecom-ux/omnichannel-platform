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
    <div className="h-full flex flex-col bg-base relative z-10">
      
      {/* Sticky Tab Header */}
      <div className="flex-none border-b border-border bg-base px-8 pt-6 sticky top-0 z-10 shrink-0">
        <div className="flex space-x-8 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'overview' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={cn(
              "pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'timeline' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            Timeline
          </button>
          <button 
            onClick={() => setActiveTab('conversations')}
            className={cn(
              "pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'conversations' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            Conversations
          </button>
          <button 
            onClick={() => setActiveTab('fields')}
            className={cn(
              "pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", 
              activeTab === 'fields' ? "border-primary-500 text-primary-400" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            Fields & Metadata
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6 h-full items-start">
            
            {/* Recent Activity Mini */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white">Recent Activity</h3>
              </div>
              
              {/* Timeline (Properly aligned for 2 columns) */}
              <div className="flex flex-col gap-4 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                
                <div className="relative flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-surface shadow shrink-0 z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                  </div>
                  <div className="flex-1 p-4 rounded-lg border border-border bg-panel shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white text-sm">Message Sent</div>
                      <time className="text-xs font-medium text-text-secondary">2 hours ago</time>
                    </div>
                    <div className="text-text-secondary text-xs">System sent automated greeting via WhatsApp.</div>
                  </div>
                </div>

                <div className="relative flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-surface shadow shrink-0 z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 p-4 rounded-lg border border-border bg-panel shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white text-sm">Message Read</div>
                      <time className="text-xs font-medium text-text-secondary">3 hours ago</time>
                    </div>
                    <div className="text-text-secondary text-xs">User read the pricing update broadcast.</div>
                  </div>
                </div>

              </div>
            </div>

            {/* CRM Insights */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white">Insights</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Total Orders</div>
                  <div className="text-2xl font-semibold text-white">4</div>
                </div>
                <div className="bg-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Total Revenue</div>
                  <div className="text-2xl font-semibold text-white">$1,299</div>
                </div>
                <div className="bg-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Avg Reply Time</div>
                  <div className="text-2xl font-semibold text-white">14m</div>
                </div>
                <div className="bg-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Active Since</div>
                  <div className="text-xl font-semibold text-white truncate">
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

        {/* FIELDS TAB */}
        {activeTab === 'fields' && (
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Settings className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="font-semibold text-white">Custom Fields & Metadata</h3>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              Manage extensible fields defined in the Field Registry.
            </p>
            <div className="text-center py-10 text-sm text-text-secondary italic bg-panel rounded-lg border border-border">
              No custom fields found for this contact.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
