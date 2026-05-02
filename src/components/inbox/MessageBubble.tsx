'use client'

import React, { useRef, useState } from 'react'
import { useInboxStore } from '@/stores/useInboxStore'
import { formatMessageTime } from '@/lib/utils'
import type { Message } from '@/types'

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

function isImage(mime = '') {
  return mime.startsWith('image/')
}

function isVideo(mime = '') {
  return mime.startsWith('video/')
}

function isAudio(mime = '') {
  return mime.startsWith('audio/')
}

/* -------------------------------------------------------------------------- */
/* Lightbox                                                                   */
/* -------------------------------------------------------------------------- */

function Lightbox({
  url,
  mime,
  filename,
  onClose,
}: {
  url: string
  mime: string
  filename?: string
  onClose: () => void
}) {
  const image = isImage(mime)
  const video = isVideo(mime)
  const audio = isAudio(mime)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>
            {filename || 'Media'}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download={filename || 'download'}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: 'rgba(255,255,255,.12)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 12,
              }}
            >
              Download
            </a>

            <button
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                color: '#fff',
                background: 'rgba(255,255,255,.12)',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {image && (
          <img
            src={url}
            alt={filename}
            style={{
              maxWidth: '80vw',
              maxHeight: '75vh',
              borderRadius: 8,
              objectFit: 'contain',
            }}
          />
        )}

        {video && (
          <video
            src={url}
            controls
            autoPlay
            style={{ maxWidth: '80vw', maxHeight: '75vh', borderRadius: 8 }}
          />
        )}

        {audio && (
          <div
            style={{ background: '#1e2535', borderRadius: 12, padding: 20, minWidth: 300 }}
          >
            <audio src={url} controls autoPlay style={{ width: '100%' }} />
          </div>
        )}

        {!image && !video && !audio && (
          <div
            style={{
              background: '#1e2535',
              borderRadius: 12,
              padding: 30,
              color: '#fff',
              textAlign: 'center',
            }}
          >
            <div style={{ marginBottom: 10, fontSize: 18 }}>{filename}</div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download={filename}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'var(--accent)',
                color: '#000',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Audio Player                                                               */
/* -------------------------------------------------------------------------- */

function AudioPlayer({ url, isOut }: { url: string; isOut: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing,  setPlaying]  = useState(false)
  const [duration, setDuration] = useState(0)
  const [current,  setCurrent]  = useState(0)

  function fmt(v: number) {
    const m = Math.floor(v / 60)
    const s = Math.floor(v % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function toggle() {
    const el = ref.current
    if (!el) return
    if (el.paused) { el.play(); setPlaying(true) }
    else           { el.pause(); setPlaying(false) }
  }

  const progress = duration ? (current / duration) * 100 : 0

  return (
    <div style={{ display: 'flex', gap: 10, minWidth: 220, alignItems: 'center' }}>
      <audio
        ref={ref}
        src={url}
        style={{ display: 'none' }}
        onLoadedMetadata={(e) =>
          setDuration((e.target as HTMLAudioElement).duration)
        }
        onTimeUpdate={(e) =>
          setCurrent((e.target as HTMLAudioElement).currentTime)
        }
        onEnded={() => setPlaying(false)}
      />

      <button
        onClick={toggle}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: isOut ? 'rgba(37,211,102,.2)' : 'rgba(255,255,255,.1)',
          color: isOut ? 'var(--accent)' : '#fff',
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>

      <div style={{ flex: 1 }}>
        <div
          onClick={(e) => {
            const el = ref.current
            if (!el || !duration) return
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            el.currentTime = ratio * duration
          }}
          style={{
            height: 4,
            borderRadius: 2,
            cursor: 'pointer',
            position: 'relative',
            background: 'rgba(255,255,255,.15)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: `${progress}%`,
              background: playing ? 'var(--accent)' : 'rgba(255,255,255,.5)',
            }}
          />
        </div>

        <div style={{ fontSize: 10, marginTop: 3, color: 'rgba(255,255,255,.5)' }}>
          {playing ? fmt(current) : fmt(duration)} voice message
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Quoted Reply Preview  (NEW)                                                */
/* -------------------------------------------------------------------------- */

function QuotedPreview({
  contextMsgId,
  allMessages,
}: {
  contextMsgId: string
  allMessages: Message[]
}) {
  const quoted = allMessages.find((m) => m.external_id === contextMsgId)
  const isOut  = quoted?.direction === 'outbound'

  let preview = quoted?.body ?? ''
  if (!preview && quoted) {
    const ct = quoted.content_type
    if      (ct === 'image')    preview = '📷 Photo'
    else if (ct === 'video')    preview = '🎬 Video'
    else if (ct === 'audio')    preview = '🎤 Voice message'
    else if (ct === 'document') preview = `📄 ${getFileName(quoted)}`
    else if (ct === 'sticker')  preview = '😊 Sticker'
    else if (ct === 'location') preview = '📍 Location'
    else                        preview = `[${ct}]`
  }
  if (!quoted) preview = 'Original message not available'

  return (
    <div
      style={{
        borderLeft: `3px solid ${isOut ? '#25d366' : 'rgba(255,255,255,0.3)'}`,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '0 6px 6px 0',
        padding: '4px 8px',
        marginBottom: 6,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: isOut ? '#25d366' : 'rgba(255,255,255,0.6)',
          marginBottom: 2,
        }}
      >
        {quoted
          ? isOut ? 'You' : (quoted.meta?.from_name ?? 'Contact')
          : 'Unknown'}
      </div>

      {quoted?.media_url && quoted.content_type === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={quoted.media_url}
          alt=""
          style={{
            width: 40,
            height: 30,
            objectFit: 'cover',
            borderRadius: 3,
            display: 'block',
            marginBottom: 2,
          }}
        />
      )}

      <div
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.65)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 220,
        }}
      >
        {preview}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Hover Action Bar — Reply + React  (NEW)                                   */
/* -------------------------------------------------------------------------- */

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

function HoverBar({ msg, isOut }: { msg: Message; isOut: boolean }) {
  const { setReplyTo } = useInboxStore()
  const [showEmojis, setShowEmojis] = useState(false)

  async function sendReaction(emoji: string) {
    if (!msg.external_id) return
    setShowEmojis(false)
    fetch('/api/messages/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id:     msg.conversation_id,
        type:                'reaction',
        reaction_emoji:      emoji,
        reaction_message_id: msg.external_id,
      }),
    }).catch(console.error)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        ...(isOut ? { left: -74 } : { right: -74 }),
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        zIndex: 10,
      }}
    >
      {showEmojis && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            ...(isOut ? { right: 0 } : { left: 0 }),
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: '5px 8px',
            display: 'flex',
            gap: 4,
            boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
            whiteSpace: 'nowrap',
          }}
        >
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => sendReaction(e)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 20,
                padding: '2px 3px',
                lineHeight: 1,
                fontFamily: 'inherit',
                transition: 'transform 0.12s',
              }}
              onMouseEnter={(ev) => {
                ;(ev.currentTarget as HTMLElement).style.transform = 'scale(1.3)'
              }}
              onMouseLeave={(ev) => {
                ;(ev.currentTarget as HTMLElement).style.transform = 'scale(1)'
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowEmojis((v) => !v)}
        title="React"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: showEmojis ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        <i className="fa-regular fa-face-smile" />
      </button>

      <button
        onClick={() => setReplyTo(msg)}
        title="Reply"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
        }}
      >
        <i className="fa-solid fa-reply" />
      </button>
    </div>
  )
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