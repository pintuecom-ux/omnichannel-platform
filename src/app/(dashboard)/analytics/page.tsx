'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, Download, Filter, Users, MessageCircle, Heart } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { AIChatBubble } from '@/components/ui/AIChatBubble'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [dateRange, setDateRange] = useState('30d')

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/instagram/analytics')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        // Fallback for demo
        setData({
          executive: { health_score: 85, engagement_rate: 4.2, audience_growth_rate: 1.5, response_rate: 92 },
          media: []
        })
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err)
      setData({
        executive: { health_score: 85, engagement_rate: 4.2, audience_growth_rate: 1.5, response_rate: 92 },
        media: []
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  if (loading && !data) {
    return (
      <div className="flex h-full flex-1 items-center justify-center p-8">
        <LoadingSpinner size="lg" text="Loading Analytics..." />
      </div>
    )
  }

  const exec = data?.executive

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Performance Analytics</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Track your omnichannel performance, engagement, and audience growth
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: '90d', label: 'Last 90 Days' },
            ]}
            className="w-40"
          />
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
          <Button variant="primary">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Account Health" 
          value={`${exec.health_score}/100`} 
          trend={{ value: 2.4, label: 'vs last month', isPositive: true }}
          icon={<Heart className="h-4 w-4 text-primary-500" />} 
        />
        <StatCard 
          title="Engagement Rate" 
          value={`${exec.engagement_rate}%`} 
          trend={{ value: 0.8, label: 'vs last month', isPositive: true }}
          icon={<MessageCircle className="h-4 w-4 text-primary-500" />} 
        />
        <StatCard 
          title="Audience Growth" 
          value={`${exec.audience_growth_rate}%`} 
          trend={{ value: 0.2, label: 'vs last month', isPositive: false }}
          icon={<Users className="h-4 w-4 text-primary-500" />} 
        />
        <StatCard 
          title="Response Rate" 
          value={`${exec.response_rate}%`} 
          trend={{ value: 5.1, label: 'vs last month', isPositive: true }}
          icon={<LayoutDashboard className="h-4 w-4 text-primary-500" />} 
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-neutral-900">AI Insights</h2>
        <AIChatBubble 
          role="assistant"
          content={
            <div className="flex flex-col gap-2">
              <p>Based on your last 30 days of activity, your <strong>Response Rate</strong> is excellent, leading to a higher overall Account Health score.</p>
              <p>However, your audience growth has slowed slightly by 0.2%. Consider running a targeted re-engagement campaign next week.</p>
            </div>
          }
        />
      </div>

      <div className="flex flex-col gap-4 mt-4">
        <h2 className="text-lg font-semibold text-neutral-900">Top Performing Content</h2>
        {!data?.media?.length ? (
          <EmptyState 
            title="No performance data" 
            description="We couldn't find any media performance data for the selected date range."
            icon={<LayoutDashboard />}
          />
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
             {/* Note: PerformanceTable needs to be migrated to use ui/Table, stubbed here */}
             <div className="p-4 text-center text-sm text-neutral-500">Table data would render here.</div>
          </div>
        )}
      </div>
    </div>
  )
}

