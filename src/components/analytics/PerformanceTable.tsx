'use client'

import { ExternalLink, MessageCircle, Heart, Eye, MousePointerClick } from 'lucide-react'

interface PerformanceTableProps {
  items: any[]
}

export default function PerformanceTable({ items }: PerformanceTableProps) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No content data available for this period.
      </div>
    )
  }

  return (
    <table className="analytics-table">
      <thead>
        <tr>
          <th>Post</th>
          <th>Type</th>
          <th>Published</th>
          <th>Likes</th>
          <th>Comments</th>
          <th>Reach/Impressions</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const metrics = item.metrics || {}
          return (
            <tr key={item.id || idx}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '8px', 
                    background: '#eee',
                    backgroundImage: `url(${item.thumbnail_url || item.media_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0
                  }} />
                  <div style={{ 
                    maxWidth: '200px', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontSize: '13px',
                    color: 'var(--text-primary)'
                  }}>
                    {item.caption || 'No caption'}
                  </div>
                </div>
              </td>
              <td style={{ textTransform: 'capitalize', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {item.media_type?.toLowerCase() || 'image'}
              </td>
              <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'N/A'}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <Heart size={14} color="var(--text-muted)" />
                  {item.like_count || metrics.likes || 0}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <MessageCircle size={14} color="var(--text-muted)" />
                  {item.comment_count || metrics.comments || 0}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <Eye size={14} color="var(--text-muted)" />
                  {(metrics.reach || metrics.impressions || 0).toLocaleString()}
                </div>
              </td>
              <td>
                {item.permalink ? (
                  <a 
                    href={item.permalink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="planner-btn"
                    style={{ display: 'inline-flex', padding: '6px 12px', textDecoration: 'none', width: 'max-content' }}
                  >
                    View Post <ExternalLink size={14} />
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No Link</span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
