'use client'

import React, { useRef, useState } from 'react'
import { useInboxStore } from '@/stores/useInboxStore'
import { formatMessageTime } from '@/lib/utils'
import type { Message } from '@/types'
import { isImage, isVideo, isAudio, Lightbox } from './MessageMedia'
import { AudioPlayer } from './MessageAudioPlayer'
import { QuotedPreview } from './MessageQuoted'
import { HoverBar } from './MessageReactions'

interface Props {
  message: Message
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  onMarkRead?: (id: string) => void
  onSetReply?: (commentId: string, body: string) => void
  // Pass full message list so QuotedPreview can look up the original by external_id
  allMessages?: Message[]
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function safeText(v: any) {
  return v == null ? '' : String(v)
}

function getFileName(msg: Message) {
  return (
    msg.meta?.filename ??
    msg.meta?.file_name ??
    msg.body ??
    'Document'
  )
}

function getBorderRadius(
  isOut: boolean,
  isFirst: boolean,
  isLast: boolean,
) {
  const r    = '12px'
  const tail = '3px'
  const mid  = '4px'

  if (isFirst && isLast) {
    return isOut
      ? `${r} ${r} ${tail} ${r}`
      : `${r} ${r} ${r} ${tail}`
  }

  if (isFirst) {
    return isOut
      ? `${r} ${r} ${mid} ${r}`
      : `${r} ${r} ${r} ${mid}`
  }

  if (isLast) {
    return isOut
      ? `${mid} ${r} ${tail} ${r}`
      : `${r} ${mid} ${r} ${tail}`
  }

  return isOut
    ? `${mid} ${r} ${mid} ${r}`
    : `${r} ${mid} ${r} ${mid}`
}


/* -------------------------------------------------------------------------- */
/* Comment Actions                                                            */
/* -------------------------------------------------------------------------- */

function useCommentAction(messageId: string) {
  const [busy,        setBusy]        = useState<string | null>(null)
  const [localHidden, setLocalHidden] = useState<boolean | null>(null)
  const [deleted,     setDeleted]     = useState(false)
  const { setActiveConversation }     = useInboxStore()

  async function doAction(action: string) {
    if (busy) return
    setBusy(action)
    try {
      const res = await fetch('/api/messages/comment-action', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, action }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error || 'Action failed'); return }
      if (action === 'to_dm' && json.conversation_id) {
        setActiveConversation(json.conversation_id)
      }
      if (action === 'hide')   setLocalHidden(true)
      if (action === 'unhide') setLocalHidden(false)
      if (action === 'delete') setDeleted(true)
    } finally {
      setBusy(null)
    }
  }

  return { busy, localHidden, deleted, doAction }
}

/* -------------------------------------------------------------------------- */
/* Tick Icon                                                                  */
/* -------------------------------------------------------------------------- */

