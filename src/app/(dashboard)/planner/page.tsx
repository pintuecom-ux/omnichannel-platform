'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar as CalendarIcon, LayoutList, Loader2 } from 'lucide-react'
import CalendarView from '@/components/planner/CalendarView'
import CreatePostModal from '@/components/planner/CreatePostModal'

export default function PlannerPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPublications = async () => {
    try {
      const res = await fetch('/api/instagram/publications')
      if (res.ok) {
        const data = await res.json()
        setScheduledPosts(data.publications || [])
      }
    } catch (err) {
      console.error('Failed to fetch publications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPublications()
  }, [])

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  return (
    <div className="page-planner">
      <div className="planner-header">
        <div>
          <h1>Content Planner</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Plan, schedule, and publish content across Instagram and Facebook
          </div>
        </div>
        
        <div className="planner-controls">
          <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px' }}>
            <button 
              onClick={() => setView('calendar')}
              style={{
                background: view === 'calendar' ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                color: view === 'calendar' ? 'var(--text-main)' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              <CalendarIcon size={16} /> Calendar
            </button>
            <button 
              onClick={() => setView('list')}
              style={{
                background: view === 'list' ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                color: view === 'list' ? 'var(--text-main)' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              <LayoutList size={16} /> List
            </button>
          </div>

          <button className="planner-btn primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} /> Create Post
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto 12px' }} size={32} />
          Loading content calendar...
        </div>
      ) : view === 'calendar' ? (
        <CalendarView 
          currentDate={currentDate}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          posts={scheduledPosts}
          onDayClick={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          List view is under construction. Please use the Calendar view.
        </div>
      )}

      {isCreateModalOpen && (
        <CreatePostModal 
          onClose={() => setIsCreateModalOpen(false)}
          onSave={() => {
            setIsCreateModalOpen(false)
            fetchPublications()
          }}
        />
      )}
    </div>
  )
}
