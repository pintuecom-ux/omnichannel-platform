'use client'
import React, { useState } from 'react'
import { useInboxStore } from '@/stores/useInboxStore'
import type { Message } from '@/types'

const QUICK_EMOJIS = ['❤️', '👍', '😂', '🔥', '😮', '😢', '😡', '🙏']

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
        top: -16,
        ...(isOut ? { left: 12 } : { right: 12 }),
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: 24,
        background: 'var(--bg-panel, rgba(28, 30, 38, 0.90))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border, rgba(255,255,255,0.15))',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
        zIndex: 50,
        transition: 'all 0.2s ease',
      }}
    >
      {showEmojis && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            ...(isOut ? { left: 0 } : { right: 0 }),
            background: 'var(--bg-panel, rgba(28, 30, 38, 0.95))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border, rgba(255,255,255,0.18))',
            borderRadius: 24,
            padding: '6px 10px',
            display: 'flex',
            gap: 6,
            boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
            whiteSpace: 'nowrap',
            zIndex: 60,
          }}
        >
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => sendReaction(e)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 20,
                padding: '2px 4px', lineHeight: 1, fontFamily: 'inherit',
                transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1.35)' }}
              onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Instant 1-Click Heart Reaction */}
      <button
        onClick={() => sendReaction('❤️')}
        title="Quick React ❤️"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2px', lineHeight: 1,
          transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1.25)' }}
        onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      >
        ❤️
      </button>

      {/* Expandable Emoji Picker Tray */}
      <button
        onClick={() => setShowEmojis((v) => !v)}
        title="More Reactions"
        style={{
          background: showEmojis ? 'rgba(255,255,255,0.15)' : 'transparent',
          border: 'none', cursor: 'pointer',
          width: 22, height: 22, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: showEmojis ? '#ff3b30' : 'var(--text-muted, #a0a0b0)', fontSize: 13,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.color = 'var(--text-primary, #fff)' }}
        onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.color = showEmojis ? '#ff3b30' : 'var(--text-muted, #a0a0b0)' }}
      >
        <i className="fa-regular fa-face-smile" />
      </button>

      {/* Reply Action */}
      <button
        onClick={() => setReplyTo(msg)}
        title="Reply to message"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          width: 22, height: 22, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted, #a0a0b0)', fontSize: 12,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.color = 'var(--text-primary, #fff)' }}
        onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.color = 'var(--text-muted, #a0a0b0)' }}
      >
        <i className="fa-solid fa-reply" />
      </button>
    </div>
  )
}
