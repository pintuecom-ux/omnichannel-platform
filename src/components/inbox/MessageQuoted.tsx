import React from 'react'
import type { Message } from '@/types'

function getFileName(msg: Message) {
  return msg.meta?.filename ?? msg.meta?.file_name ?? msg.body ?? 'Document'
}

export function QuotedPreview({
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
      <div style={{ fontSize: 10, fontWeight: 700, color: isOut ? '#25d366' : 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
        {quoted ? (isOut ? 'You' : (quoted.meta?.from_name ?? 'Contact')) : 'Unknown'}
      </div>

      {quoted?.media_url && quoted.content_type === 'image' && (
        <img
          src={quoted.media_url}
          alt=""
          style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 3, display: 'block', marginBottom: 2 }}
        />
      )}

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
        {preview}
      </div>
    </div>
  )
}
