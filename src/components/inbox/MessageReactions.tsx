'use client'
import React, { useState } from 'react'
import { useInboxStore } from '@/stores/useInboxStore'
import type { Message } from '@/types'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function HoverBar({ msg, isOut }: { msg: Message; isOut: boolean }) {
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
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 20,
                padding: '2px 3px', lineHeight: 1, fontFamily: 'inherit', transition: 'transform 0.12s',
              }}
              onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1.3)' }}
              onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
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
          width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)',
          background: 'var(--bg-panel)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: showEmojis ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13,
        }}
      >
        <i className="fa-regular fa-face-smile" />
      </button>

      <button
        onClick={() => setReplyTo(msg)}
        title="Reply"
        style={{
          width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)',
          background: 'var(--bg-panel)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: 12,
        }}
      >
        <i className="fa-solid fa-reply" />
      </button>
    </div>
  )
}
