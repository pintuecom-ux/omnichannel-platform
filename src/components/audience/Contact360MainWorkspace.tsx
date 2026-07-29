'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Contact } from '@/types'
import { Activity, Clock, MessageCircle, BarChart3, Settings } from 'lucide-react'

interface Contact360MainWorkspaceProps {
  contact: Contact
}

export function Contact360MainWorkspace({ contact }: Contact360MainWorkspaceProps) {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="overview" className="w-full h-full flex flex-col">
        <div className="border-b border-border bg-base sticky top-0 z-10 px-4 pt-2">
          <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start overflow-x-auto">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="timeline" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium text-text-secondary data-[state=active]:text-text-primary"
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger 
              value="conversations" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium text-text-secondary data-[state=active]:text-text-primary"
            >
              Conversations
            </TabsTrigger>
            <TabsTrigger 
              value="campaigns" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium text-text-secondary data-[state=active]:text-text-primary"
            >
              Campaigns
            </TabsTrigger>
            <TabsTrigger 
              value="metadata" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium text-text-secondary data-[state=active]:text-text-primary"
            >
              Fields & Metadata
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-panel">
          <TabsContent value="overview" className="m-0 space-y-6 h-full outline-none">
            {/* Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Recent Activity Mini */}
              <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Recent Activity</h3>
                </div>
                <div className="text-center py-6 text-sm text-text-secondary">
                  No recent activity found.
                </div>
              </div>

              {/* CRM Insights */}
              <div className="bg-surface border border-border rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Insights</h3>
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
                    <div className="text-xl font-semibold text-text-muted">
                      {contact.created_at ? new Date(contact.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="m-0 h-full flex items-center justify-center text-text-secondary">
            <div className="text-center flex flex-col items-center gap-2">
              <Clock className="h-10 w-10 text-text-secondary opacity-50" />
              <p>Full Unified Event Timeline goes here.</p>
            </div>
          </TabsContent>

          <TabsContent value="conversations" className="m-0 h-full flex items-center justify-center text-text-secondary">
            <div className="text-center flex flex-col items-center gap-2">
              <MessageCircle className="h-10 w-10 text-text-secondary opacity-50" />
              <p>Embedded inbox view goes here.</p>
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="m-0 h-full">
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm max-w-2xl">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Custom Fields & Metadata</h3>
              </div>
              <p className="text-sm text-text-secondary mb-6">
                Manage extensible fields defined in the Field Registry.
              </p>
              
              <div className="space-y-4">
                <div className="text-center py-8 text-sm text-text-secondary italic">
                  No custom fields found for this contact.
                </div>
              </div>
            </div>
          </TabsContent>
          
        </div>
      </Tabs>
    </div>
  )
}
