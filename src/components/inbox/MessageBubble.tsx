'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useInboxStore } from '@/stores/useInboxStore'
import { formatMessageTime } from '@/lib/utils'
import type { Message } from '@/types'

interface Props {
  message: Message
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  onMarkRead?: (id: string) => void
  onSetReply?: (commentId: string, body: string) => void
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
  isLast: boolean
) {
  const r = '12px'
  const tail = '3px'
  const mid = '4px'

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
          <div
            style={{
              color: 'rgba(255,255,255,.7)',
              fontSize: 13,
            }}
          >
            {filename || 'Media'}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
            }}
          >
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download={filename || 'download'}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background:
                  'rgba(255,255,255,.12)',
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
                background:
                  'rgba(255,255,255,.12)',
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
            style={{
              maxWidth: '80vw',
              maxHeight: '75vh',
              borderRadius: 8,
            }}
          />
        )}

        {audio && (
          <div
            style={{
              background: '#1e2535',
              borderRadius: 12,
              padding: 20,
              minWidth: 300,
            }}
          >
            <audio
              src={url}
              controls
              autoPlay
              style={{ width: '100%' }}
            />
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
            <div
              style={{
                marginBottom: 10,
                fontSize: 18,
              }}
            >
              {filename}
            </div>

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

function AudioPlayer({
  url,
  isOut,
}: {
  url: string
  isOut: boolean
}) {
  const ref = useRef<HTMLAudioElement>(null)

  const [playing, setPlaying] =
    useState(false)

  const [duration, setDuration] =
    useState(0)

  const [current, setCurrent] =
    useState(0)

  function fmt(v: number) {
    const m = Math.floor(v / 60)
    const s = Math.floor(v % 60)
      .toString()
      .padStart(2, '0')
    return `${m}:${s}`
  }

  function toggle() {
    const el = ref.current
    if (!el) return

    if (el.paused) {
      el.play()
      setPlaying(true)
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  const progress = duration
    ? (current / duration) * 100
    : 0

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        minWidth: 220,
        alignItems: 'center',
      }}
    >
      <audio
        ref={ref}
        src={url}
        style={{ display: 'none' }}
        onLoadedMetadata={(e) =>
          setDuration(
            (
              e.target as HTMLAudioElement
            ).duration
          )
        }
        onTimeUpdate={(e) =>
          setCurrent(
            (
              e.target as HTMLAudioElement
            ).currentTime
          )
        }
        onEnded={() =>
          setPlaying(false)
        }
      />

      <button
        onClick={toggle}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: isOut
            ? 'rgba(37,211,102,.2)'
            : 'rgba(255,255,255,.1)',
          color: isOut
            ? 'var(--accent)'
            : '#fff',
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>

      <div style={{ flex: 1 }}>
        <div
          onClick={(e) => {
            const el = ref.current
            if (!el || !duration) return

            const rect =
              (
                e.currentTarget as HTMLDivElement
              ).getBoundingClientRect()

            const ratio =
              (e.clientX - rect.left) /
              rect.width

            el.currentTime =
              ratio * duration
          }}
          style={{
            height: 4,
            borderRadius: 2,
            cursor: 'pointer',
            position: 'relative',
            background:
              'rgba(255,255,255,.15)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: `${progress}%`,
              background: playing
                ? 'var(--accent)'
                : 'rgba(255,255,255,.5)',
            }}
          />
        </div>

        <div
          style={{
            fontSize: 10,
            marginTop: 3,
            color:
              'rgba(255,255,255,.5)',
          }}
        >
          {playing
            ? fmt(current)
            : fmt(duration)}{' '}
          voice message
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Comment Actions                                                            */
/* -------------------------------------------------------------------------- */

function useCommentAction(
  messageId: string
) {
  const [busy, setBusy] =
    useState<string | null>(null)

  const [localHidden, setLocalHidden] =
    useState<boolean | null>(null)

  const [deleted, setDeleted] =
    useState(false)

  const { setActiveConversation } =
    useInboxStore()

  async function doAction(
    action: string
  ) {
    if (busy) return

    setBusy(action)

    try {
      const res = await fetch(
        '/api/messages/comment-action',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            message_id: messageId,
            action,
          }),
        }
      )

      const json =
        await res.json()

      if (!res.ok) {
        alert(
          json.error ||
            'Action failed'
        )
        return
      }

      if (
        action === 'to_dm' &&
        json.conversation_id
      ) {
        setActiveConversation(
          json.conversation_id
        )
      }

      if (action === 'hide')
        setLocalHidden(true)

      if (action === 'unhide')
        setLocalHidden(false)

      if (action === 'delete')
        setDeleted(true)
    } finally {
      setBusy(null)
    }
  }

  return {
    busy,
    localHidden,
    deleted,
    doAction,
  }
}

/* -------------------------------------------------------------------------- */
/* Tick                                                                       */
/* -------------------------------------------------------------------------- */

