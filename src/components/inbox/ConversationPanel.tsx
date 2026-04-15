'use client'
import { useInboxStore, useFilteredConversations } from '@/stores/useInboxStore'
import ConversationItem from './ConversationItem'

interface Props {
  onRefresh: () => void
}

export default function ConversationPanel({ onRefresh }: Props) {
  const {
    platformFilter, setPlatformFilter,
    tabFilter, setTabFilter,
    searchQuery, setSearchQuery,
    isBulkMode, toggleBulkMode,
    selectedIds,
    clearSelection,
  } = useInboxStore()

  const conversations = useFilteredConversations()

  function bulkAction(action: string) {
    alert(`${action} applied to ${selectedIds.size} conversations`)
    clearSelection()
  }

  return (
    <div id="conv-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title-tabs">
          <button className="ptab active">Chats</button>
          <div className="ptab-sep" />
          <button className="ptab">Comments</button>
        </div>
        <div className="header-actions">
          <button
            className="icon-btn"
            title="Bulk Select"
            onClick={toggleBulkMode}
            style={isBulkMode ? { color: 'var(--accent)' } : {}}
          >
            <i className="fa-solid fa-check-square" />
          </button>
          <button className="icon-btn" title="New Conversation">
            <i className="fa-solid fa-pen-to-square" />
          </button>
          <button className="icon-btn" title="Refresh" onClick={onRefresh}>
            <i className="fa-solid fa-rotate" />
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {isBulkMode && (
        <div className={`bulk-action-bar ${selectedIds.size > 0 ? 'visible' : ''}`}>
          <span className="bulk-count">{selectedIds.size} selected</span>
          <button className="bulk-btn" onClick={() => bulkAction('assign')}>
            <i className="fa-solid fa-user-check" /> Assign
          </button>
          <button className="bulk-btn" onClick={() => bulkAction('tag')}>
            <i className="fa-solid fa-tag" /> Tag
          </button>
          <button className="bulk-btn danger" onClick={() => bulkAction('close')}>
            <i className="fa-solid fa-circle-xmark" /> Close
          </button>
          <button className="icon-btn" onClick={toggleBulkMode}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="search-box">
        <div className="search-input-wrap">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Platform filters */}
      <div className="platform-filter-row">
        {(['all', 'whatsapp', 'instagram', 'facebook'] as const).map(p => (
          <button
            key={p}
            className={`pf-btn ${platformFilter === p ? 'active' : ''}`}
            onClick={() => setPlatformFilter(p)}
          >
            {p === 'all' && 'All'}
            {p === 'whatsapp' && <><i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }} /> WA</>}
            {p === 'instagram' && <><i className="fa-brands fa-instagram" style={{ color: '#e1306c' }} /> IG</>}
            {p === 'facebook' && <><i className="fa-brands fa-facebook" style={{ color: '#1877f2' }} /> FB</>}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="conv-tabs">
        {(['all', 'unread', 'pinned', 'groups'] as const).map(t => (
          <div
            key={t}
            className={`conv-tab ${tabFilter === t ? 'active' : ''}`}
            onClick={() => setTabFilter(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {/* List */}
      <div className={`conv-list ${isBulkMode ? 'bulk-mode' : ''}`}>
        {conversations.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-inbox" />
            <p>
              {searchQuery
                ? 'No conversations match your search'
                : 'No conversations yet. Connect WhatsApp, Instagram or Facebook in Settings.'}
            </p>
          </div>
        ) : (
          conversations.map(conv => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))
        )}
      </div>
    </div>
  )
}