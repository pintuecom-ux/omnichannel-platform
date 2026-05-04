import React from 'react'

export interface AttachPreview {
  file: File
  url: string
  type: 'image' | 'video' | 'audio' | 'document'
}

export function InputAttachmentPreview({
  attachPreview,
  attachCaption,
  setAttachCaption,
  sending,
  sendAttachment,
  cancelAttach,
}: {
  attachPreview: AttachPreview
  attachCaption: string
  setAttachCaption: (v: string) => void
  sending: boolean
  sendAttachment: () => void
  cancelAttach: () => void
}) {
  return (
    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', padding: 16, zIndex: 150 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flexShrink: 0 }}>
          {attachPreview.type === 'image' && <img src={attachPreview.url} alt="preview" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8 }} />}
          {attachPreview.type === 'video' && <video src={attachPreview.url} style={{ width: 120, height: 90, borderRadius: 8, objectFit: 'cover' }} />}
          {attachPreview.type === 'audio' && (
            <div style={{ width: 120, height: 60, background: 'var(--bg-surface)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-microphone" style={{ fontSize: 28, color: 'var(--accent)' }} />
            </div>
          )}
          {attachPreview.type === 'document' && (
            <div style={{ width: 80, height: 80, background: '#e84040', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <i className="fa-solid fa-file" style={{ fontSize: 24, color: '#fff' }} />
              <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{attachPreview.file.name.split('.').pop()?.toUpperCase()}</span>
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{attachPreview.file.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            {(attachPreview.file.size / 1024 / 1024).toFixed(2)} MB
          </div>
          {['image', 'video', 'document'].includes(attachPreview.type) && (
            <input className="form-input" style={{ fontSize: 13 }}
              placeholder="Add a caption (optional)…"
              value={attachCaption}
              onChange={e => setAttachCaption(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendAttachment() }}
              autoFocus
            />
          )}
          {attachPreview.type === 'audio' && (
            <audio src={attachPreview.url} controls style={{ width: '100%', marginTop: 4 }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="send-btn" onClick={sendAttachment} disabled={sending}>
            {sending ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
          </button>
          <button onClick={cancelAttach}
            style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-xmark" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    </div>
  )
}
