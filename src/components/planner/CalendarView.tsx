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
      const postDate = new Date(post.scheduled_for)
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
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dayPosts.map((post, idx) => (
                  <div key={idx} className="scheduled-post" onClick={(e) => { e.stopPropagation(); /* edit post */ }}>
                    <div className="post-header">
                      <span className="post-time">
                        {new Date(post.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className={`post-status ${post.status}`}></div>
                    </div>
                    <div className="post-caption">{post.caption}</div>
                    <div className="post-platforms">
                      {post.platform.includes('instagram') && <i className="fa-brands fa-instagram" style={{ color: '#E1306C', fontSize: '12px' }}></i>}
                      {post.platform.includes('facebook') && <i className="fa-brands fa-facebook" style={{ color: '#1877F2', fontSize: '12px' }}></i>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
