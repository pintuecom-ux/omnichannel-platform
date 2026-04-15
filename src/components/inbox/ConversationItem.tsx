'use client'
import { useInboxStore } from '@/stores/useInboxStore'
import { getInitials, getAvatarColor, formatConvTime } from '@/lib/utils'
import type { Conversation } from '@/types'

const BADGE_CLASS: Record<string, string> = {
  whatsapp: 'pb-wa',
  instagram: 'pb-ig',
  facebook: 'pb-fb',
}

const PLATFORM_ICON: Record<string, string> = {
  whatsapp: 'fa-brands fa-whatsapp',
  instagram: 'fa-brands fa-instagram',
  facebook: 'fa-brands fa-facebook',
}

interface Props {
  conversation: Conversation
}

export default function ConversationItem({ conversation: c }: Props) {
  const { activeConversationId, setActiveConversation, isBulkMode, selectedIds, toggleSelectConv } = useInboxStore()

  const isActive = c.id === activeConversationId
  const isSelected = selectedIds.has(c.id)

  const name = c.contact?.name || c.contact?.phone || c.contact?.instagram_username || 'Unknown'
  const initials = getInitials(name)
  const color = getAvatarColor(c.contact_id || c.id)

  function handleClick() {
    if (isBulkMode) {
      toggleSelectConv(c.id)
    } else {
      setActiveConversation(c.id)
    }
  }

  return (
    <div
      className={`conv-item ${isActive ? 'active' : ''}`}
      onClick={handleClick}
    >
      {isBulkMode && (
        <div className={`conv-item-checkbox ${isSelected ? 'checked' : ''}`} />
      )}

      {/* Avatar with platform badge */}
      <div className="avatar-wrap">
        <div className="avatar" style={{ background: color }}>
          {initials}
        </div>
        <div className={`platform-badge ${BADGE_CLASS[c.platform]}`}>
          <i className={PLATFORM_ICON[c.platform]} style={{ fontSize: '8px' }} />
        </div>
      </div>

      {/* Info */}
      <div className="conv-info">
        <div className="conv-name-row">
          <span className="conv-name">{name}</span>
          <span className="conv-time">{formatConvTime(c.last_message_at)}</span>
        </div>
        <div className="conv-preview-row">
          <span className="conv-preview">
            {c.unread_count === 0 && (
              <i className="fa-solid fa-check-double" style={{ marginRight: 3, color: 'var(--accent)', fontSize: 10 }} />
            )}
            {c.last_message || 'No messages yet'}
          </span>
          <div className="conv-badges">
            {c.is_pinned && (
              <i className="fa-solid fa-thumbtack" style={{ color: 'var(--text-muted)', fontSize: '10px' }} />
            )}
            {c.tags?.includes('VIP') && <span className="badge vip">VIP</span>}
            {c.tags?.includes('Lead') && <span className="badge lead">Lead</span>}
            {c.tags?.includes('Hot Lead') && <span className="badge hot">Hot</span>}
            {c.unread_count > 0 && (
              <span className="unread-count">{c.unread_count}</span>
            )}
          </div>
        </div>

        {/* SLA timer if status is pending */}
        {c.status === 'pending' && (
          <div className="sla-timer amber">
            <i className="fa-solid fa-clock" />
            Pending reply
          </div>
        )}
      </div>
    </div>
  )
}