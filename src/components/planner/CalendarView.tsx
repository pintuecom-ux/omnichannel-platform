'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarViewProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  posts: any[]
  onDayClick: (date: Date) => void
}

export default function CalendarView({ currentDate, onPrevMonth, onNextMonth, posts, onDayClick }: CalendarViewProps) {
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    
    // Previous month padding
    const firstDayOfWeek = firstDay.getDay()
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false
      })
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }
    
    // Next month padding
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }
    
    return days
  }, [currentDate])

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear()
  }

  const getPostsForDay = (date: Date) => {
    return posts.filter(post => {
      const rawDate = post.scheduled_for || post.timestamp
      if (!rawDate) return false
      const postDate = new Date(rawDate)
      return postDate.getDate() === date.getDate() &&
             postDate.getMonth() === date.getMonth() &&
             postDate.getFullYear() === date.getFullYear()
    })
  }

  return (
    <div className="calendar-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="planner-btn" onClick={onPrevMonth} style={{ padding: '6px' }}>
            <ChevronLeft size={20} />
          </button>
          <button className="planner-btn" onClick={onNextMonth} style={{ padding: '6px' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="calendar-header-row">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-header-cell">{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {daysInMonth.map((dayObj, i) => {
          const dayPosts = getPostsForDay(dayObj.date)
          return (
            <div 
              key={i} 
              className={`calendar-day ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isToday(dayObj.date) ? 'today' : ''}`}
              onClick={() => onDayClick(dayObj.date)}
            >
              <span className="day-number">{dayObj.date.getDate()}</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 4 }}>
                {dayPosts.map((post, idx) => {
                  const rawDate = post.scheduled_for || post.timestamp
                  const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                  const isPublished = post.status === 'published' || post.type === 'published'

                  return (
                    <div
                      key={idx}
                      className="scheduled-post"
                      style={{
                        padding: '4px 6px',
                        borderRadius: 6,
                        background: isPublished ? 'rgba(37,211,102,0.12)' : 'rgba(0,168,232,0.12)',
                        border: `1px solid ${isPublished ? 'rgba(37,211,102,0.3)' : 'rgba(0,168,232,0.3)'}`,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (post.permalink) window.open(post.permalink, '_blank')
                      }}
                    >
                      <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span className="post-time" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {timeStr}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: isPublished ? '#25d366' : '#00a8e8',
                            color: '#000',
                            textTransform: 'uppercase',
                          }}
                        >
                          {isPublished ? 'Published' : 'Scheduled'}
                        </span>
                      </div>
                      <div className="post-caption" style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.caption || 'Social Media Post'}
                      </div>
                      <div className="post-platforms" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                        {post.platform?.includes('instagram') && <i className="fa-brands fa-instagram" style={{ color: '#E1306C', fontSize: '11px' }} />}
                        {post.platform?.includes('facebook') && <i className="fa-brands fa-facebook" style={{ color: '#1877F2', fontSize: '11px' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
