'use client'
import { formatMessageTime } from '@/lib/utils'
import type { Message } from '@/types'

interface Props {
  message: Message
}

export default function MessageBubble({ message: msg }: Props) {
  const isOut = msg.direction === 'outbound'
  const time = formatMessageTime(msg.created_at)

  // Internal note
  if (msg.is_note) {
    return (
      <div className="note-item fade-in">
        <div className="note-header">
          <div className="note-author">
            {msg.sender?.full_name?.slice(0, 2).toUpperCase() || 'ME'}
          </div>
          <span className="note-name">{msg.sender?.full_name || 'You'}</span>
          <span className="note-time">{time}</span>
        </div>
        <div className="note-body">{msg.body}</div>
      </div>
    )
  }

  // Comment (from Instagram/Facebook post)
  if (msg.content_type === 'comment') {
    const from = msg.meta?.from
    return (
      <div className="comment-item fade-in">
        <div className="comment-header">
          <div
            className="msg-avatar"
            style={{ width: 32, height: 32, fontSize: 12, background: '#6a1575', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#fff', fontWeight: 700 }}
          >
            {(from?.username || from?.name || '?').slice(0, 2).toUpperCase()}
          </div>
          <span className="comment-username">
            {from?.username ? `@${from.username}` : (from?.name || 'Unknown')}
          </span>
          {msg.meta?.post_id && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Post comment
            </span>
          )}
        </div>
        {msg.meta?.post_id && (
          <div className="comment-time">
            Post: {msg.meta.post_id.slice(0, 20)}…
          </div>
        )}
        <div className="comment-text">{msg.body}</div>
        <div className="comment-actions">
          <button className="comment-action reply">
            <i className="fa-solid fa-reply" /> Reply
          </button>
          <button className="comment-action">
            <i className="fa-solid fa-heart" /> Like
          </button>
          <button className="comment-action">
            <i className="fa-solid fa-eye-slash" /> Hide
          </button>
          <button className="comment-action convert">
            <i className="fa-solid fa-arrow-right" /> → DM
          </button>
        </div>
      </div>
    )
  }

  // Image message
  if (msg.content_type === 'image' && msg.media_url) {
    return (
      <div className={`msg-row ${isOut ? 'out' : 'in'} fade-in`}>
        {!isOut && (
          <div className="msg-avatar" style={{ background: '#1a6b3a' }}>
            {(msg.meta?.from || 'U').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="bubble has-media">
          <img src={msg.media_url} alt="media" />
          {msg.body && <p style={{ marginTop: 6, fontSize: 13 }}>{msg.body}</p>}
          <div className="bubble-meta">
            <span className="bubble-time">{time}</span>
            {isOut && <TickIcon status={msg.status} />}
          </div>
        </div>
      </div>
    )
  }

  // Document
  if (msg.content_type === 'document') {
    const filename = msg.meta?.filename || msg.meta?.document?.filename || 'Document'
    return (
      <div className={`msg-row ${isOut ? 'out' : 'in'} fade-in`}>
        {!isOut && <div className="msg-avatar" style={{ background: '#1a6b3a' }}>IN</div>}
        <div className="bubble">
          <div className="pdf-attachment">
            <div className="pdf-icon">PDF</div>
            <div className="pdf-info">
              <div className="pdf-name">{filename}</div>
              <div className="pdf-meta">{msg.media_mime || 'Document'}</div>
            </div>
            <i className="fa-solid fa-download" style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 13 }} />
          </div>
          <div className="bubble-meta">
            <span className="bubble-time">{time}</span>
            {isOut && <TickIcon status={msg.status} />}
          </div>
        </div>
      </div>
    )
  }

  // Audio
  if (msg.content_type === 'audio') {
    return (
      <div className={`msg-row ${isOut ? 'out' : 'in'} fade-in`}>
        {!isOut && <div className="msg-avatar" style={{ background: '#1a6b3a' }}>IN</div>}
        <div className="bubble">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-microphone" style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Voice message</span>
          </div>
          <div className="bubble-meta">
            <span className="bubble-time">{time}</span>
            {isOut && <TickIcon status={msg.status} />}
          </div>
        </div>
      </div>
    )
  }

  // Default: text message
  return (
    <div className={`msg-row ${isOut ? 'out' : 'in'} fade-in`}>
      {!isOut && (
        <div className="msg-avatar" style={{ background: '#1a6b3a' }}>
          {(msg.meta?.from_name || msg.meta?.from || 'IN').slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="bubble">
        {msg.body}
        <div className="bubble-meta">
          <span className="bubble-time">{time}</span>
          {isOut && <TickIcon status={msg.status} />}
        </div>
      </div>
    </div>
  )
}

function TickIcon({ status }: { status: string }) {
  if (status === 'read') {
    return (
      <span className="bubble-ticks">
        <i className="fa-solid fa-check-double" style={{ color: 'var(--accent2)' }} />
      </span>
    )
  }
  if (status === 'delivered') {
    return (
      <span className="bubble-ticks">
        <i className="fa-solid fa-check-double" />
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="bubble-ticks" style={{ color: '#e84040' }}>
        <i className="fa-solid fa-circle-exclamation" />
      </span>
    )
  }
  return (
    <span className="bubble-ticks sent">
      <i className="fa-solid fa-check" />
    </span>
  )
}