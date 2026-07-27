'use client'

import { useEffect, useState } from 'react'

type MediaItem = {
  id: string
  source: 'social_post' | 'chat_message'
  platform: 'whatsapp' | 'instagram' | 'facebook'
  media_type: 'image' | 'video' | 'audio' | 'document' | 'pdf' | 'sticker' | string
  media_url?: string | null
  thumbnail_url?: string | null
  caption?: string | null
  timestamp?: string | null
  permalink?: string | null
  like_count?: number
  comment_count?: number
  metrics?: Record<string, number>
  contact_name?: string
  direction?: 'inbound' | 'outbound'
}

const PLATFORM_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  whatsapp: { icon: 'fa-brands fa-whatsapp', color: '#25D366', label: 'WhatsApp' },
  instagram: { icon: 'fa-brands fa-instagram', color: '#E1306C', label: 'Instagram' },
  facebook: { icon: 'fa-brands fa-facebook', color: '#1877F2', label: 'Facebook' },
}

function isPdfOrDoc(item: MediaItem, url?: string | null): boolean {
  const type = (item.media_type || '').toLowerCase()
  const lowerUrl = (url || '').toLowerCase()
  return (
    type === 'document' ||
    type === 'pdf' ||
    lowerUrl.includes('.pdf') ||
    lowerUrl.includes('.doc') ||
    lowerUrl.includes('.docx') ||
    lowerUrl.includes('.xls') ||
    lowerUrl.includes('.xlsx') ||
    lowerUrl.includes('.txt')
  )
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'social' | 'chat' | 'images' | 'videos' | 'docs'>('all')
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null)

  const [stats, setStats] = useState({ total: 0, social: 0, chat: 0 })

  async function loadMedia(sync = false) {
    if (sync) setSyncing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/media${sync ? '?sync=true' : ''}`, { cache: 'no-store' })
      const json = await res.json()
      const list: MediaItem[] = json.media ?? []
      setMedia(list)
      setStats({
        total: json.total_count ?? list.length,
        social: json.social_count ?? list.filter(m => m.source === 'social_post').length,
        chat: json.chat_count ?? list.filter(m => m.source === 'chat_message').length,
      })
    } catch (err) {
      console.error('[Media Library] Load error:', err)
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadMedia(false)
  }, [])

  // Filter media based on active tab
  const filteredMedia = media.filter(item => {
    const srcUrl = item.media_url || item.thumbnail_url
    if (activeTab === 'social') return item.source === 'social_post'
    if (activeTab === 'chat') return item.source === 'chat_message'
    if (activeTab === 'images') return item.media_type === 'image' && !isPdfOrDoc(item, srcUrl)
    if (activeTab === 'videos') return item.media_type === 'video'
    if (activeTab === 'docs') return isPdfOrDoc(item, srcUrl) || item.media_type === 'audio'
    return true
  })

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>
            Publishing / Media Library
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.5px' }}>
            Media Library
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 680, lineHeight: 1.5 }}>
            Showcasing all media assets across social posts, connected pages, and customer messaging conversations in your workspace.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            disabled={loading || syncing}
            onClick={() => loadMedia(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 600 }}
          >
            <i className={`fa-solid fa-arrows-rotate ${syncing ? 'fa-spin' : ''}`} />
            {syncing ? 'Syncing Social Posts…' : 'Sync Media'}
          </button>
        </div>
      </div>

      {/* ── Stats Summary Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Media Assets</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{stats.total}</div>
        </div>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Social Posts & Pages</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent2)' }}>{stats.social}</div>
        </div>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Chat & Messaging Media</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{stats.chat}</div>
        </div>
      </div>

      {/* ── Filter Tabs (Clean Pills UI) ── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'var(--bg-panel)',
          padding: 8,
          borderRadius: 16,
          border: '1px solid var(--border)',
        }}
      >
        {[
          { id: 'all', label: 'All Media', icon: 'fa-solid fa-photo-film' },
          { id: 'social', label: 'Social Posts', icon: 'fa-brands fa-instagram' },
          { id: 'chat', label: 'Chat Messages', icon: 'fa-solid fa-comments' },
          { id: 'images', label: 'Images', icon: 'fa-solid fa-image' },
          { id: 'videos', label: 'Videos', icon: 'fa-solid fa-video' },
          { id: 'docs', label: 'Docs & PDFs', icon: 'fa-solid fa-file-pdf' },
        ].map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#000' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <i className={tab.icon} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Media Grid ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, marginBottom: 12, color: 'var(--accent)' }} />
          <div>Fetching Media Library...</div>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: 'var(--bg-panel)', borderRadius: 16, border: '1px dashed var(--border)' }}>
          <i className="fa-solid fa-photo-film" style={{ fontSize: 42, color: 'var(--text-muted)', marginBottom: 16, opacity: 0.5 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No media found in this filter</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Click "Sync Media" above to fetch posts from Instagram and Facebook Pages.</div>
          <button className="btn btn-secondary" onClick={() => loadMedia(true)}>
            Sync Media Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filteredMedia.map(item => {
            const platformInfo = PLATFORM_ICONS[item.platform] || PLATFORM_ICONS.whatsapp
            const rawSrcUrl = (item.media_url || item.thumbnail_url)
            const srcUrl = rawSrcUrl?.replace(/&amp;/g, '&')
            const isDoc = isPdfOrDoc(item, srcUrl)

            return (
              <article
                key={item.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: 'var(--bg-panel)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Media Preview Box */}
                <div
                  onClick={() => {
                    if (isDoc && srcUrl) {
                      window.open(srcUrl, '_blank')
                    } else {
                      setPreviewMedia(item)
                    }
                  }}
                  style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    background: '#0d1117',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {isDoc ? (
                    /* ── PDF / Document Render Box ── */
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(0,0,0,0.4))',
                        padding: 20,
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 76,
                          background: '#e11d48',
                          borderRadius: '8px 16px 8px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          boxShadow: '0 8px 20px rgba(225,29,72,0.3)',
                          position: 'relative',
                        }}
                      >
                        <i className="fa-solid fa-file-pdf" style={{ fontSize: 28, marginBottom: 2 }} />
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>PDF</span>
                      </div>

                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.caption || 'Document File'}
                      </div>

                      <span style={{ fontSize: 11, color: '#f43f5e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Click to Open PDF <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9 }} />
                      </span>
                    </div>
                  ) : srcUrl ? (
                    item.media_type === 'video' ? (
                      <video src={srcUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img
                        src={srcUrl}
                        alt={item.caption || 'Media asset'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    )
                  ) : (
                    <i className="fa-solid fa-image" style={{ fontSize: 42, color: 'rgba(255,255,255,0.2)' }} />
                  )}

                  {/* Platform & Source Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(0,0,0,0.75)',
                      backdropFilter: 'blur(8px)',
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <i className={platformInfo.icon} style={{ color: platformInfo.color }} />
                    {item.source === 'social_post' ? 'Social Post' : (item.direction === 'inbound' ? 'Inbound DM' : 'Outbound DM')}
                  </div>
                </div>

                {/* Body Details */}
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                        {isDoc ? 'DOCUMENT' : item.media_type}
                      </span>
                      <span>{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Recent'}</span>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 12, minHeight: 40, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.caption || 'No caption provided'}
                    </div>
                  </div>

                  {/* Footer & Metrics */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    {item.source === 'social_post' ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <span><i className="fa-regular fa-heart" /> {item.like_count ?? 0}</span>
                          <span><i className="fa-regular fa-comment" /> {item.comment_count ?? 0}</span>
                        </div>
                        {item.permalink && (
                          <a
                            href={item.permalink}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 600, textDecoration: 'none' }}
                          >
                            Open Post <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10 }} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span>
                          <i className={`fa-solid ${item.direction === 'inbound' ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}`} style={{ color: item.direction === 'inbound' ? '#4ade80' : 'var(--accent)' }} />
                          {' '}{item.contact_name}
                        </span>
                        {srcUrl && (
                          <a
                            href={srcUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: isDoc ? '#f43f5e' : 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            {isDoc ? 'View PDF' : 'View File'} <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9 }} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ── Media Lightbox Modal ── */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              maxWidth: 700,
              width: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Media Preview</div>
              <button
                onClick={() => setPreviewMedia(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '60vh', overflow: 'hidden' }}>
              {previewMedia.media_type === 'video' ? (
                <video src={previewMedia.media_url?.replace(/&amp;/g, '&') || undefined} controls autoPlay style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
              ) : (
                <img src={previewMedia.media_url?.replace(/&amp;/g, '&') || undefined} alt="Preview" style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
              )}
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>{previewMedia.caption || 'No caption'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{previewMedia.timestamp ? new Date(previewMedia.timestamp).toLocaleString() : ''}</span>
                {previewMedia.permalink && (
                  <a href={previewMedia.permalink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', fontWeight: 600 }}>
                    Open Original <i className="fa-solid fa-external-link" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
