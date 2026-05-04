import React from 'react'

export function isImage(mime = '') {
  return mime.startsWith('image/')
}

export function isVideo(mime = '') {
  return mime.startsWith('video/')
}

export function isAudio(mime = '') {
  return mime.startsWith('audio/')
}

export function Lightbox({
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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>
            {filename || 'Media'}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download={filename || 'download'}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,.12)', color: '#fff', textDecoration: 'none', fontSize: 12 }}
            >
              Download
            </a>

            <button
              onClick={onClose}
              style={{ width: 34, height: 34, border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#fff', background: 'rgba(255,255,255,.12)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {image && (
          <img src={url} alt={filename} style={{ maxWidth: '80vw', maxHeight: '75vh', borderRadius: 8, objectFit: 'contain' }} />
        )}

        {video && (
          <video src={url} controls autoPlay style={{ maxWidth: '80vw', maxHeight: '75vh', borderRadius: 8 }} />
        )}

        {audio && (
          <div style={{ background: '#1e2535', borderRadius: 12, padding: 20, minWidth: 300 }}>
            <audio src={url} controls autoPlay style={{ width: '100%' }} />
          </div>
        )}

        {!image && !video && !audio && (
          <div style={{ background: '#1e2535', borderRadius: 12, padding: 30, color: '#fff', textAlign: 'center' }}>
            <div style={{ marginBottom: 10, fontSize: 18 }}>{filename}</div>
            <a href={url} target="_blank" rel="noreferrer" download={filename} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#000', textDecoration: 'none', fontWeight: 700 }}>
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
