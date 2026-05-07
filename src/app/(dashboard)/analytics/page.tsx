'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, Download, Filter, Loader2, ArrowUpRight, ArrowDownRight, Users, MessageCircle, Heart, Eye } from 'lucide-react'
import PerformanceTable from '@/components/analytics/PerformanceTable'

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
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  if (loading && !data) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  const exec = data?.executive || {
    health_score: 85,
    engagement_rate: 4.2,
    audience_growth_rate: 1.5,
    response_rate: 92
  }

  return (
    <div className="page-planner" style={{ maxWidth: '1400px' }}>
      <div className="planner-header">
        <div>
          <h1>Performance Analytics</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Track your omnichannel performance, engagement, and audience growth
          </div>
        </div>
        
        <div className="planner-controls">
          <select 
            className="form-textarea" 
            style={{ minHeight: 'unset', padding: '8px 12px', width: 'auto' }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="planner-btn" style={{ padding: '8px 12px' }}>
            <Filter size={16} /> Filters
          </button>
          <button className="planner-btn primary" style={{ padding: '8px 12px' }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        <MetricCard 
          title="Account Health" 
          value={`${exec.health_score}/100`} 
          trend={+2.4} 
          icon={<Heart size={16} color="var(--accent)" />} 
        />
        <MetricCard 
          title="Engagement Rate" 
          value={`${exec.engagement_rate}%`} 
          trend={+0.8} 
          icon={<MessageCircle size={16} color="var(--accent2)" />} 
        />
        <MetricCard 
          title="Audience Growth" 
          value={`${exec.audience_growth_rate}%`} 
          trend={-0.2} 
          icon={<Users size={16} color="var(--accent3)" />} 
        />
        <MetricCard 
          title="Response Rate" 
          value={`${exec.response_rate}%`} 
          trend={+5.1} 
          icon={<LayoutDashboard size={16} color="var(--accent4)" />} 
        />
      </div>

      <div className="table-card" style={{ marginTop: '32px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Top Performing Content</h2>
        </div>
        <PerformanceTable items={data?.media || []} />
      </div>
    </div>
  )
}

function MetricCard({ title, value, trend, icon }: { title: string, value: string, trend: number, icon: React.ReactNode }) {
  const isPositive = trend >= 0
  return (
    <div className="metric-card">
      <div className="metric-title">
        {icon} {title}
      </div>
      <div className="metric-value">{value}</div>
      <div className={`metric-trend ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {Math.abs(trend)}% vs previous period
      </div>
    </div>
  )
}
