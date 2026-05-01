'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboxStore, useActiveConversation } from '@/stores/useInboxStore'
import { getInitials, getAvatarColor } from '@/lib/utils'

const QUICK_TAGS = ['VIP', 'Lead', 'Hot Lead', 'B2B', 'Repeat Buyer', 'Wholesale', 'Delhi NCR']

export default function InfoPanel() {
  const supabase = createClient()
  const { updateConversation } = useInboxStore()
  const conversation = useActiveConversation()
  const [showDrawer, setShowDrawer] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])

  if (!conversation) return null
  const contact = conversation.contact
  if (!contact) return null
  const safeConversation = conversation
  const safeContact = contact

  const name = contact.name || contact.phone || contact.instagram_username || 'Unknown'
  const initials = getInitials(name)
  const color = getAvatarColor(contact.id)
  const platform = conversation.platform
  const platformIcon = { whatsapp: 'fa-brands fa-whatsapp', instagram: 'fa-brands fa-instagram', facebook: 'fa-brands fa-facebook' }[platform]
  const platformCls = { whatsapp: 'pp-wa', instagram: 'pp-ig', facebook: 'pp-fb' }[platform]
  const platformLabel = { whatsapp: 'WA', instagram: 'IG', facebook: 'FB' }[platform]

  function openDrawer() {
    setEditName(contact!.name || '')
    setEditPhone(contact!.phone || '')
    setEditTags(contact!.tags || [])
    setShowDrawer(true)
  }

  function toggleTag(tag: string) {
    setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function saveContact() {
    await supabase
      .from('contacts')
      .update({ name: editName, phone: editPhone, tags: editTags, updated_at: new Date().toISOString() })
      .eq('id', contact!.id)
    setShowDrawer(false)
    // Reflect in store
    updateConversation(safeConversation.id, {
      contact: { ...contact!, name: editName, phone: editPhone, tags: editTags },
    })
  }

  async function cycleStatus() {
    const cycle = ['open', 'pending', 'closed'] as const
    const current = safeConversation.status as 'open' | 'pending' | 'closed'
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length]
    await supabase.from('conversations').update({ status: next }).eq('id', safeConversation.id)
    updateConversation(safeConversation.id, { status: next })
  }

  return (
    <>
      <div id="info-panel">
        {/* Contact header */}
        <div className="contact-card-top">
          <button className="contact-edit-btn" onClick={openDrawer}>
            <i className="fa-solid fa-pen" />
          </button>
          <div
            className="contact-big-avatar"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
          >
            {initials}
          </div>
          <div className="contact-big-name">{name}</div>
          <div className="contact-big-phone">
            {contact.phone || contact.instagram_username || contact.facebook_id || 'No contact info'}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <span className={`platform-pill-sm ${platformCls}`}>
              <i className={platformIcon} /> {platformLabel}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="info-section">
          <div className="info-section-title">Tags</div>
          <div className="tag-list">
            {(contact.tags || []).length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', cursor: 'pointer' }} onClick={openDrawer}>
                Add tags…
              </span>
            ) : (
              (contact.tags || []).map(tag => (
                <span
                  key={tag}
                  className={`tag ${tag === 'Hot Lead' ? 'hot-lead' : tag === 'VIP' ? 'vip-t' : tag === 'Repeat Buyer' ? 'repeat' : ''}`}
                >
                  {tag}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Assigned */}
        <div className="info-section">
          <div className="info-section-title">Assigned To</div>
          <div className="assign-area">
            <div className="assign-avatar" style={{ background: 'var(--accent2)' }}>
              {getInitials(conversation.assignee?.full_name || 'Unassigned')}
            </div>
            <span className="assign-name">{conversation.assignee?.full_name || 'Unassigned'}</span>
            <span className="assign-change">Change</span>
          </div>
        </div>

        {/* Conversation info */}
        <div className="info-section">
          <div className="info-section-title">Conversation</div>
          <div className="info-row">
            <span className="label">Platform</span>
            <span className="value" style={{ textTransform: 'capitalize' }}>{platform}</span>
          </div>
          <div className="info-row">
            <span className="label">Status</span>
            <span
              className="value"
              style={{
                cursor: 'pointer',
                textTransform: 'capitalize',
                color: conversation.status === 'open' ? 'var(--accent)' : conversation.status === 'pending' ? 'var(--accent3)' : 'var(--text-muted)',
              }}
              onClick={cycleStatus}
            >
              {conversation.status} ↺
            </span>
          </div>
          <div className="info-row">
            <span className="label">Unread</span>
            <span className="value">{conversation.unread_count}</span>
          </div>
          <div className="info-row">
            <span className="label">Pinned</span>
            <span className="value">{conversation.is_pinned ? 'Yes' : 'No'}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="info-section">
          <div className="info-section-title">Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="quick-action-btn" onClick={openDrawer}>
              <i className="fa-solid fa-tag" /> Add / Edit Tags
            </button>
            <button className="quick-action-btn">
              <i className="fa-solid fa-calendar-plus" /> Schedule Follow-up
            </button>
            <button className="quick-action-btn">
              <i className="fa-solid fa-file-lines" /> Create Lead
            </button>
            <button className="quick-action-btn primary-action">
              <i className="fa-solid fa-cart-shopping" /> Create Order
            </button>
          </div>
        </div>
      </div>

      {/* Edit Drawer */}
      <div
        className={`edit-drawer-overlay ${showDrawer ? 'open' : ''}`}
        onClick={() => setShowDrawer(false)}
      >
        <div
          className={`edit-drawer ${showDrawer ? 'open' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="edit-drawer-header">
            <div className="edit-drawer-title">
              <i className="fa-solid fa-user-pen" style={{ color: 'var(--accent)', marginRight: 6, fontSize: 12 }} />
              Edit Contact
            </div>
            <div className="edit-drawer-actions">
              <button className="icon-btn" onClick={() => setShowDrawer(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          <div className="edit-body">
            <div className="edit-field">
              <div className="edit-label">Name</div>
              <input
                className="edit-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Contact name"
              />
            </div>
            <div className="edit-field">
              <div className="edit-label">Phone</div>
              <input
                className="edit-input"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="edit-field">
              <div className="edit-label">Tags</div>
              <div className="edit-tags-row">
                {QUICK_TAGS.map(tag => (
                  <div
                    key={tag}
                    className={`edit-tag-chip ${editTags.includes(tag) ? 'on' : ''} ${tag === 'Hot Lead' || tag === 'VIP' ? 'amber' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {editTags.includes(tag) && (
                      <i className="fa-solid fa-check" style={{ fontSize: 9 }} />
                    )}
                    {tag}
                  </div>
                ))}
              </div>
            </div>
            <div className="edit-field">
              <div className="edit-label">Assigned To</div>
              <select className="edit-input">
                <option>{conversation.assignee?.full_name || 'Unassigned'}</option>
              </select>
            </div>
            <div className="edit-divider" />
            <button className="edit-save-btn" onClick={saveContact}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  )
}