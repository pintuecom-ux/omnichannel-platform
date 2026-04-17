'use client'
import { formatMessageTime } from '@/lib/utils'
import type { Message } from '@/types'

interface Props {
  message: Message
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
}

export default function MessageBubble({ message: msg, isFirstInGroup = true, isLastInGroup = true }: Props) {
  const isOut = msg.direction === 'outbound'
  const time = formatMessageTime(msg.created_at)

  // ── Internal note ─────────────────────────────────────────────
  if (msg.is_note) {
    return (
      <div className="note-item fade-in">
        <div className="note-header">
          <div className="note-author">{msg.sender?.full_name?.slice(0, 2).toUpperCase() ?? 'ME'}</div>
          <span className="note-name">{msg.sender?.full_name ?? 'You'}</span>
          <span className="note-time">{time}</span>
        </div>
        <div className="note-body">{msg.body}</div>
      </div>
    )
  }

  // ── Comment ───────────────────────────────────────────────────
  if (msg.content_type === 'comment') {
    const from = msg.meta?.from
    return (
      <div className="comment-item fade-in">
        <div className="comment-header">
          <div style={{ width: 32, height: 32, fontSize: 12, background: '#6a1575', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#fff', fontWeight: 700 }}>
            {(from?.username ?? from?.name ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <span className="comment-username">{from?.username ? `@${from.username}` : (from?.name ?? 'Unknown')}</span>
        </div>
        <div className="comment-text">{msg.body}</div>
        <div className="comment-actions">
          <button className="comment-action reply"><i className="fa-solid fa-reply" /> Reply</button>
          <button className="comment-action"><i className="fa-solid fa-heart" /> Like</button>
          <button className="comment-action"><i className="fa-solid fa-eye-slash" /> Hide</button>
          <button className="comment-action convert"><i className="fa-solid fa-arrow-right" /> → DM</button>
        </div>
      </div>
    )
  }

  // ── Template ──────────────────────────────────────────────────
  if (msg.content_type === 'template') {
    return (
      <WaBubble isOut={isOut} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} time={time} status={msg.status} faded>
        <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
          <i className="fa-solid fa-bolt" style={{ marginRight: 4 }} />
          Template: {msg.meta?.template_name ?? 'unknown'}
        </div>
        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</span>
      </WaBubble>
    )
  }

  // ── Image ─────────────────────────────────────────────────────
  if (msg.content_type === 'image' && msg.media_url) {
    return (
      <WaBubble isOut={isOut} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} time={time} status={msg.status} mediaPadding>
        <img src={msg.media_url} alt="media" style={{ borderRadius: 6, maxWidth: 240, display: 'block', width: '100%' }} />
        {msg.body && <p style={{ marginTop: 4, fontSize: 13 }}>{msg.body}</p>}
      </WaBubble>
    )
  }

  // ── Document ──────────────────────────────────────────────────
  if (msg.content_type === 'document') {
    const filename = msg.meta?.filename ?? msg.meta?.document?.filename ?? 'Document'
    return (
      <WaBubble isOut={isOut} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} time={time} status={msg.status}>
        <div className="pdf-attachment">
          <div className="pdf-icon">PDF</div>
          <div className="pdf-info">
            <div className="pdf-name">{filename}</div>
            <div className="pdf-meta">{msg.media_mime ?? 'Document'}</div>
          </div>
          <i className="fa-solid fa-download" style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 13 }} />
        </div>
      </WaBubble>
    )
  }

  // ── Audio ─────────────────────────────────────────────────────
  if (msg.content_type === 'audio') {
    return (
      <WaBubble isOut={isOut} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} time={time} status={msg.status}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: isOut ? 'rgba(255,255,255,0.15)' : 'rgba(37,211,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fa-solid fa-microphone" style={{ color: 'var(--accent)', fontSize: 14 }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Voice message</span>
        </div>
      </WaBubble>
    )
  }

  // ── Default: text ─────────────────────────────────────────────
  return (
    <WaBubble isOut={isOut} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} time={time} status={msg.status}>
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</span>
    </WaBubble>
  )
}

// ── WhatsApp-style bubble wrapper ─────────────────────────────────────────────
interface BubbleProps {
  isOut: boolean
  isFirstInGroup: boolean
  isLastInGroup: boolean
  time: string
  status: string
  children: React.ReactNode
  faded?: boolean
  mediaPadding?: boolean
}

function WaBubble({ isOut, isFirstInGroup, isLastInGroup, time, status, children, faded, mediaPadding }: BubbleProps) {
  // Border radius logic:
  // First in group: tail corner is 0, others 12px
  // Middle: all 12px except tiny corner 4px on sender side
  // Last in group: normal (handled by ::after tail in CSS)
  const br = getBorderRadius(isOut, isFirstInGroup, isLastInGroup)

  return (
    <div
      className={`wa-msg-row ${isOut ? 'out' : 'in'}`}
      style={{ marginTop: isFirstInGroup ? 6 : 2 }}
    >
      {/* Inbound avatar — only on last message of group */}
      {!isOut && (
        <div className="wa-avatar-slot">
          {isFirstInGroup && (
            <div className="wa-avatar">
            </div>
          )}
        </div>
      )}

      <div
        className={`wa-bubble ${isOut ? 'wa-out' : 'wa-in'} ${ isOut ? 'wa-tail-out' : 'wa-tail-in'} ${faded ? 'wa-faded' : ''}`}
        style={{
          borderRadius: br,
          padding: mediaPadding ? '4px 4px 6px 4px' : undefined,
        }}
      >
        {children}
        {/* Time + ticks floated to bottom-right, WA-style */}
        <div className="wa-meta">
          <span className="wa-time">{time}</span>
          {isOut && <TickIcon status={status} />}
        </div>
      </div>
    </div>
  )
}

function getBorderRadius(isOut: boolean, isFirst: boolean, isLast: boolean): string {
  const r = '12px'
  const tail = '3px'   // the tail corner
  const mid = '4px'    // slightly reduced corner on sender side when grouped

  if (isFirst && isLast) {
    // Only message: full rounded except tail corner
    return isOut ? `${r} ${r} ${tail} ${r}` : `${r} ${r} ${r} ${tail}`
  }
  if (isFirst) {
    // First of group: tail at bottom corner
    return isOut ? `${r} ${r} ${mid} ${r}` : `${r} ${r} ${r} ${mid}`
  }
  if (isLast) {
    // Last of group: tighter corner on sender side
    return isOut ? `${mid} ${r} ${tail} ${r}` : `${r} ${mid} ${r} ${tail}`
  }
  // Middle: tighter corner on sender side
  return isOut ? `${mid} ${r} ${mid} ${r}` : `${r} ${mid} ${r} ${mid}`
}

function TickIcon({ status }: { status: string }) {
  if (status === 'read')
    return <span className="wa-ticks wa-read"><i className="fa-solid fa-check-double" /></span>
  if (status === 'delivered')
    return <span className="wa-ticks"><i className="fa-solid fa-check-double" /></span>
  if (status === 'failed')
    return <span className="wa-ticks wa-fail"><i className="fa-solid fa-circle-exclamation" /></span>
  // queued / sent
  return <span className="wa-ticks wa-sent"><i className="fa-solid fa-check" /></span>
}