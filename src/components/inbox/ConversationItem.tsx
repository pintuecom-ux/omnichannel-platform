'use client'
import { useInboxStore } from '@/stores/useInboxStore'
import { getInitials, getAvatarColor, formatConvTime } from '@/lib/utils'
import type { Conversation } from '@/types'

const BADGE_CLS: Record<string, string> = { whatsapp: 'pb-wa', instagram: 'pb-ig', facebook: 'pb-fb' }
const PLATFORM_ICON: Record<string, string> = { whatsapp: 'fa-brands fa-whatsapp', instagram: 'fa-brands fa-instagram', facebook: 'fa-brands fa-facebook' }

// Returns a human-readable label and icon class for a last message
function getLastMessageDisplay(msg: string | null): { text: string; icon?: string; iconColor?: string } {
  if (!msg) return { text: 'No messages yet' }

  // Raw content_type patterns stored as last_message
  const lower = msg.toLowerCase()
  if (lower === '[image]' || lower === 'image')     return { text: 'Photo', icon: 'fa-solid fa-image', iconColor: '#4ade80' }
  if (lower === '[video]' || lower === 'video')     return { text: 'Video', icon: 'fa-solid fa-video', iconColor: '#60a5fa' }
  if (lower === '[audio]' || lower === 'audio')     return { text: 'Voice message', icon: 'fa-solid fa-microphone', iconColor: '#f472b6' }
  if (lower === '[document]' || lower === 'document') return { text: 'Document', icon: 'fa-solid fa-file', iconColor: '#fb923c' }
  if (lower === '[sticker]' || lower === 'sticker') return { text: 'Sticker', icon: 'fa-solid fa-face-smile', iconColor: '#facc15' }
  if (lower === '[location]' || lower === 'location') return { text: 'Location', icon: 'fa-solid fa-location-dot', iconColor: '#a78bfa' }
  if (lower === '[reaction]' || lower === 'reaction') return { text: 'Reaction', icon: 'fa-solid fa-heart', iconColor: '#f87171' }
  if (lower.startsWith('[template:')) return { text: 'Template message', icon: 'fa-solid fa-bolt', iconColor: 'var(--accent)' }
  if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.gif') || lower.includes('.webp'))
    return { text: 'Photo', icon: 'fa-solid fa-image', iconColor: '#4ade80' }
  if (lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.avi'))
    return { text: 'Video', icon: 'fa-solid fa-video', iconColor: '#60a5fa' }
  if (lower.includes('.pdf'))
    return { text: 'PDF Document', icon: 'fa-solid fa-file-pdf', iconColor: '#fb923c' }
  if (lower.includes('.mp3') || lower.includes('.ogg') || lower.includes('.webm') || lower.includes('.wav'))
    return { text: 'Voice message', icon: 'fa-solid fa-microphone', iconColor: '#f472b6' }

  return { text: msg }
}

interface Props { conversation: Conversation }

export default function ConversationItem({ conversation: c }: Props) {
  const { activeConversationId, setActiveConversation, isBulkMode, selectedIds, toggleSelectConv } = useInboxStore()
  const isActive = c.id === activeConversationId
  const isSelected = selectedIds.has(c.id)
  const name = c.contact?.name || c.contact?.phone || c.contact?.instagram_username || 'Unknown'
  const { text: lastText, icon: lastIcon, iconColor: lastIconColor } = getLastMessageDisplay(c.last_message)

  function handleClick() {
    if (isBulkMode) { toggleSelectConv(c.id); return }
    if (isActive) return
    setActiveConversation(c.id)
  }

  return (
    <div className={`conv-item ${isActive ? 'active' : ''}`} onClick={handleClick}>
      {isBulkMode && <div className={`conv-item-checkbox ${isSelected ? 'checked' : ''}`} />}

      <div className="avatar-wrap">
        <div className="avatar" style={{ background: getAvatarColor(c.contact_id || c.id) }}>
          {getInitials(name)}
        </div>
        <div className={`platform-badge ${BADGE_CLS[c.platform]}`}>
          <i className={PLATFORM_ICON[c.platform]} style={{ fontSize: '8px' }} />
        </div>
      </div>

      <div className="conv-info">
        <div className="conv-name-row">
          <span className="conv-name">{name}</span>
          <span className="conv-time">{formatConvTime(c.last_message_at)}</span>
        </div>
        <div className="conv-preview-row">
          <span className="conv-preview" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {c.unread_count === 0 && !lastIcon && (
              <i className="fa-solid fa-check-double" style={{ fontSize: 10, color: 'var(--accent)', flexShrink: 0 }} />
            )}
            {lastIcon && (
              <i className={lastIcon} style={{ fontSize: 11, color: lastIconColor, flexShrink: 0 }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lastText}
            </span>
          </span>
          <div className="conv-badges">
            {c.is_pinned && <i className="fa-solid fa-thumbtack" style={{ color: 'var(--text-muted)', fontSize: 10 }} />}
            {c.tags?.includes('VIP')      && <span className="badge vip">VIP</span>}
            {c.tags?.includes('Hot Lead') && <span className="badge hot">Hot</span>}
            {c.unread_count > 0 && <span className="unread-count">{c.unread_count}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