function TickIcon({
  status,
}: {
  status: string
}) {
  if (status === 'read')
    return <span>✓✓</span>

  if (status === 'delivered')
    return <span>✓✓</span>

  if (status === 'failed')
    return <span>⚠</span>

  return <span>✓</span>
}

/* -------------------------------------------------------------------------- */
/* Bubble                                                                     */
/* -------------------------------------------------------------------------- */

function WaBubble({
  isOut,
  isFirst,
  isLast,
  time,
  status,
  mediaPad,
  children,
}: {
  isOut: boolean
  isFirst: boolean
  isLast: boolean
  time: string
  status: string
  mediaPad?: boolean
  children: React.ReactNode
}) {
  const br = getBorderRadius(
    isOut,
    isFirst,
    isLast
  )

  return (
    <div
      className={`wa-msg-row ${
        isOut ? 'out' : 'in'
      }`}
      style={{
        marginTop: isFirst
          ? 6
          : 2,
      }}
    >
      {!isOut && (
        <div className="wa-avatar-slot">
          {isFirst && (
            <div className="wa-avatar">
              👤
            </div>
          )}
        </div>
      )}

      <div
        className={`wa-bubble ${
          isOut
            ? 'wa-out'
            : 'wa-in'
        }`}
        style={{
          borderRadius: br,
          padding: mediaPad
            ? 4
            : undefined,
        }}
      >
        {children}

        <div className="wa-meta">
          <span className="wa-time">
            {time}
          </span>

          {isOut && (
            <TickIcon
              status={status}
            />
          )}
        </div>
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
  onSetReply?: (
    id: string,
    body: string
  ) => void
}) {
  const from = msg.meta?.from

  const {
    busy,
    localHidden,
    deleted,
    doAction,
  } = useCommentAction(msg.id)

  const hidden =
    localHidden ??
    msg.meta?.is_hidden ??
    false

  const externalId =
    msg.external_id ??
    msg.meta?.comment_id ??
    msg.id

  if (deleted) {
    return (
      <div
        className="comment-item"
        style={{
          opacity: 0.5,
          fontStyle: 'italic',
        }}
      >
        Comment deleted
      </div>
    )
  }

  return (
    <div
      className="comment-item"
      style={{
        opacity: hidden
          ? 0.6
          : 1,
      }}
    >
      <div className="comment-header">
        <strong>
          {from?.username
            ? `@${from.username}`
            : from?.name ||
              'Unknown'}
        </strong>

        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
          }}
        >
          {time}
        </span>
      </div>

      <div className="comment-text">
        {msg.body}
      </div>

      {msg.direction !==
        'outbound' && (
        <div className="comment-actions">
          <button
            onClick={() =>
              onSetReply?.(
                externalId,
                safeText(msg.body)
              )
            }
          >
            Reply
          </button>

          <button
            disabled={!!busy}
            onClick={() =>
              doAction(
                'like'
              )
            }
          >
            Like
          </button>

          <button
            disabled={!!busy}
            onClick={() =>
              doAction(
                hidden
                  ? 'unhide'
                  : 'hide'
              )
            }
          >
            {hidden
              ? 'Unhide'
              : 'Hide'}
          </button>

          <button
            disabled={!!busy}
            onClick={() => {
              if (
                confirm(
                  'Delete comment?'
                )
              ) {
                doAction(
                  'delete'
                )
              }
            }}
          >
            Delete
          </button>

          <button
            disabled={!!busy}
            onClick={() =>
              doAction(
                'to_dm'
              )
            }
          >
            → DM
          </button>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function MessageBubble({
  message: msg,
  isFirstInGroup = true,
  isLastInGroup = true,
  onSetReply,
}: Props) {
  const isOut =
    msg.direction ===
    'outbound'

  const time =
    formatMessageTime(
      msg.created_at
    )

  const [lightbox, setLightbox] =
    useState(false)

  const mime =
    msg.media_mime ?? ''

const mediaUrl = msg.media_url ?? undefined

  /* Notes */

  if (msg.is_note) {
    return (
      <div className="note-item">
        <div className="note-header">
          <strong>
            {msg.sender?.full_name ||
              'You'}
          </strong>
          <span>{time}</span>
        </div>

        <div className="note-body">
          {msg.body}
        </div>
      </div>
    )
  }

  /* Comments */

  if (
    msg.content_type ===
    'comment'
  ) {
    return (
      <CommentBubble
        msg={msg}
        time={time}
        onSetReply={
          onSetReply
        }
      />
    )
  }

  /* Audio */

  if (
    msg.content_type ===
      'audio' ||
    isAudio(mime)
  ) {
    return (
      <>
        {lightbox &&
          mediaUrl && (
            <Lightbox
              url={mediaUrl}
              mime={mime}
              filename="Voice message"
              onClose={() =>
                setLightbox(
                  false
                )
              }
            />
          )}

        <WaBubble
          isOut={isOut}
          isFirst={
            isFirstInGroup
          }
          isLast={
            isLastInGroup
          }
          time={time}
          status={msg.status}
        >
          {mediaUrl ? (
            <AudioPlayer
              url={mediaUrl}
              isOut={
                isOut
              }
            />
          ) : (
            'Voice message'
          )}
        </WaBubble>
      </>
    )
  }

  /* Image */

  if (
    msg.content_type ===
      'image' ||
    isImage(mime)
  ) {
    return (
      <>
        {lightbox &&
          mediaUrl && (
            <Lightbox
              url={mediaUrl}
              mime={mime}
              filename="Image"
              onClose={() =>
                setLightbox(
                  false
                )
              }
            />
          )}

        <WaBubble
          isOut={isOut}
          isFirst={
            isFirstInGroup
          }
          isLast={
            isLastInGroup
          }
          time={time}
          status={msg.status}
          mediaPad
        >
          {mediaUrl && (
            <img
              src={mediaUrl}
              alt="Image"
              onClick={() =>
                setLightbox(
                  true
                )
              }
              style={{
                maxWidth: 240,
                borderRadius: 8,
                cursor:
                  'zoom-in',
              }}
            />
          )}

          {msg.body && (
            <div
              style={{
                marginTop: 4,
              }}
            >
              {msg.body}
            </div>
          )}
        </WaBubble>
      </>
    )
  }

  /* Video */

  if (
    msg.content_type ===
      'video' ||
    isVideo(mime)
  ) {
    return (
      <>
        {lightbox &&
          mediaUrl && (
            <Lightbox
              url={mediaUrl}
              mime={mime}
              filename="Video"
              onClose={() =>
                setLightbox(
                  false
                )
              }
            />
          )}

        <WaBubble
          isOut={isOut}
          isFirst={
            isFirstInGroup
          }
          isLast={
            isLastInGroup
          }
          time={time}
          status={msg.status}
          mediaPad
        >
          <div
            onClick={() =>
              setLightbox(
                true
              )
            }
            style={{
              cursor:
                'pointer',
            }}
          >
            <video
              src={mediaUrl}
              style={{
                maxWidth: 240,
                borderRadius: 8,
              }}
            />
          </div>

          {msg.body && (
            <div
              style={{
                marginTop: 4,
              }}
            >
              {msg.body}
            </div>
          )}
        </WaBubble>
      </>
    )
  }

  /* Document */

  if (
    msg.content_type ===
      'document' ||
    (mime &&
      !isImage(mime) &&
      !isVideo(mime) &&
      !isAudio(mime) &&
      msg.content_type !==
        'text')
  ) {
    const filename =
      getFileName(msg)

    return (
      <>
        {lightbox &&
          mediaUrl && (
            <Lightbox
              url={mediaUrl}
              mime={mime}
              filename={
                filename
              }
              onClose={() =>
                setLightbox(
                  false
                )
              }
            />
          )}

        <WaBubble
          isOut={isOut}
          isFirst={
            isFirstInGroup
          }
          isLast={
            isLastInGroup
          }
          time={time}
          status={msg.status}
        >
          <div
            onClick={() =>
              mediaUrl &&
              setLightbox(
                true
              )
            }
            style={{
              cursor:
                mediaUrl
                  ? 'pointer'
                  : 'default',
            }}
          >
            📄 {filename}
          </div>
        </WaBubble>
      </>
    )
  }

  /* Template */

  if (
    msg.content_type ===
    'template'
  ) {
    return (
      <WaBubble
        isOut={isOut}
        isFirst={
          isFirstInGroup
        }
        isLast={
          isLastInGroup
        }
        time={time}
        status={msg.status}
      >
        <div
          style={{
            fontSize: 11,
            color:
              'var(--accent)',
            marginBottom: 4,
          }}
        >
          Template:{' '}
          {msg.meta
            ?.template_name ||
            'unknown'}
        </div>

        {msg.body}
      </WaBubble>
    )
  }

  /* Sticker */

  if (
    msg.content_type ===
      'sticker' &&
    mediaUrl
  ) {
    return (
      <div
        className={`wa-msg-row ${
          isOut
            ? 'out'
            : 'in'
        }`}
      >
        <img
          src={mediaUrl}
          alt="Sticker"
          style={{
            width: 120,
            height: 120,
            objectFit:
              'contain',
          }}
        />
      </div>
    )
  }

  /* Default text */

  return (
    <WaBubble
      isOut={isOut}
      isFirst={
        isFirstInGroup
      }
      isLast={
        isLastInGroup
      }
      time={time}
      status={msg.status}
    >
      <span
        style={{
          whiteSpace:
            'pre-wrap',
          wordBreak:
            'break-word',
        }}
      >
        {msg.body}
      </span>
    </WaBubble>
  )
}