'use client'
import { useState } from 'react'
import { formatMessageTime } from '@/lib/utils'
import type { Message } from '@/types'

interface Props {
  message: Message
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  onMarkRead?: (id: string) => void
}

// ── Media Lightbox ─────────────────────────────────────────────────────────────
function Lightbox({ url, mime, filename, onClose }: { url: string; mime: string; filename?: string; onClose: () => void }) {
  const isImage = mime?.startsWith('image/')
  const isVideo = mime?.startsWith('video/')
  const isAudio = mime?.startsWith('audio/')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        zIndex: 9999, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: '90vw', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{filename || 'Media'}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={url} download={filename || 'download'}
              target="_blank" rel="noreferrer"
              style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={e => e.stopPropagation()}
            >
              <i className="fa-solid fa-download" /> Download
            </a>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isImage && (
          <img src={url} alt={filename} style={{ maxWidth: '80vw', maxHeight: '75vh', borderRadius: 8, objectFit: 'contain' }} />
        )}
        {isVideo && (
          <video src={url} controls autoPlay style={{ maxWidth: '80vw', maxHeight: '75vh', borderRadius: 8 }} />
        )}
        {isAudio && (
          <div style={{ background: '#1e2535', borderRadius: 12, padding: 20, minWidth: 300 }}>
            <audio src={url} controls autoPlay style={{ width: '100%' }} />
          </div>
        )}
        {!isImage && !isVideo && !isAudio && (
          <div style={{ background: '#1e2535', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <i className="fa-solid fa-file" style={{ fontSize: 48, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 12 }} />
            <div style={{ color: '#fff', marginBottom: 16 }}>{filename}</div>
            <a href={url} download={filename} target="_blank" rel="noreferrer"
              style={{ padding: '8px 20px', background: 'var(--accent)', borderRadius: 8, color: '#000', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline audio player ─────────────────────────────────────────────────────────
function AudioPlayer({ url, isOut }: { url: string; isOut: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const ref = { current: null as HTMLAudioElement | null }

  function toggle() {
    const el = document.getElementById(`audio-${url.slice(-20)}`) as HTMLAudioElement | null
    if (!el) return
    if (el.paused) { el.play(); setPlaying(true) }
    else { el.pause(); setPlaying(false) }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration ? (current / duration) * 100 : 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
      <audio
        id={`audio-${url.slice(-20)}`}
        src={url}
        onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={e => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => setPlaying(false)}
        style={{ display: 'none' }}
      />
      <button
        onClick={toggle}
        style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
          background: isOut ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.1)',
          color: isOut ? 'var(--accent)' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>
        <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} />
      </button>
      <div style={{ flex: 1 }}>
        <div
          onClick={e => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            const el = document.getElementById(`audio-${url.slice(-20)}`) as HTMLAudioElement | null
            if (el && duration) { el.currentTime = ratio * duration; setCurrent(el.currentTime) }
          }}
          style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: playing ? 'var(--accent)' : 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
          {playing ? fmt(current) : fmt(duration)} voice message
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MessageBubble({ message: msg, isFirstInGroup = true, isLastInGroup = true }: Props) {
  const isOut = msg.direction === 'outbound'
  const time = formatMessageTime(msg.created_at)
  const [lightbox, setLightbox] = useState(false)

  // ── Internal note ──────────────────────────────────────────────────────────
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

  // ── Comment ────────────────────────────────────────────────────────────────
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

  const br = getBorderRadius(isOut, isFirstInGroup, isLastInGroup)
  const mediaUrl = msg.media_url
  const mime = msg.media_mime ?? ''

  // ── Audio message ──────────────────────────────────────────────────────────
  if (msg.content_type === 'audio' || (mime && mime.startsWith('audio/'))) {
    return (
      <>
        {lightbox && mediaUrl && <Lightbox url={mediaUrl} mime={mime || 'audio/mpeg'} filename="Voice message" onClose={() => setLightbox(false)} />}
        <WaBubble isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup} time={time} status={msg.status} br={br}>
          {mediaUrl ? (
            <AudioPlayer url={mediaUrl} isOut={isOut} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6 }}>
              <i className="fa-solid fa-microphone" style={{ color: 'var(--accent)', fontSize: 16 }} />
              <span style={{ fontSize: 12 }}>Voice message (media not available)</span>
            </div>
          )}
        </WaBubble>
      </>
    )
  }

  // ── Image ──────────────────────────────────────────────────────────────────
  if (msg.content_type === 'image' || (mime && mime.startsWith('image/'))) {
    return (
      <>
        {lightbox && mediaUrl && <Lightbox url={mediaUrl} mime={mime || 'image/jpeg'} filename="Image" onClose={() => setLightbox(false)} />}
        <WaBubble isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup} time={time} status={msg.status} br={br} mediaPad>
          {mediaUrl ? (
            <img
              src={mediaUrl} alt="Image"
              onClick={() => setLightbox(true)}
              style={{ borderRadius: 8, maxWidth: 240, display: 'block', width: '100%', cursor: 'zoom-in' }}
            />
          ) : (
            <div style={{ width: 200, height: 120, background: 'rgba(0,0,0,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
              <i className="fa-solid fa-image" style={{ fontSize: 32, color: 'var(--text-muted)' }} />
            </div>
          )}
          {msg.body && <div style={{ fontSize: 13, marginTop: 4, padding: '0 2px' }}>{msg.body}</div>}
        </WaBubble>
      </>
    )
  }

  // ── Video ──────────────────────────────────────────────────────────────────
  if (msg.content_type === 'video' || (mime && mime.startsWith('video/'))) {
    return (
      <>
        {lightbox && mediaUrl && <Lightbox url={mediaUrl} mime={mime || 'video/mp4'} filename="Video" onClose={() => setLightbox(false)} />}
        <WaBubble isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup} time={time} status={msg.status} br={br} mediaPad>
          {mediaUrl ? (
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setLightbox(true)}>
              <video src={mediaUrl} style={{ borderRadius: 8, maxWidth: 240, display: 'block', width: '100%' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-play" style={{ color: '#fff', fontSize: 18, marginLeft: 3 }} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ width: 200, height: 120, background: 'rgba(0,0,0,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
              <i className="fa-solid fa-video" style={{ fontSize: 32, color: 'var(--text-muted)' }} />
            </div>
          )}
          {msg.body && <div style={{ fontSize: 13, marginTop: 4, padding: '0 2px' }}>{msg.body}</div>}
        </WaBubble>
      </>
    )
  }

  // ── Document ───────────────────────────────────────────────────────────────
  if (msg.content_type === 'document' || (mime && !mime.startsWith('image/') && !mime.startsWith('video/') && !mime.startsWith('audio/') && msg.content_type !== 'text')) {
    const filename = msg.meta?.filename ?? 'Document'
    const ext = filename.split('.').pop()?.toUpperCase() ?? mime?.split('/')[1]?.toUpperCase() ?? 'FILE'
    return (
      <>
        {lightbox && mediaUrl && <Lightbox url={mediaUrl} mime={mime || 'application/octet-stream'} filename={filename} onClose={() => setLightbox(false)} />}
        <WaBubble isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup} time={time} status={msg.status} br={br}>
          <div
            onClick={() => mediaUrl && setLightbox(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: mediaUrl ? 'pointer' : 'default', padding: '2px 0' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#e84040', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#fff' }}>
              {ext.slice(0, 4)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{filename}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{mime || 'Document'}</div>
            </div>
            {mediaUrl && <i className="fa-solid fa-download" style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }} />}
          </div>
        </WaBubble>
      </>
    )
  }

  // ── Template ───────────────────────────────────────────────────────────────
  if (msg.content_type === 'template') {
    return (
      <WaBubble isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup} time={time} status={msg.status} br={br}>
        <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
          <i className="fa-solid fa-bolt" style={{ marginRight: 4 }} />
          Template: {msg.meta?.template_name ?? 'unknown'}
        </div>
        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</span>
      </WaBubble>
    )
  }

  // ── Sticker ────────────────────────────────────────────────────────────────
  if (msg.content_type === 'sticker' && msg.media_url) {
    return (
      <div className={`wa-msg-row ${isOut ? 'out' : 'in'} fade-in`} style={{ marginTop: isFirstInGroup ? 6 : 2 }}>
        {!isOut && <div className="wa-avatar-slot">{isFirstInGroup && <div className="wa-avatar"><i className="fa-solid fa-user" style={{ fontSize: 12 }} /></div>}</div>}
        <img src={msg.media_url} alt="Sticker" style={{ width: 120, height: 120, objectFit: 'contain' }} />
      </div>
    )
  }

  // ── Default: text ──────────────────────────────────────────────────────────
  return (
    <WaBubble isOut={isOut} isFirst={isFirstInGroup} isLast={isLastInGroup} time={time} status={msg.status} br={br}>
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</span>
    </WaBubble>
  )
}

// ── WaBubble wrapper ──────────────────────────────────────────────────────────
interface BubbleProps {
  isOut: boolean; isFirst: boolean; isLast: boolean
  time: string; status: string; br: string
  children: React.ReactNode; mediaPad?: boolean
}
function WaBubble({ isOut, isFirst, isLast, time, status, br, children, mediaPad }: BubbleProps) {
  return (
    <div className={`wa-msg-row ${isOut ? 'out' : 'in'} fade-in`} style={{ marginTop: isFirst ? 6 : 2 }}>
      {!isOut && (
        <div className="wa-avatar-slot">
          {isFirst && <div className="wa-avatar"><i className="fa-solid fa-user" style={{ fontSize: 12 }} /></div>}
        </div>
      )}
      <div className={`wa-bubble ${isOut ? 'wa-out' : 'wa-in'} ${isLast ? (isOut ? 'wa-tail-out' : 'wa-tail-in') : ''}`}
        style={{ borderRadius: br, padding: mediaPad ? '4px 4px 4px 4px' : undefined }}>
        {children}
        <div className="wa-meta">
          <span className="wa-time">{time}</span>
          {isOut && <TickIcon status={status} />}
        </div>
      </div>
    </div>
  )
}

function getBorderRadius(isOut: boolean, isFirst: boolean, isLast: boolean) {
  const r = '12px', tail = '3px', mid = '4px'
  if (isFirst && isLast) return isOut ? `${r} ${r} ${tail} ${r}` : `${r} ${r} ${r} ${tail}`
  if (isFirst) return isOut ? `${r} ${r} ${mid} ${r}` : `${r} ${r} ${r} ${mid}`
  if (isLast) return isOut ? `${mid} ${r} ${tail} ${r}` : `${r} ${mid} ${r} ${tail}`
  return isOut ? `${mid} ${r} ${mid} ${r}` : `${r} ${mid} ${r} ${mid}`
}

function TickIcon({ status }: { status: string }) {
  if (status === 'read') return <span className="wa-ticks wa-read"><i className="fa-solid fa-check-double" /></span>
  if (status === 'delivered') return <span className="wa-ticks"><i className="fa-solid fa-check-double" /></span>
  if (status === 'failed') return <span className="wa-ticks wa-fail"><i className="fa-solid fa-circle-exclamation" /></span>
  return <span className="wa-ticks wa-sent"><i className="fa-solid fa-check" /></span>
}