// FIX 1: param typed as `string` (not MessageStatus) so comparing === 'deleted'
// never raises ts(2367) "types have no overlap"
function TickIcon({ status }: { status: string }) {
  if (status === 'deleted')
    return (
      <span className="wa-ticks" style={{ opacity: 0.35 }}>
        <i className="fa-solid fa-ban" />
      </span>
    )
  if (status === 'read')
    return (
      <span className="wa-ticks wa-read">
        <i className="fa-solid fa-check-double" />
      </span>
    )
  if (status === 'delivered')
    return (
      <span className="wa-ticks">
        <i className="fa-solid fa-check-double" />
      </span>
    )
  if (status === 'failed')
    return (
      <span className="wa-ticks wa-fail">
        <i className="fa-solid fa-circle-exclamation" />
      </span>
    )
  return (
    <span className="wa-ticks wa-sent">
      <i className="fa-solid fa-check" />
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* WaBubble                                                                   */
/* -------------------------------------------------------------------------- */

function WaBubble({
  isOut,
  isFirst,
  isLast,
  time,
  status,
  mediaPad,
  children,
  contextMsgId,
  allMessages,
  reaction,
}: {
  isOut: boolean
  isFirst: boolean
  isLast: boolean
  // FIX 1 (same fix): typed as string so 'deleted' comparison never raises ts(2367)
  time: string
  status: string
  mediaPad?: boolean
  children: React.ReactNode
  contextMsgId?: string | null
  allMessages?: Message[]
  reaction?: string | null
}) {
  const br = getBorderRadius(isOut, isFirst, isLast)

  return (
    <div
      className={`wa-msg-row ${isOut ? 'out' : 'in'}`}
      style={{ marginTop: isFirst ? 6 : 2 }}
    >
      <div
        className={`wa-bubble ${isOut ? 'wa-out' : 'wa-in'} ${
          isLast ? (isOut ? 'wa-tail-out' : 'wa-tail-in') : ''
        }`}
        style={{ borderRadius: br, padding: mediaPad ? 4 : undefined, position: 'relative' }}
      >
        {/* Quoted reply preview — shows the original message above the reply */}
        {contextMsgId && allMessages && (
          <QuotedPreview contextMsgId={contextMsgId} allMessages={allMessages} />
        )}

        {children}

        <div className="wa-meta">
          <span className="wa-time">{time}</span>
          {isOut && <TickIcon status={status} />}
        </div>

        {/* Reaction bubble — shown below the bubble */}
        {reaction && (
          <div
            style={{
              position: 'absolute',
              bottom: -12,
              ...(isOut ? { left: -4 } : { right: -4 }),
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '1px 5px',
              fontSize: 14,
              lineHeight: 1.5,
              boxShadow: '0 1px 6px rgba(0,0,0,0.3)',
              zIndex: 2,
            }}
          >
            {reaction}
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Comment Bubble                                                             */
/* -------------------------------------------------------------------------- */

function CommentBubble({
  msg,
  time,
  onSetReply,
}: {
  msg: Message
  time: string
  onSetReply?: (id: string, body: string) => void
}) {
  const from = msg.meta?.from
  const { busy, localHidden, deleted, doAction } = useCommentAction(msg.id)

  const hidden = localHidden ?? msg.meta?.is_hidden ?? false
  const externalId = msg.external_id ?? msg.meta?.comment_id ?? msg.id

  if (deleted) {
    return (
      <div className="comment-item" style={{ opacity: 0.5, fontStyle: 'italic' }}>
        Comment deleted
      </div>
    )
  }

  return (
    <div className="comment-item" style={{ opacity: hidden ? 0.6 : 1 }}>
      <div className="comment-header">
        <strong>
          {from?.username ? `@${from.username}` : from?.name || 'Unknown'}
        </strong>
        <span style={{ marginLeft: 'auto', fontSize: 11 }}>{time}</span>
      </div>

      <div className="comment-text">{msg.body}</div>

      {msg.direction !== 'outbound' && (
        <div className="comment-actions">
          <button onClick={() => onSetReply?.(externalId, safeText(msg.body))}>
            Reply
          </button>
          <button disabled={!!busy} onClick={() => doAction('like')}>
            Like
          </button>
          <button
            disabled={!!busy}
            onClick={() => doAction(hidden ? 'unhide' : 'hide')}
          >
            {hidden ? 'Unhide' : 'Hide'}
          </button>
          <button
            disabled={!!busy}
            onClick={() => { if (confirm('Delete comment?')) doAction('delete') }}
          >
            Delete
          </button>
          <button disabled={!!busy} onClick={() => doAction('to_dm')}>
            → DM
          </button>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Main MessageBubble export                                                  */
/* -------------------------------------------------------------------------- */

export default function MessageBubble({
  message: msg,
  isFirstInGroup = true,
  isLastInGroup  = true,
  onSetReply,
  allMessages    = [],
}: Props) {
  const isOut = msg.direction === 'outbound'
  const time  = formatMessageTime(msg.created_at)

  const [lightbox, setLightbox] = useState(false)
  const [hovered,  setHovered]  = useState(false)

  // Fall back to store messages when allMessages not passed by ChatWindow
  const { messages: storeMsgs } = useInboxStore()
  const msgList = allMessages.length > 0 ? allMessages : storeMsgs

  const mime     = msg.media_mime ?? ''
  const mediaUrl = msg.media_url ?? undefined

  // Quoted reply context — external_id of the message being replied to
  const contextMsgId =
    msg.meta?.context?.message_id ??
    msg.meta?.reply_to_external_id ??
    null

  // Reaction emoji on this bubble
  const reaction =
    msg.meta?.reaction?.emoji ??
    msg.meta?.sent_reaction ??
    null

  // FIX 1: cast to string before '=== deleted' to avoid ts(2367)
  // MessageStatus union doesn't include 'deleted' but Meta sends it as a webhook status
  const isDeleted = (msg.status as string) === 'deleted'

  /* ── Notes ── */
  if (msg.is_note) {
    return (
      <div className="note-item">
        <div className="note-header">
          <strong>{msg.sender?.full_name || 'You'}</strong>
          <span>{time}</span>
        </div>
        <div className="note-body">{msg.body}</div>
      </div>
    )
  }

  /* ── Comments ── */
  if (msg.content_type === 'comment') {
    return <CommentBubble msg={msg} time={time} onSetReply={onSetReply} />
  }

  /* ── Reaction sent (small status row, not a full bubble) ── */
  if (msg.content_type === 'reaction') {
    const emoji = msg.meta?.reaction_emoji
    if (!emoji) return null
    return (
      <div
        className={`wa-msg-row ${isOut ? 'out' : 'in'}`}
        style={{ marginTop: 2 }}
      >
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 4px',
          }}
        >
          <span style={{ fontSize: 18 }}>{emoji}</span>
          <span>{isOut ? 'You' : 'Contact'} reacted to a message</span>
          <span style={{ fontSize: 10 }}>{time}</span>
        </div>
      </div>
    )
  }


  /* ── Call events ── */
  if (msg.content_type === 'call') {
    const callEvent = msg.meta?.call_event ?? 'unknown'
    const duration  = msg.meta?.duration
    const isInbound = msg.direction === 'inbound'

    const iconMap: Record<string, string> = {
      call_started:       '📞',
      ringing:            '📡',
      connected:          '✅',
      call_ended:         '📞',
      ended:              '📞',
      missed:             '📵',
      failed:             '❌',
      rejected:           '🚫',
      terminated:         '📞',
      permission_request: '🔔',
    }

    const colorMap: Record<string, string> = {
      missed:    '#ef4444',
      failed:    '#ef4444',
      rejected:  '#ef4444',
      connected: '#22c55e',
    }

    const icon  = iconMap[callEvent]  ?? '📞'
    const color = colorMap[callEvent] ?? 'var(--text-secondary)'
    const label = msg.body ?? `📞 Call ${callEvent}`

    const durationStr = duration != null
      ? (() => {
          const m = Math.floor(duration / 60)
          const s = duration % 60
          return m > 0 ? `${m}m ${s}s` : `${s}s`
        })()
      : null

    return (
      <div
        className={`wa-msg-row ${isInbound ? 'in' : 'out'}`}
        style={{ marginTop: 4 }}
      >
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:             8,
            padding:        '8px 12px',
            background:     'var(--bg-surface)',
            border:         '1px solid var(--border)',
            borderRadius:    10,
            fontSize:        12,
            color,
            maxWidth:        260,
          }}
        >
          <span style={{ fontSize: 16 }}>{icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontWeight: 500 }}>{label}</span>
            {durationStr && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Duration: {durationStr}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
            {time}
          </span>
        </div>
      </div>
    )
  }

   /* ── Unsupported ── */
  if (msg.content_type === 'unsupported') {
    const rawType = msg.meta?.raw_type ?? msg.meta?.wa_type ?? '?'
    return (
      <div className={`wa-msg-row ${isOut ? 'out' : 'in'}`} style={{ marginTop: 4 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, fontSize: 12,
          color: 'var(--text-muted)', maxWidth: 280,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>
              Unsupported message type
            </div>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              type: {rawType}
            </div>
            {msg.meta?.wa_type && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                {msg.meta.wa_type === 'poll' && '📊 Poll (not supported in Cloud API)'}
                {msg.meta.wa_type === 'broadcast_list' && '📢 Broadcast list message'}
                {msg.meta.wa_type === 'ephemeral' && '⏳ View-once message'}
                {msg.meta.wa_type === 'call' && '📞 WhatsApp call notification'}
              </div>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{time}</span>
        </div>
      </div>
    )
  }
  
  /* ── Audio ── */
  if (msg.content_type === 'audio' || isAudio(mime)) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative' }}
      >
        {lightbox && mediaUrl && (
          <Lightbox
            url={mediaUrl}
            mime={mime || 'audio/mpeg'}
            filename="Voice message"
            onClose={() => setLightbox(false)}
          />
        )}
        <WaBubble
          isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup}
          time={time} status={isDeleted ? 'deleted' : msg.status}
          contextMsgId={contextMsgId} allMessages={msgList} reaction={reaction}
        >
          {mediaUrl
            ? <AudioPlayer url={mediaUrl} isOut={isOut} />
            : 'Voice message'
          }
        </WaBubble>
        {hovered && !isDeleted && <HoverBar msg={msg} isOut={isOut} />}
      </div>
    )
  }

  /* ── Image ── */
  if (msg.content_type === 'image' || isImage(mime)) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative' }}
      >
        {lightbox && mediaUrl && (
          <Lightbox
            url={mediaUrl}
            mime={mime || 'image/jpeg'}
            filename="Image"
            onClose={() => setLightbox(false)}
          />
        )}
        <WaBubble
          isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup}
          time={time} status={isDeleted ? 'deleted' : msg.status}
          mediaPad contextMsgId={contextMsgId} allMessages={msgList} reaction={reaction}
        >
          {mediaUrl && (
            <img
              src={mediaUrl}
              alt="Image"
              onClick={() => setLightbox(true)}
              style={{ maxWidth: 240, borderRadius: 8, cursor: 'zoom-in' }}
            />
          )}
          {msg.body && <div style={{ marginTop: 4 }}>{msg.body}</div>}
        </WaBubble>
        {hovered && !isDeleted && <HoverBar msg={msg} isOut={isOut} />}
      </div>
    )
  }

  /* ── Video ── */
  if (msg.content_type === 'video' || isVideo(mime)) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative' }}
      >
        {lightbox && mediaUrl && (
          <Lightbox
            url={mediaUrl}
            mime={mime || 'video/mp4'}
            filename="Video"
            onClose={() => setLightbox(false)}
          />
        )}
        <WaBubble
          isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup}
          time={time} status={isDeleted ? 'deleted' : msg.status}
          mediaPad contextMsgId={contextMsgId} allMessages={msgList} reaction={reaction}
        >
          <div
            onClick={() => setLightbox(true)}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <video src={mediaUrl} style={{ maxWidth: 240, borderRadius: 8 }} />
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i
                  className="fa-solid fa-play"
                  style={{ color: '#fff', fontSize: 18, marginLeft: 3 }}
                />
              </div>
            </div>
          </div>
          {msg.body && <div style={{ marginTop: 4 }}>{msg.body}</div>}
        </WaBubble>
        {hovered && !isDeleted && <HoverBar msg={msg} isOut={isOut} />}
      </div>
    )
  }

  /* ── Document ── */
  if (
    msg.content_type === 'document' ||
    (mime &&
      !isImage(mime) &&
      !isVideo(mime) &&
      !isAudio(mime) &&
      msg.content_type !== 'text')
  ) {
    const filename = getFileName(msg)
    const ext      = filename.split('.').pop()?.toUpperCase() ?? 'FILE'

    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative' }}
      >
        {lightbox && mediaUrl && (
          <Lightbox
            url={mediaUrl}
            mime={mime || 'application/octet-stream'}
            filename={filename}
            onClose={() => setLightbox(false)}
          />
        )}
        <WaBubble
          isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup}
          time={time} status={isDeleted ? 'deleted' : msg.status}
          contextMsgId={contextMsgId} allMessages={msgList} reaction={reaction}
        >
          <div
            onClick={() => mediaUrl && setLightbox(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: mediaUrl ? 'pointer' : 'default', padding: '2px 0',
            }}
          >
            <div
              style={{
                width: 40, height: 40, borderRadius: 8,
                background: '#e84040',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#fff',
              }}
            >
              {ext.slice(0, 4)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12, fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {filename}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {mime || 'Document'}
              </div>
            </div>
            {mediaUrl && (
              <i
                className="fa-solid fa-download"
                style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}
              />
            )}
          </div>
        </WaBubble>
        {hovered && !isDeleted && <HoverBar msg={msg} isOut={isOut} />}
      </div>
    )
  }

  /* ── Template ── */
  if (msg.content_type === 'template') {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative' }}
      >
        <WaBubble
          isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup}
          time={time} status={msg.status}
          contextMsgId={contextMsgId} allMessages={msgList} reaction={reaction}
        >
          <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>
            Template: {msg.meta?.template_name || 'unknown'}
          </div>
          {msg.body}
        </WaBubble>
        {hovered && <HoverBar msg={msg} isOut={isOut} />}
      </div>
    )
  }

  /* ── Flow ── */
  if (msg.content_type === 'flow') {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative' }}
      >
        <WaBubble
          isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup}
          time={time} status={msg.status}
          contextMsgId={contextMsgId} allMessages={msgList} reaction={reaction}
        >
          <div style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 600, marginBottom: 5 }}>
            <i className="fa-solid fa-diagram-project" style={{ marginRight: 5 }} />
            WhatsApp Flow
          </div>
          <div style={{ fontSize: 13, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{msg.body}</div>
          <div
            style={{
              background: 'rgba(0,168,232,0.12)',
              border: '1px solid rgba(0,168,232,0.2)',
              borderRadius: 8, padding: '5px 12px',
              fontSize: 12, color: 'var(--accent2)',
              textAlign: 'center', fontWeight: 600,
            }}
          >
            {msg.meta?.flow_cta ?? 'Open Flow'}
          </div>
          {msg.meta?.flow_mode === 'draft' && (
            <div style={{ fontSize: 10, color: 'var(--accent3)', marginTop: 4 }}>
              🧪 Draft mode
            </div>
          )}
        </WaBubble>
        {hovered && <HoverBar msg={msg} isOut={isOut} />}
      </div>
    )
  }

  /* ── Interactive (button_reply / list_reply / nfm_reply / flow response) ── */
  if (msg.content_type === 'interactive' || msg.content_type === 'button') {
    const ivType = msg.meta?.interactive_type
    const label =
      ivType === 'button_reply' ? '↩ Button Reply'
      : ivType === 'list_reply' ? '📋 List Selection'
      : ivType === 'nfm_reply'  ? '📝 Flow Response'
      : '⬡ Interactive'

    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative' }}
      >
        <WaBubble
          isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup}
          time={time} status={msg.status}
          contextMsgId={contextMsgId} allMessages={msgList} reaction={reaction}
        >
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
            {label}
          </div>
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg.body}
          </span>
          {msg.meta?.flow_response && (
            <div
              style={{
                marginTop: 6, fontSize: 10,
                color: 'var(--accent)',
                background: 'rgba(37,211,102,0.1)',
                borderRadius: 6, padding: '3px 8px',
              }}
            >
              <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }} />
              Flow submitted
            </div>
          )}
        </WaBubble>
        {hovered && <HoverBar msg={msg} isOut={isOut} />}
      </div>
    )
  }

  /* ── Location ── */
  if (msg.content_type === 'location') {
    const loc = msg.meta?.location
    const lat = loc?.latitude  ?? 0
    const lng = loc?.longitude ?? 0

    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative' }}
      >
        <WaBubble
          isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup}
          time={time} status={msg.status}
          contextMsgId={contextMsgId} allMessages={msgList} reaction={reaction}
        >
          <a
            href={`https://maps.google.com/?q=${lat},${lng}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.2)', borderRadius: 8, height: 80,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6,
              }}
            >
              <i className="fa-solid fa-location-dot" style={{ fontSize: 28, color: '#e84040' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <i className="fa-solid fa-location-dot" style={{ color: '#e84040', fontSize: 11 }} />
              <div>
                {loc?.name && <div style={{ fontWeight: 600 }}>{loc.name}</div>}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  {loc?.address ?? `${lat}, ${lng}`}
                </div>
              </div>
            </div>
          </a>
        </WaBubble>
        {hovered && <HoverBar msg={msg} isOut={isOut} />}
      </div>
    )
  }

  /* ── Sticker ── */
  if (msg.content_type === 'sticker' && mediaUrl) {
    return (
      <div className={`wa-msg-row ${isOut ? 'out' : 'in'}`}>
        <img
          src={mediaUrl}
          alt="Sticker"
          style={{ width: 120, height: 120, objectFit: 'contain' }}
        />
      </div>
    )
  }

  /* ── Default: text ── */
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      <WaBubble
        isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup}
        time={time} status={isDeleted ? 'deleted' : msg.status}
        contextMsgId={contextMsgId} allMessages={msgList} reaction={reaction}
      >
        {isDeleted ? (
          <span style={{ fontStyle: 'italic', opacity: 0.5, fontSize: 12 }}>
            <i className="fa-solid fa-ban" style={{ marginRight: 5, fontSize: 10 }} />
            This message was deleted
          </span>
        ) : (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {safeText(msg.body)}
          </span>
        )}
      </WaBubble>
      {hovered && !isDeleted && <HoverBar msg={msg} isOut={isOut} />}
    </div>
  )
}