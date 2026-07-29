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
        <div className="border-b border-[var(--border)] bg-[var(--bg-base)] sticky top-0 z-10 px-4 pt-2">
          <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start overflow-x-auto">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="timeline" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium text-[var(--text-secondary)] data-[state=active]:text-[var(--text-primary)]"
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger 
              value="conversations" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium text-[var(--text-secondary)] data-[state=active]:text-[var(--text-primary)]"
            >
              Conversations
            </TabsTrigger>
            <TabsTrigger 
              value="campaigns" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium text-[var(--text-secondary)] data-[state=active]:text-[var(--text-primary)]"
            >
              Campaigns
            </TabsTrigger>
            <TabsTrigger 
              value="metadata" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium text-[var(--text-secondary)] data-[state=active]:text-[var(--text-primary)]"
            >
              Fields & Metadata
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-panel)]">
          <TabsContent value="overview" className="m-0 space-y-6 h-full outline-none">
            {/* Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Recent Activity Mini */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Recent Activity</h3>
                </div>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border)] before:to-transparent">
                  {/* Mock Activity 1 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-primary bg-[var(--bg-base)] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">Added to VIP List</span>
                        <time className="text-xs font-medium text-[var(--text-secondary)]">Just now</time>
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">Automated rule executed by Segments.</div>
                    </div>
                  </div>
                  {/* Mock Activity 2 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-[var(--border)] bg-[var(--bg-base)] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">WhatsApp Replied</span>
                        <time className="text-xs font-medium text-[var(--text-secondary)]">2 hrs ago</time>
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">"I am looking for the summer collection."</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CRM Insights */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Insights</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border)]">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Total Orders</div>
                    <div className="text-2xl font-bold">2</div>
                  </div>
                  <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border)]">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold">$125.00</div>
                  </div>
                  <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border)]">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Avg Reply Time</div>
                    <div className="text-2xl font-bold">12m</div>
                  </div>
                  <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border)]">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Active Since</div>
                    <div className="text-2xl font-bold">Nov 2025</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="m-0 h-full flex items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center flex flex-col items-center gap-2">
              <Clock className="h-10 w-10 text-[var(--text-secondary)] opacity-50" />
              <p>Full Unified Event Timeline goes here.</p>
            </div>
          </TabsContent>

          <TabsContent value="conversations" className="m-0 h-full flex items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center flex flex-col items-center gap-2">
              <MessageCircle className="h-10 w-10 text-[var(--text-secondary)] opacity-50" />
              <p>Embedded inbox view goes here.</p>
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="m-0 h-full">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 shadow-sm max-w-2xl">
              <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Custom Fields & Metadata</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Manage extensible fields defined in the Field Registry.
              </p>
              
              <div className="space-y-4">
                {/* Mock field representation */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium">Membership Tier</label>
                  <div className="col-span-2 text-sm bg-[var(--bg-panel)] px-3 py-2 rounded border border-[var(--border)]">Gold</div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <div className="col-span-2 text-sm bg-[var(--bg-panel)] px-3 py-2 rounded border border-[var(--border)]">1990-05-15</div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium">Last NPS Score</label>
                  <div className="col-span-2 text-sm bg-[var(--bg-panel)] px-3 py-2 rounded border border-[var(--border)]">9</div>
                </div>
              </div>
            </div>
          </TabsContent>
          
        </div>
      </Tabs>
    </div>
  )
}
